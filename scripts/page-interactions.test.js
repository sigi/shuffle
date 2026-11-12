// Page interaction coverage for the app's main workflow screens.
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { createPinia, setActivePinia } from "pinia"
import { mount, flushPromises } from "@vue/test-utils"
import { nextTick } from "vue"
import { useAppStore } from "../src/stores/app.js"
import BoardSelectionPage from "../src/pages/BoardSelectionPage.vue"
import CompletionPage from "../src/pages/CompletionPage.vue"
import CutterPage from "../src/pages/CutterPage.vue"
import DealerPage from "../src/pages/DealerPage.vue"
import HandoffPage from "../src/pages/HandoffPage.vue"
import HomePage from "../src/pages/HomePage.vue"
import LibraryPage from "../src/pages/LibraryPage.vue"

// Creates a Pinia store preloaded with test sessions and boards.
function createAppState() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = useAppStore()
  app.libraryStatus = "ready"
  app.dealLibrary = {
    schemaVersion: 1,
    sets: [
      { setId: "z-set", name: "Zulu Session", boards: [{ boardNumber: 1, owners: "0".repeat(52) }] },
      { setId: "a-set", name: "Alpha Session", boards: [
        { boardNumber: 1, owners: "0".repeat(52) },
        { boardNumber: 2, owners: "1".repeat(52) },
      ] },
    ],
  }
  return { app, pinia }
}

beforeEach(() => {
  localStorage.clear()
})

describe("page interactions", () => {
  it("offers both modes from Home", async () => {
    const navigation = vi.fn()
    const page = mount(HomePage, { props: { onNavigate: navigation } })
    const buttons = page.findAll("button")

    await buttons[0].trigger("click")
    await buttons[1].trigger("click")
    expect(navigation.mock.calls).toEqual([["random"], ["library"]])
    page.unmount()
  })

  it("sorts sessions, marks progress, and emits session selection", async () => {
    const { app, pinia } = createAppState()
    app.completedBoards["z-set"] = [1]
    const select = vi.fn()
    const page = mount(LibraryPage, { props: { onSelect: select }, global: { plugins: [pinia] } })
    const buttons = page.findAll("button")

    expect(page.text().indexOf("Alpha Session")).toBeLessThan(page.text().indexOf("Zulu Session"))
    expect(page.text()).toContain("In progress")
    await buttons[0].trigger("click")
    expect(select).toHaveBeenCalledWith({ setId: "a-set", boardCount: 2 })
    page.unmount()
  })

  it("restores board-grid scroll and emits board selection and back", async () => {
    const { app, pinia } = createAppState()
    app.boardScrollPositions["a-set"] = 180
    const select = vi.fn()
    const back = vi.fn()
    const page = mount(BoardSelectionPage, {
      props: { setId: "a-set", activeBoardNumber: null, completedBoardNumbers: [1], onSelect: select, onBack: back },
      global: { plugins: [pinia] },
    })
    await nextTick()
    const grid = page.find(".board-grid")
    expect(grid.element.scrollTop).toBe(180)
    const buttons = page.findAll("button")
    expect(buttons[0].classes()).toContain("completed")
    await buttons[1].trigger("click")
    await buttons.at(-1).trigger("click")
    expect(select).toHaveBeenCalledWith(2)
    expect(back).toHaveBeenCalledOnce()
    page.unmount()
  })

  it("displays ten and exposes cutter refresh and cut actions", async () => {
    const { pinia } = createAppState()
    const refresh = vi.fn()
    const confirm = vi.fn()
    const page = mount(CutterPage, {
      props: { sessionId: "a-set", boardNumber: 3, cuttingCard: "TC", onRefresh: refresh, onConfirm: confirm },
      global: { plugins: [pinia] },
    })
    expect(page.text()).toContain("Alpha Session · Board 3")
    expect(page.text()).toContain("!c10")
    const buttons = page.findAll("button")
    await buttons[0].trigger("click")
    await buttons[1].trigger("click")
    expect(refresh).toHaveBeenCalledOnce()
    expect(confirm).toHaveBeenCalledOnce()
    page.unmount()
  })

  it("emits handoff acknowledgement and return actions", async () => {
    const acknowledge = vi.fn()
    const back = vi.fn()
    const page = mount(HandoffPage, { props: { onAcknowledge: acknowledge, onBack: back } })
    const buttons = page.findAll("button")
    await buttons[0].trigger("click")
    await buttons[1].trigger("click")
    expect(acknowledge).toHaveBeenCalledOnce()
    expect(back).toHaveBeenCalledOnce()
    expect(page.text()).toContain("cut deck and phone")
    page.unmount()
  })

  it("emits completion confirmation and cancellation", async () => {
    const confirm = vi.fn()
    const cancel = vi.fn()
    const page = mount(CompletionPage, { props: { boardNumber: 7, onConfirm: confirm, onCancel: cancel } })
    const buttons = page.findAll("button")
    await buttons[0].trigger("click")
    await buttons[1].trigger("click")
    expect(confirm).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledOnce()
    page.unmount()
  })

  it("shows a recoverable dealer error when the selected board data is invalid", async () => {
    const { app, pinia } = createAppState()
    const session = app.dealLibrary.sets.find((set) => set.setId === "a-set")
    session.boards[0].owners = "invalid"
    const back = vi.fn()
    const page = mount(DealerPage, {
      props: { setId: "a-set", boardNumber: 1, cuttingCard: "2C", onBack: back },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    expect(page.text()).toContain("Deal unavailable")
    await page.findAll("button")[0].trigger("click")
    expect(back).toHaveBeenCalledOnce()
    page.unmount()
  })
})
