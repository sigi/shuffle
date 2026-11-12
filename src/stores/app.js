// Owns persisted navigation, active session identity, and bounded back history.
import { defineStore } from "pinia"

const STORAGE_KEY = "shuffle-app-state-v1"
const SCREENS = new Set(["home", "random", "library", "boards", "cutter", "handoff", "dealer", "complete"])
const HISTORY_LIMIT = 20

// Restores a valid navigation snapshot, falling back to Home on corrupt or obsolete data.
function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.version !== 1 || !SCREENS.has(saved.screen) || !Array.isArray(saved.history)) {
      return { screen: "home", history: [], activeSessionId: null, activeBoardNumber: null, activeSessionBoardCount: 0, cuttingCard: null, completedBoards: {}, boardScrollPositions: {} }
    }
    return {
      screen: saved.screen,
      history: saved.history.filter((screen) => SCREENS.has(screen)).slice(-HISTORY_LIMIT),
      activeSessionId: typeof saved.activeSessionId === "string" ? saved.activeSessionId : null,
      activeBoardNumber: Number.isInteger(saved.activeBoardNumber) ? saved.activeBoardNumber : null,
      activeSessionBoardCount: Number.isInteger(saved.activeSessionBoardCount) ? saved.activeSessionBoardCount : 0,
      cuttingCard: typeof saved.cuttingCard === "string" ? saved.cuttingCard : null,
      completedBoards: saved.completedBoards && typeof saved.completedBoards === "object" ? saved.completedBoards : {},
      boardScrollPositions: saved.boardScrollPositions && typeof saved.boardScrollPositions === "object" ? saved.boardScrollPositions : {},
    }
  } catch {
    return { screen: "home", history: [] }
  }
}

// Persists serializable navigation state whenever the store changes.
function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      screen: state.screen,
      history: state.history,
      activeSessionId: state.activeSessionId,
      activeBoardNumber: state.activeBoardNumber,
      activeSessionBoardCount: state.activeSessionBoardCount,
      cuttingCard: state.cuttingCard,
      completedBoards: state.completedBoards,
      boardScrollPositions: state.boardScrollPositions,
    }))
  } catch {
    // Storage can be unavailable in private browsing or when quota is exhausted.
  }
}

/** Pinia store for the current screen and app-managed back history. */
export const useAppStore = defineStore("app", {
  state: () => ({
    ...restoreState(),
    dealLibrary: null,
    libraryStatus: "loading",
  }),
  actions: {
    /** Loads the generated deal library once for the app's lifetime. */
    async loadDealLibrary() {
      if (this.libraryStatus !== "loading") return
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}deal-library.json`)
        if (!response.ok) throw new Error("Deal library unavailable")
        const library = await response.json()
        if (library.schemaVersion !== 1 || !Array.isArray(library.sets)) {
          throw new Error("Deal library has an unsupported format")
        }
        this.dealLibrary = library
        this.libraryStatus = "ready"
        this.recoverSavedState()
      } catch {
        this.dealLibrary = null
        this.libraryStatus = "error"
      }
    },
    /** Recovers persisted session, board, and completion references against current data. */
    recoverSavedState() {
      const sets = this.dealLibrary?.sets ?? []
      const validSets = new Map(sets.map((set) => [set.setId, set]))
      const validCompletions = {}

      for (const [setId, boardNumbers] of Object.entries(this.completedBoards ?? {})) {
        const set = validSets.get(setId)
        if (!set || !Array.isArray(boardNumbers)) continue
        const availableBoards = new Set(set.boards.map((board) => board.boardNumber))
        validCompletions[setId] = [...new Set(boardNumbers.filter((number) => availableBoards.has(number)))].sort((a, b) => a - b)
      }
      this.completedBoards = validCompletions

      if (!this.activeSessionId) {
        if (["boards", "cutter", "handoff", "dealer", "complete"].includes(this.screen)) {
          this.recoverToHome()
        }
        return
      }

      const session = validSets.get(this.activeSessionId)
      if (!session) {
        this.recoverToHome()
        return
      }

      this.activeSessionBoardCount = session.boards.length
      const hasBoard = session.boards.some((board) => board.boardNumber === this.activeBoardNumber)
      if (["cutter", "handoff", "dealer", "complete"].includes(this.screen) && !hasBoard) {
        this.screen = "boards"
        this.activeBoardNumber = null
        this.cuttingCard = null
        this.history = this.history.filter((screen) => !["cutter", "handoff", "dealer", "complete"].includes(screen))
      } else if (this.screen === "boards" && this.activeBoardNumber !== null && !hasBoard) {
        this.activeBoardNumber = null
      }
      persistState(this.$state)
    },
    /** Clears stale session workflow state and restores Home. */
    recoverToHome() {
      this.screen = "home"
      this.activeSessionId = null
      this.activeBoardNumber = null
      this.activeSessionBoardCount = 0
      this.cuttingCard = null
      this.history = this.history.filter((screen) => !["boards", "cutter", "handoff", "dealer", "complete"].includes(screen))
      persistState(this.$state)
    },
    /** Navigates to a screen while recording the prior screen, capped at 20 entries. */
    navigate(screen) {
      if (!SCREENS.has(screen) || screen === this.screen) return
      this.history.push(this.screen)
      this.history = this.history.slice(-HISTORY_LIMIT)
      this.screen = screen
      persistState(this.$state)
    },
    /** Selects a session and opens its board list. */
    selectSession({ setId, boardCount }) {
      this.activeSessionId = setId
      this.activeSessionBoardCount = boardCount
      this.activeBoardNumber = null
      this.navigate("boards")
      persistState(this.$state)
    },
    /** Selects a board and enters the cutter step. */
    selectBoard(boardNumber) {
      this.activeBoardNumber = boardNumber
      this.refreshCuttingCard()
      this.navigate("cutter")
      persistState(this.$state)
    },
    /** Saves the scroll position for a session's board grid. */
    setBoardScrollPosition(setId, scrollTop) {
      this.boardScrollPositions[setId] = Math.max(0, scrollTop)
      persistState(this.$state)
    },
    /** Selects a uniformly distributed card as the current cut target. */
    refreshCuttingCard() {
      const cardIndex = Math.floor(Math.random() * 52)
      const suits = ["C", "D", "H", "S"]
      const ranks = "23456789TJQKA"
      this.cuttingCard = `${ranks[Math.floor(cardIndex / 4)]}${suits[cardIndex % 4]}`
      persistState(this.$state)
    },
    /** Confirms the physical cut and advances to handoff. */
    confirmCut() {
      this.navigate("handoff")
    },
    /** Acknowledges the handoff and opens the dealer arrow display. */
    acknowledgeHandoff() {
      this.navigate("dealer")
    },
    /** Opens the completion confirmation for the active board. */
    beginCompletion() {
      this.navigate("complete")
    },
    /** Recovers from an unavailable dealer display to the active session's boards. */
    recoverDealerError() {
      this.navigate("boards")
    },
    /** Marks the active board complete and returns to selection with the next board active. */
    completeBoard() {
      const completed = this.completedBoards[this.activeSessionId] ?? []
      if (!completed.includes(this.activeBoardNumber)) {
        this.completedBoards[this.activeSessionId] = [...completed, this.activeBoardNumber].sort((a, b) => a - b)
      }
      const nextBoard = this.activeBoardNumber + 1
      this.history = []
      this.screen = "boards"
      this.activeBoardNumber = nextBoard <= this.activeSessionBoardCount ? nextBoard : null
      persistState(this.$state)
    },
    /** Restores the most recently visited screen when history is available. */
    goBack() {
      const previous = this.history.pop()
      if (previous) this.screen = previous
      persistState(this.$state)
    },
  },
})
