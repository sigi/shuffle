import { readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import slug from "slug"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = resolve(root, "deal-sets")
const outputPath = resolve(root, "public/deal-library.json")
const cardRanks = "23456789TJQKA"
const pbnRanks = "AKQJT98765432"
const suits = ["S", "H", "D", "C"]
const directions = ["N", "E", "S", "W"]
const ownerCode = { N: 0, E: 1, S: 2, W: 3 }
const vulnerabilities = [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2]

function fail(file, message) {
  throw new Error(`${file}: ${message}`)
}

function stripComments(line, state) {
  let result = ""
  let quoted = false
  let escaped = false

  for (const char of line) {
    if (state.inBraceComment) {
      if (char === "}") state.inBraceComment = false
      continue
    }
    if (escaped) {
      result += char
      escaped = false
      continue
    }
    if (char === "\\" && quoted) {
      result += char
      escaped = true
      continue
    }
    if (char === '"') quoted = !quoted
    if (!quoted && char === "{") {
      state.inBraceComment = true
      continue
    }
    if (!quoted && char === ";") break
    result += char
  }

  return result
}

function decodePbnString(value, file, lineNumber, tag) {
  let decoded = ""
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== "\\") {
      decoded += value[i]
      continue
    }
    i += 1
    if (i >= value.length || !["\\", '"'].includes(value[i])) {
      fail(file, `line ${lineNumber}: invalid escape in ${tag} tag`)
    }
    decoded += value[i]
  }
  return decoded
}

function readTag(line, file, lineNumber) {
  const candidate = line.match(/^\s*\[(Event|Board|Deal)\b/i)
  if (!candidate) return null

  const match = line.match(/^\s*\[([A-Za-z][A-Za-z0-9_]*)\s+"((?:\\.|[^"\\])*)"\s*\]\s*$/)
  if (!match) fail(file, `line ${lineNumber}: malformed tag pair`)

  const tag = match[1]
  if (!["Event", "Board", "Deal"].includes(tag)) return null
  return { tag, value: decodePbnString(match[2], file, lineNumber, tag) }
}

function readGroups(text, file) {
  const groups = []
  let group = []
  let lineNumber = 0
  const commentState = { inBraceComment: false }

  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    lineNumber += 1
    if (rawLine.startsWith("%") && !commentState.inBraceComment) continue
    const line = stripComments(rawLine, commentState)
    if (!line.trim()) {
      if (!commentState.inBraceComment) {
        if (group.length) groups.push(group)
        group = []
      }
      continue
    }
    const tag = readTag(line, file, lineNumber)
    if (tag) group.push({ ...tag, lineNumber })
  }

  if (commentState.inBraceComment) fail(file, "unterminated brace comment")
  if (group.length) groups.push(group)
  return groups
}

function parseBoard(value, file, lineNumber) {
  if (!/^\d+$/.test(value)) fail(file, `line ${lineNumber}: Board must be an integer`)
  const boardNumber = Number(value)
  if (!Number.isSafeInteger(boardNumber) || boardNumber < 1 || boardNumber > 64) {
    fail(file, `line ${lineNumber}: Board must be in the range 1..64`)
  }
  return boardNumber
}

function parseDeal(value, file, lineNumber) {
  const separator = value.indexOf(":")
  if (separator !== 1)
    fail(file, `line ${lineNumber}: Deal must start with a compass direction and colon`)
  const firstDirection = value[0]
  if (!directions.includes(firstDirection))
    fail(file, `line ${lineNumber}: invalid Deal starting direction`)
  const hands = value.slice(2).trim().split(/\s+/)
  if (hands.length !== 4 || hands.some((hand) => !hand)) {
    fail(file, `line ${lineNumber}: Deal must contain exactly four hands`)
  }

  const ownersByCard = new Map()
  const missing = []
  for (let handIndex = 0; handIndex < 4; handIndex += 1) {
    const direction = directions[(directions.indexOf(firstDirection) + handIndex) % 4]
    const hand = hands[handIndex]
    if (hand === "-") {
      missing.push(direction)
      continue
    }

    const handSuits = hand.split(".")
    if (handSuits.length !== 4)
      fail(file, `line ${lineNumber}: each hand must contain four suit fields`)
    let count = 0
    for (let suitIndex = 0; suitIndex < suits.length; suitIndex += 1) {
      const ranks = handSuits[suitIndex].toUpperCase()
      for (const rank of ranks) {
        if (!pbnRanks.includes(rank)) fail(file, `line ${lineNumber}: invalid rank ${rank}`)
        const card = `${suits[suitIndex]}${rank}`
        if (ownersByCard.has(card)) fail(file, `line ${lineNumber}: duplicate card ${card}`)
        ownersByCard.set(card, ownerCode[direction])
        count += 1
      }
    }
    if (count !== 13)
      fail(file, `line ${lineNumber}: ${direction} hand has ${count} cards, expected 13`)
  }

  if (missing.length > 1) fail(file, `line ${lineNumber}: at most one hand may be omitted`)
  const canonicalCards = []
  for (const suit of ["C", "D", "H", "S"]) {
    for (const rank of cardRanks) canonicalCards.push(`${suit}${rank}`)
  }

  if (missing.length === 1) {
    const missingCode = ownerCode[missing[0]]
    for (const card of canonicalCards) {
      if (!ownersByCard.has(card)) ownersByCard.set(card, missingCode)
    }
  }
  if (ownersByCard.size !== 52 || canonicalCards.some((card) => !ownersByCard.has(card))) {
    fail(file, `line ${lineNumber}: Deal does not contain all 52 unique cards`)
  }

  const owners = canonicalCards.map((card) => ownersByCard.get(card))
  for (const code of [0, 1, 2, 3]) {
    if (owners.filter((owner) => owner === code).length !== 13) {
      fail(file, `line ${lineNumber}: inferred Deal does not give each hand 13 cards`)
    }
  }
  return owners.join('')
}

function parseSet(text, file) {
  const groups = readGroups(text, file)
  let eventName
  let sawEvent = false
  const boards = []
  const boardNumbers = new Set()

  for (const group of groups) {
    const events = group.filter((tag) => tag.tag === "Event")
    if (events.length && !sawEvent) {
      eventName = events[0].value.trim()
      sawEvent = true
    }

    const boardTags = group.filter((tag) => tag.tag === "Board")
    const dealTags = group.filter((tag) => tag.tag === "Deal")
    if (!boardTags.length && !dealTags.length) continue
    if (boardTags.length !== 1 || dealTags.length !== 1) {
      fail(
        file,
        `line ${group[0].lineNumber}: each board group must contain exactly one Board and one Deal tag`,
      )
    }

    const boardNumber = parseBoard(boardTags[0].value, file, boardTags[0].lineNumber)
    if (boardNumbers.has(boardNumber))
      fail(file, `line ${boardTags[0].lineNumber}: duplicate Board ${boardNumber}`)
    boardNumbers.add(boardNumber)
    boards.push({
      boardNumber,
      dealer: (boardNumber - 1) % 4,
      vulnerability: vulnerabilities[(boardNumber - 1) % 16],
      owners: parseDeal(dealTags[0].value, file, dealTags[0].lineNumber),
    })
  }

  if (!sawEvent) fail(file, "no Event tag found")
  if (!eventName) fail(file, "Event name must not be empty")
  if (boards.length === 0) fail(file, "no Board/Deal groups found")
  boards.sort((a, b) => a.boardNumber - b.boardNumber)
  boards.forEach((board, index) => {
    if (board.boardNumber !== index + 1)
      fail(file, `boards must be contiguous starting at 1; expected ${index + 1}`)
  })

  const setId = slug(eventName)
  if (!setId) fail(file, "Event name produces an empty setId slug")
  return { setId, name: eventName, boards }
}

export async function buildDealLibrary() {
  const sourceFiles = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pbn"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"))

  let existing = { schemaVersion: 1, sets: [] }
  try {
    existing = JSON.parse(await readFile(outputPath, "utf8"))
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error(`Cannot read existing deal library: ${error.message}`)
  }
  if (existing.schemaVersion !== 1 || !Array.isArray(existing.sets)) {
    throw new Error("Existing deal library has an unsupported schema")
  }

  const setsById = new Map()
  for (const set of existing.sets) {
    if (!set || typeof set.setId !== "string")
      throw new Error("Existing deal library contains an invalid set")
    if (setsById.has(set.setId))
      throw new Error(`Existing deal library has duplicate setId ${set.setId}`)
    setsById.set(set.setId, set)
  }

  const sourceSetIds = new Set()
  for (const filename of sourceFiles) {
    const file = resolve(sourceDir, filename)
    const set = parseSet(await readFile(file, "utf8"), filename)
    if (sourceSetIds.has(set.setId))
      throw new Error(`${filename}: duplicate setId ${set.setId} from source files`)
    sourceSetIds.add(set.setId)
    setsById.set(set.setId, set)
  }

  const output = {
    schemaVersion: 1,
    sets: [...setsById.values()].sort((a, b) => a.setId.localeCompare(b.setId, "en")),
  }
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  return output
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildDealLibrary()
    .then((library) => console.log(`Generated ${library.sets.length} deal sets at ${outputPath}`))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
