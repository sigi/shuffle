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

  it("falls back to Home for invalid saved JSON and unsupported versions", () => {
    localStorage.setItem(STORAGE_KEY, "not-json")
    expect(useAppStore().screen).toBe("home")

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, screen: "dealer", history: [] }))
    setActivePinia(createPinia())
    expect(useAppStore().screen).toBe("home")
  })

  it("persists navigation, completion data, and scroll positions across store instances", () => {
    const app = useAppStore()
    app.selectSession({ setId: "instant-mp-1987", boardCount: 52 })
    app.completedBoards["instant-mp-1987"] = [1]
    app.setBoardScrollPosition("instant-mp-1987", 240)

    setActivePinia(createPinia())
    const restored = useAppStore()
    expect(restored.screen).toBe("boards")
    expect(restored.activeSessionId).toBe("instant-mp-1987")
    expect(restored.activeSessionBoardCount).toBe(52)
    expect(restored.completedBoards["instant-mp-1987"]).toEqual([1])
    expect(restored.boardScrollPositions["instant-mp-1987"]).toBe(240)
  })
})

describe("app navigation and deal workflow", () => {
  it("caps history at 20 entries and leaves the screen unchanged when history is empty", () => {
    const app = useAppStore()
    for (let index = 0; index < 24; index += 1) {
      app.navigate(app.screen === "home" ? "random" : "home")
    }
    expect(app.history).toHaveLength(20)
    const currentScreen = app.screen
    app.history = []
    app.goBack()
    expect(app.screen).toBe(currentScreen)
  })

  it("selects and refreshes cut cards at the random range boundaries", () => {
    const app = useAppStore()
    app.screen = "boards"
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.999999)

    app.selectBoard(1)
    expect(app.cuttingCard).toBe("2C")
    expect(app.screen).toBe("cutter")
    app.refreshCuttingCard()
    expect(app.cuttingCard).toBe("AS")
  })

  it("navigates through cut, handoff, dealer, and completion with back support", () => {
    const app = useAppStore()
    app.screen = "boards"
    app.activeSessionId = "instant-mp-1987"
    app.activeSessionBoardCount = 52
    app.selectBoard(4)
    app.confirmCut()
    app.acknowledgeHandoff()
    app.beginCompletion()
    expect(app.screen).toBe("complete")

    app.goBack()
    expect(app.screen).toBe("dealer")
    app.goBack()
    expect(app.screen).toBe("handoff")
    app.goBack()
    expect(app.screen).toBe("cutter")
  })

  it("marks a session touched, keeps replay completion, and selects the next board", () => {
    const app = useAppStore()
    app.activeSessionId = "instant-mp-1987"
    app.activeSessionBoardCount = 2
    app.activeBoardNumber = 1
    app.screen = "complete"

    app.completeBoard()
    expect(app.screen).toBe("boards")
    expect(app.activeBoardNumber).toBe(2)
    expect(app.completedBoards["instant-mp-1987"]).toEqual([1])

    app.activeBoardNumber = 1
    app.screen = "complete"
    app.completeBoard()
    expect(app.completedBoards["instant-mp-1987"]).toEqual([1])
    expect(app.activeBoardNumber).toBe(2)
  })

  it("does not wrap after completing the final board", () => {
    const app = useAppStore()
    app.activeSessionId = "instant-mp-1987"
    app.activeSessionBoardCount = 2
    app.activeBoardNumber = 2
    app.screen = "complete"

    app.completeBoard()
    expect(app.screen).toBe("boards")
    expect(app.activeBoardNumber).toBeNull()
    expect(app.completedBoards["instant-mp-1987"]).toEqual([2])
  })

  it("stores board scroll positions independently by session", () => {
    const app = useAppStore()
    app.setBoardScrollPosition("set-a", 100)
    app.setBoardScrollPosition("set-b", 250)
    expect(app.boardScrollPositions).toEqual({ "set-a": 100, "set-b": 250 })
  })
})

describe("deal library initialization", () => {
  it("loads the library once and stores it in Pinia", async () => {
    const library = JSON.parse(await readFile("scripts/fixtures/deal-library.json", "utf8"))
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => library })
    const app = useAppStore()

    await app.loadDealLibrary()
    await app.loadDealLibrary()

    expect(app.libraryStatus).toBe("ready")
    expect(app.dealLibrary).toEqual(library)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["http failure", { ok: false }],
    ["unsupported schema", { ok: true, json: async () => ({ schemaVersion: 2, sets: [] }) }],
  ])("sets the library error state after %s", async (_label, response) => {
    globalThis.fetch = vi.fn().mockResolvedValue(response)
    const app = useAppStore()
    await app.loadDealLibrary()
    expect(app.libraryStatus).toBe("error")
    expect(app.dealLibrary).toBeNull()
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
