import { readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import slug from "slug"
import peggy from "peggy"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = resolve(root, "deal-sets")
const outputPath = resolve(root, "public/deal-library.json")
const grammarPath = resolve(root, "scripts/pbn.peggy")
const cardRanks = "23456789TJQKA"
const suits = ["S", "H", "D", "C"]
const canonicalSuitIndex = { C: 0, D: 1, H: 2, S: 3 }
const directions = ["N", "E", "S", "W"]
const vulnerabilities = [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2]

function fail(file, message) {
  throw new Error(`${file}: ${message}`)
}

function parseDeal(deal, file) {
  const owners = Array(52).fill(-1)
  const firstPosition = directions.indexOf(deal.direction)
  const hands = deal.hands.filter(Boolean)
  if (hands.length < 3) fail(file, `Deal has ${hands.length} hands, expected at least 3`)
  const missingPosition = hands.length === 3 ? (firstPosition + 3) % 4 : -1

  hands.forEach((hand, handIndex) => {
    const position = (firstPosition + handIndex) % 4
    const suitFields = hand.split(".")
    let cardCount = 0
    for (let suitIndex = 0; suitIndex < suits.length; suitIndex += 1) {
      const suit = suits[suitIndex]
      for (const rank of suitFields[suitIndex]) {
        const rankIndex = cardRanks.indexOf(rank)
        const cardIndex = canonicalSuitIndex[suit] * 13 + rankIndex
        if (owners[cardIndex] !== -1) fail(file, `duplicate card ${suit}${rank}`)
        owners[cardIndex] = position
        cardCount += 1
      }
    }
    if (cardCount !== 13) {
      fail(file, `${directions[position]} hand has ${cardCount} cards, expected 13`)
    }
  })

  return owners.map((owner) => owner === -1 ? missingPosition : owner).join("")
}

let parserPromise

async function parseSet(text, file) {
  parserPromise ??= readFile(grammarPath, "utf8").then((grammar) => peggy.generate(grammar))
  const parser = await parserPromise
  let parsed
  try {
    parsed = parser.parse(text)
  } catch (error) {
    fail(file, `line ${error.location?.start?.line ?? "?"}: ${error.message}`)
  }
  const boards = []
  const boardNumbers = new Set()

  for (const section of parsed.deals) {
    const boardNumber = section.board
    if (boardNumbers.has(boardNumber)) fail(file, `duplicate Board ${boardNumber}`)
    boardNumbers.add(boardNumber)
    boards.push({
      boardNumber,
      dealer: (boardNumber - 1) % 4,
      vulnerability: vulnerabilities[(boardNumber - 1) % 16],
      owners: parseDeal(section.deal, file),
    })
  }
  boards.sort((a, b) => a.boardNumber - b.boardNumber)
  boards.forEach((board, index) => {
    if (board.boardNumber !== index + 1)
      fail(file, `boards must be contiguous starting at 1; expected ${index + 1}`)
  })

  const eventName = parsed.event
  if (!eventName) fail(file, "no Event tag found or Event name is empty")
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
    const set = await parseSet(await readFile(file, "utf8"), filename)
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
