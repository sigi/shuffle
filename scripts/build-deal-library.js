import { readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import slug from "slug"
import peggy from "peggy"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = resolve(root, "deal-sets")
const outputPath = resolve(root, "public/deal-library.json")
const grammarPath = resolve(root, "scripts/pbn.peggy")

// Adds source context to generator errors.
function fail(file, message) {
  throw new Error(`${file}: ${message}`)
}

// Validates normalized hands and encodes each canonical card's compass owner.
function ownersForDeal(hands, file) {
  const owners = Array(52).fill(-1)
  hands.forEach((hand, position) => {
    if (hand.length === 0) return
    let cardCount = 0
    hand.forEach((suit, suitIndex) => {
      for (const card of suit) {
        const cardIndex = suitIndex * 13 + card
        if (owners[cardIndex] !== -1) {
          fail(file, `duplicate card ${"CDHS"[suitIndex]}${card}`)
        }
        owners[cardIndex] = position
        cardCount += 1
      }
    })
    if (cardCount !== 13) {
      fail(file, `${"NESW"[position]} hand has ${cardCount} cards, expected 13`)
    }
  })

  const missingPosition = hands.findIndex((hand) => hand.length === 0)
  return owners.map((owner) => owner === -1 ? missingPosition : owner).join("")
}

let parserPromise

// Runs the Peggy grammar, validates set-level constraints, and builds one JSON set.
export async function parseSet(text, file = "<input>", grammarFile = grammarPath) {
  parserPromise ??= readFile(grammarFile, "utf8").then((grammar) => peggy.generate(grammar))
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
      dealer: "NESW"[(boardNumber - 1) % 4],
      vulnerability: "ONEBNEBOEBONBONE"[(boardNumber - 1) % 16],
      owners: ownersForDeal(section.deal, file),
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

// Merges parsed source sets into the existing generated deal-library file.
export async function buildDealLibrary({ sourceDir: inputDir = sourceDir, outputPath: targetPath = outputPath, grammarPath: inputGrammar = grammarPath } = {}) {
  const sourceFiles = (await readdir(inputDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pbn"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"))

  let existing = { schemaVersion: 1, sets: [] }
  try {
    existing = JSON.parse(await readFile(targetPath, "utf8"))
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
    const file = resolve(inputDir, filename)
    const set = await parseSet(await readFile(file, "utf8"), filename, inputGrammar)
    if (sourceSetIds.has(set.setId))
      throw new Error(`${filename}: duplicate setId ${set.setId} from source files`)
    sourceSetIds.add(set.setId)
    setsById.set(set.setId, set)
  }

  const output = {
    schemaVersion: 1,
    sets: [...setsById.values()].sort((a, b) => a.setId.localeCompare(b.setId, "en")),
  }
  await writeFile(targetPath, `${JSON.stringify(output, null, 2)}\n`)
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
