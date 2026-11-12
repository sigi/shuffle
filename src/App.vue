<!-- Full-screen app shell with native-back and first-tap fullscreen behavior. -->
<script setup>
import { onMounted, onUnmounted, ref } from "vue"
import screenfull from "screenfull"
import { useAppStore } from "./stores/app"
import BoardSelectionPage from "./pages/BoardSelectionPage.vue"
import CutterPage from "./pages/CutterPage.vue"
import CompletionPage from "./pages/CompletionPage.vue"
import DealerPage from "./pages/DealerPage.vue"
import HandoffPage from "./pages/HandoffPage.vue"
import HomePage from "./pages/HomePage.vue"
import LibraryPage from "./pages/LibraryPage.vue"
import RandomPage from "./pages/RandomPage.vue"

const app = useAppStore()
const firstTap = ref(true)
let backSwipeStart = null
let suppressClick = false
let suppressClickTimer

// Requests fullscreen on the first gesture and deliberately discards that gesture.
function handleFirstTap(event) {
  if (!firstTap.value) return
  firstTap.value = false
  if (screenfull.isEnabled) void screenfull.request().catch(() => {})
  event.stopPropagation()
  event.preventDefault()
}

// Records pointer coordinates for the global upward history gesture.
function startBackSwipe(event) {
  if (event.target.closest(".session-list, .board-grid")) return
  backSwipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
}

// Performs app back navigation for a clear upward swipe outside scrollable lists.
function finishBackSwipe(event) {
  if (!backSwipeStart || backSwipeStart.pointerId !== event.pointerId) return
  const deltaX = Math.abs(event.clientX - backSwipeStart.x)
  const deltaY = event.clientY - backSwipeStart.y
  backSwipeStart = null
  if (deltaY <= -80 && Math.abs(deltaY) > deltaX * 1.25 && app.history.length) {
    suppressClick = true
    clearTimeout(suppressClickTimer)
    suppressClickTimer = setTimeout(() => {
      suppressClick = false
    }, 0)
    app.goBack()
  }
}

// Discards the synthetic click generated after a recognized swipe.
function discardSwipeClick(event) {
  if (!suppressClick) return
  suppressClick = false
  clearTimeout(suppressClickTimer)
  event.preventDefault()
  event.stopPropagation()
}

// Applies first-tap fullscreen handling before suppressing swipe-generated clicks.
function handleCapturedClick(event) {
  handleFirstTap(event)
  discardSwipeClick(event)
}

// Keeps browser history on this SPA URL while translating back into app state.
function handlePopState() {
  // Re-arm first so mobile browsers keep delivering subsequent back gestures.
  window.history.pushState({ shuffle: true }, "", window.location.href)
  if (app.history.length) app.goBack()
}

// Installs a same-URL history sentinel so native browser back reaches app state.
onMounted(() => {
  window.history.pushState({ shuffle: true }, "", window.location.href)
  window.addEventListener("popstate", handlePopState)
})

// Removes the native-back listener when the root view is unmounted.
onUnmounted(() => window.removeEventListener("popstate", handlePopState))
</script>

<template>
  <main
    class="app-screen"
    @click.capture="handleCapturedClick"
    @pointerdown.capture="startBackSwipe"
    @pointerup.capture="finishBackSwipe"
    @pointercancel.capture="backSwipeStart = null"
  >
    <HomePage v-if="app.screen === 'home'" @navigate="app.navigate" />
    <RandomPage v-else-if="app.screen === 'random'" />
    <LibraryPage v-else-if="app.screen === 'library'" @back="app.navigate('home')" @select="app.selectSession" />
    <BoardSelectionPage
      v-else-if="app.screen === 'boards'"
      :set-id="app.activeSessionId"
      :active-board-number="app.activeBoardNumber"
      :completed-board-numbers="app.completedBoards[app.activeSessionId] ?? []"
      @back="app.navigate('library')"
      @select="app.selectBoard"
    />
    <CutterPage
      v-else-if="app.screen === 'cutter'"
      :session-id="app.activeSessionId"
      :board-number="app.activeBoardNumber"
      :cutting-card="app.cuttingCard"
      @refresh="app.refreshCuttingCard"
      @confirm="app.confirmCut"
    />
    <HandoffPage
      v-else-if="app.screen === 'handoff'"
      @acknowledge="app.acknowledgeHandoff"
      @back="app.goBack"
    />
    <CompletionPage
      v-else-if="app.screen === 'complete'"
      :board-number="app.activeBoardNumber"
      @confirm="app.completeBoard"
      @cancel="app.goBack"
    />
    <DealerPage
      v-else
      :set-id="app.activeSessionId"
      :board-number="app.activeBoardNumber"
      :cutting-card="app.cuttingCard"
      @complete="app.beginCompletion"
    />
  </main>
</template>
