import { describe, expect, it } from "vite-plus/test"
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { buildDealLibrary, parseSet } from "./build-deal-library.js"

/*
 * Coverage includes PBN structure/syntax, hand normalization and reconstruction,
 * duplicate-bridge metadata, and deal-library merging and failures. The fixture
 * library and reference board are checked-in snapshots of hand-validated output;
 * expected owners are not computed by the code under test.
 */
const fixtureDir = resolve("scripts/fixtures")
const grammarPath = resolve("scripts/pbn.peggy")
const referenceOwners = "0111310310231322012112222202021330301032003023133301"
const referenceHands = [
  "QJT85.AT87.2.K96",
  "K643.KJ942.5.J82",
  "A9.Q6.986.AT7543",
  "72.53.AKQJT743.Q",
]
const referenceDeal = `W:${referenceHands.join(" ")}`

// Creates isolated source and output paths so build tests never touch public data.
async function withBuildPaths(sourceFiles, run, { seedLibrary = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), "shuffle-deals-"))
  const sourceDir = join(root, "sources")
  const outputDir = join(root, "out")
  const outputPath = join(outputDir, "library.json")
  await mkdir(sourceDir)
  await mkdir(outputDir)
  try {
    for (const filename of sourceFiles) {
      await copyFile(join(fixtureDir, "deal-sets", filename), join(sourceDir, filename))
    }
    if (seedLibrary) {
      await copyFile(join(fixtureDir, "deal-library.json"), outputPath)
    }
    return await run({ sourceDir, outputPath })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

// Produces a compact one-board PBN input for direction and omission cases.
function referenceWithDeal(direction, hands) {
  return `[Event "Instant MP 1987"]\n[Board "1"]\n[Deal "${direction}:${hands.join(" ")}"]`
}

// Builds a multi-section PBN input for metadata and section-boundary checks.
function setText(sections, event = "Instant MP 1987") {
  return `[Event "${event}"]\n${sections.join("\n\n")}`
}

// Parses a named immutable PBN fixture using the project grammar.
async function parseFixture(name) {
  const input = await readFile(join(fixtureDir, name), "utf8")
  return parseSet(input, name, grammarPath)
}

describe("deal library generator", () => {
  it("parses reference board 1 to its expected normalized data", async () => {
    const parsed = await parseFixture("reference-board-1.pbn")
    expect(parsed).toEqual({
      setId: "instant-mp-1987",
      name: "Instant MP 1987",
      boards: [{
        boardNumber: 1,
        dealer: "N",
        vulnerability: "O",
        owners: referenceOwners,
      }],
    })
  })

  it.each([
    ["missing-event.pbn", /Expected.*Event/],
    ["board-out-of-range.pbn", /range 1\.\.64/],
    ["duplicate-cards.pbn", /duplicate card/],
  ])("rejects invalid fixture %s", async (fixture, error) => {
    await expect(parseFixture(fixture)).rejects.toThrow(error)
  })

  it.each([
    ["Event must be first", `[Board "1"]\n[Event "X"]\n[Deal "${referenceDeal}"]`],
    ["Deal must follow Board", `[Event "X"]\n[Deal "${referenceDeal}"]\n[Board "1"]`],
    ["Board cannot repeat", `[Event "X"]\n[Board "1"]\n[Board "1"]\n[Deal "${referenceDeal}"]`],
    ["Deal cannot be missing", `[Event "X"]\n[Board "1"]`],
    ["Board cannot be missing", `[Event "X"]\n[Deal "${referenceDeal}"]`],
    ["Event cannot occur later", `[Event "X"]\n[Board "1"]\n[Deal "${referenceDeal}"]\n[Event "Later"]`],
    ["every section needs Board and Deal", `[Event "X"]\n[Board "1"]\n[Deal "${referenceDeal}"]\n\n[Board "2"]`],
  ])("rejects invalid tag structure: %s", async (_description, input) => {
    await expect(parseSet(input, "invalid-structure.pbn", grammarPath)).rejects.toThrow()
  })

  it("ignores unrelated tags, comments, and free text while separating sections at blank lines", async () => {
    const input = [
      `% file comment`,
      `[Event "Instant MP 1987"]`,
      `ignored text`,
      `[Board "1"]`,
      `[Dealer "N"]`,
      `[Deal "${referenceDeal}"]`,
      `; inline section comment`,
      "",
      `[Board "2"]`,
      `[Deal "${referenceDeal}"]`,
    ].join("\n")
    const parsed = await parseSet(input, "ignored-content.pbn", grammarPath)
    expect(parsed.boards.map(({ boardNumber }) => boardNumber)).toEqual([1, 2])
  })

  it.each([
    [`X:${referenceHands.join(" ")}`, /Expected.*[NESW]/],
    [`W:${referenceHands.join(" ").replace("QJT85", "XJT85")}`, /Expected/],
    [`W:${referenceHands.join(" ").replace("QJT85", "QJT85..")}`, /Expected/],
    [`W:${referenceHands.slice(0, 3).join(" ")}`, /Expected/],
  ])("rejects malformed Deal syntax %s", async (deal, error) => {
    await expect(parseSet(`[Event "X"]\n[Board "1"]\n[Deal "${deal}"]`, "bad-deal.pbn", grammarPath))
      .rejects.toThrow(error)
  })

  it("accepts lowercase ranks and normalizes them to canonical card indexes", async () => {
    const lower = referenceDeal.toLowerCase()
    const parsed = await parseSet(
      `[Event "Instant MP 1987"]\n[Board "1"]\n[Deal "${lower}"]`,
      "lowercase.pbn",
      grammarPath,
    )
    expect(parsed.boards[0].owners).toBe(referenceOwners)
  })

  it("uses the duplicate-bridge dealer and vulnerability cycles at boundaries", async () => {
    const sections = Array.from({ length: 17 }, (_, index) =>
      `[Board "${index + 1}"]\n[Deal "${referenceDeal}"]`)
    const parsed = await parseSet(setText(sections), "cycles.pbn", grammarPath)
    const board = (number) => parsed.boards[number - 1]
    expect([board(1).dealer, board(4).dealer, board(5).dealer, board(16).dealer, board(17).dealer])
      .toEqual(["N", "W", "N", "W", "N"])
    expect([board(1).vulnerability, board(16).vulnerability, board(17).vulnerability])
      .toEqual(["O", "E", "O"])
  })

  it.each([0, 1, 2, 3])("reconstructs omitted hand %i", async (missingIndex) => {
    const hands = [...referenceHands]
    hands[missingIndex] = "-"
    const parsed = await parseSet(referenceWithDeal("W", hands), "missing-hand.pbn", grammarPath)
    expect(parsed.boards[0].owners).toBe(referenceOwners)
  })

  it("rejects two omitted hands", async () => {
    const hands = [...referenceHands]
    hands[0] = "-"
    hands[1] = "-"
    await expect(parseSet(referenceWithDeal("W", hands), "two-missing.pbn", grammarPath))
      .rejects.toThrow(/at least three hands/)
  })

  it.each([
    ["N", [1, 2, 3, 0]],
    ["E", [2, 3, 0, 1]],
    ["S", [3, 0, 1, 2]],
  ])("normalizes a deal starting with %s", async (direction, order) => {
    const hands = order.map((index) => referenceHands[index])
    const parsed = await parseSet(referenceWithDeal(direction, hands), "rotated-deal.pbn", grammarPath)
    expect(parsed.boards[0].owners).toBe(referenceOwners)
  })

  it("matches the reference library after adding the second set", async () => {
    await withBuildPaths(["1987.pbn"], async ({ sourceDir, outputPath }) => {
      const first = await buildDealLibrary({ sourceDir, outputPath })
      expect(first.sets.map((set) => set.setId)).toEqual(["instant-mp-1987"])

      await copyFile(join(fixtureDir, "deal-sets/1988.pbn"), join(sourceDir, "1988.pbn"))
      await buildDealLibrary({ sourceDir, outputPath })
      expect(await readFile(outputPath, "utf8"))
        .toBe(await readFile(join(fixtureDir, "deal-library.json"), "utf8"))
    })
  })

  it("leaves the reference library unchanged when re-adding an existing set", async () => {
    await withBuildPaths(["1987.pbn"], async ({ sourceDir, outputPath }) => {
      const expected = await readFile(join(fixtureDir, "deal-library.json"), "utf8")
      await buildDealLibrary({ sourceDir, outputPath })
      expect(await readFile(outputPath, "utf8")).toBe(expected)
    }, { seedLibrary: true })
  })

  it("preserves unrelated sets when replacing one set", async () => {
    await withBuildPaths(["1987.pbn"], async ({ sourceDir, outputPath }) => {
      await buildDealLibrary({ sourceDir, outputPath })
      const existing = JSON.parse(await readFile(outputPath, "utf8"))
      existing.sets.push({ setId: "unrelated", name: "Unrelated", boards: [] })
      await writeFile(outputPath, JSON.stringify(existing))
      await buildDealLibrary({ sourceDir, outputPath })
      const updated = JSON.parse(await readFile(outputPath, "utf8"))
      expect(updated.sets.map(({ setId }) => setId)).toEqual(["instant-mp-1987", "unrelated"])
    })
  })

  it("rejects duplicate source slugs", async () => {
    await withBuildPaths(["1987.pbn"], async ({ sourceDir, outputPath }) => {
      await copyFile(join(sourceDir, "1987.pbn"), join(sourceDir, "duplicate.pbn"))
      await expect(buildDealLibrary({ sourceDir, outputPath })).rejects.toThrow(/duplicate setId/)
    })
  })

  it.each([
    ["not-json", /Cannot read existing deal library/],
    [JSON.stringify({ schemaVersion: 2, sets: [] }), /unsupported schema/],
  ])("rejects malformed existing library data", async (content, error) => {
    await withBuildPaths([], async ({ sourceDir, outputPath }) => {
      await writeFile(outputPath, content)
      await expect(buildDealLibrary({ sourceDir, outputPath })).rejects.toThrow(error)
    })
  })

  it.each(["1987.pbn", "1988.pbn"])("is idempotent when run repeatedly with %s", async (filename) => {
    await withBuildPaths([filename], async ({ sourceDir, outputPath }) => {
      await buildDealLibrary({ sourceDir, outputPath })
      const firstOutput = await readFile(outputPath, "utf8")
      await buildDealLibrary({ sourceDir, outputPath })
      expect(await readFile(outputPath, "utf8")).toBe(firstOutput)
    })
  })
})
