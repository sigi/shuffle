// Integration coverage for persisted app recovery against the bundled library.
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { createPinia, setActivePinia } from "pinia"
import { readFile } from "node:fs/promises"
import { useAppStore } from "../src/stores/app.js"
import { createDealArrows } from "../src/lib/deal-arrows.js"

const STORAGE_KEY = "shuffle-app-state-v1"

// Provides a deterministic localStorage implementation for store hydration tests.
function createStorage() {
  const values = new Map()
  return {
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
    clear() { values.clear() },
  }
}

let previousStorage
let previousFetch

beforeEach(() => {
  previousStorage = globalThis.localStorage
  previousFetch = globalThis.fetch
  globalThis.localStorage = createStorage()
  setActivePinia(createPinia())
})

afterEach(() => {
  globalThis.localStorage = previousStorage
  globalThis.fetch = previousFetch
  vi.restoreAllMocks()
})

describe("persisted app state recovery", () => {
  it("recovers to board selection when the saved board was removed", async () => {
    const library = JSON.parse(await readFile("scripts/fixtures/deal-library.json", "utf8"))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      screen: "dealer",
      history: ["home", "library", "boards", "cutter", "handoff"],
      activeSessionId: "instant-mp-1987",
      activeBoardNumber: 99,
      activeSessionBoardCount: 52,
      cuttingCard: "2C",
      completedBoards: { "instant-mp-1987": [1, 99], removed: [1] },
      boardScrollPositions: { "instant-mp-1987": 120 },
    }))
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => library })

    const app = useAppStore()
    await app.loadDealLibrary()

    expect(app.screen).toBe("boards")
    expect(app.activeSessionId).toBe("instant-mp-1987")
    expect(app.activeBoardNumber).toBeNull()
    expect(app.completedBoards).toEqual({ "instant-mp-1987": [1] })
    expect(app.history).not.toContain("dealer")
  })

  it("recovers to Home when the saved session was removed", async () => {
    const library = JSON.parse(await readFile("scripts/fixtures/deal-library.json", "utf8"))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      screen: "cutter",
      history: ["home", "library", "boards"],
      activeSessionId: "removed-session",
      activeBoardNumber: 1,
      activeSessionBoardCount: 1,
      cuttingCard: "2C",
      completedBoards: {},
    }))
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => library })

    const app = useAppStore()
    await app.loadDealLibrary()

    expect(app.screen).toBe("home")
    expect(app.activeSessionId).toBeNull()
    expect(app.activeBoardNumber).toBeNull()
  })
})

describe("dealer error recovery", () => {
  it("rejects invalid arrow data and provides a route back to boards", () => {
    const app = useAppStore()
    app.screen = "dealer"
    app.activeSessionId = "instant-mp-1987"
    app.activeBoardNumber = 1

    expect(() => createDealArrows("invalid", "2C")).toThrow(/Invalid deal owners/)
    app.recoverDealerError()

    expect(app.screen).toBe("boards")
    expect(app.activeSessionId).toBe("instant-mp-1987")
  })
})
