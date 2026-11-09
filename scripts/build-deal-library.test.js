import { describe, expect, it } from "vite-plus/test"
import { copyFile, mkdtemp, mkdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { buildDealLibrary, parseSet } from "./build-deal-library.js"

const fixtureDir = resolve("scripts/fixtures")
const grammarPath = resolve("scripts/pbn.peggy")
const referenceOwners = "0111310310231322012112222202021330301032003023133301"
const referenceHands = [
  "QJT85.AT87.2.K96",
  "K643.KJ942.5.J82",
  "A9.Q6.986.AT7543",
  "72.53.AKQJT743.Q",
]

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

function referenceWithDeal(direction, hands) {
  return `[Event "Instant MP 1987"]\n[Board "1"]\n[Deal "${direction}:${hands.join(" ")}"]`
}

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

  it.each(["1987.pbn", "1988.pbn"])("is idempotent when run repeatedly with %s", async (filename) => {
    await withBuildPaths([filename], async ({ sourceDir, outputPath }) => {
      await buildDealLibrary({ sourceDir, outputPath })
      const firstOutput = await readFile(outputPath, "utf8")
      await buildDealLibrary({ sourceDir, outputPath })
      expect(await readFile(outputPath, "utf8")).toBe(firstOutput)
    })
  })
})
