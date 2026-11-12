<!-- Scrollable board grid for the selected session. -->
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useAppStore } from "../stores/app"

const props = defineProps({
  setId: { type: String, default: "" },
  activeBoardNumber: { type: Number, default: null },
  completedBoardNumbers: { type: Array, default: () => [] },
})
const emit = defineEmits(["back", "select"])
const app = useAppStore()
const session = computed(() => app.dealLibrary?.sets?.find((set) => set.setId === props.setId) ?? null)
const boards = computed(() => [...(session.value?.boards ?? [])].sort((a, b) => a.boardNumber - b.boardNumber))
const boardGrid = ref(null)
let scrollSaveTimer

// Opens the cutter workflow for the selected board.
function selectBoard(boardNumber) {
  emit("select", boardNumber)
}

// Returns to session selection through app-managed history.
function goBack() {
  emit("back")
}

// Debounces persistence while the user scrolls the board grid.
function saveScrollPosition(event) {
  clearTimeout(scrollSaveTimer)
  const scrollTop = event.currentTarget.scrollTop
  scrollSaveTimer = setTimeout(() => app.setBoardScrollPosition(props.setId, scrollTop), 120)
}

// Restores the previously saved scroll position when the board grid appears.
async function restoreScrollPosition() {
  await nextTick()
  if (boardGrid.value) {
    boardGrid.value.scrollTop = app.boardScrollPositions[props.setId] ?? 0
  }
}

// Flushes the last scroll position when leaving the screen.
function flushScrollPosition() {
  clearTimeout(scrollSaveTimer)
  if (boardGrid.value) app.setBoardScrollPosition(props.setId, boardGrid.value.scrollTop)
}

onMounted(restoreScrollPosition)
onUnmounted(flushScrollPosition)
watch(() => [app.libraryStatus, boards.value.length], restoreScrollPosition)

</script>

<template>
  <section class="board-screen" aria-label="Board selection">
    <h1>{{ session?.name ?? "Select a board" }}</h1>
    <p v-if="app.libraryStatus === 'loading'">Loading boards…</p>
    <p v-else-if="app.libraryStatus === 'error' || !session" role="alert">Could not load the session.</p>
    <div v-else ref="boardGrid" class="board-grid" @scroll.passive="saveScrollPosition">
      <button
        v-for="board in boards"
        :key="board.boardNumber"
        class="board-button"
        :class="{
          active: board.boardNumber === activeBoardNumber,
          completed: completedBoardNumbers.includes(board.boardNumber),
        }"
        :aria-label="`Board ${board.boardNumber}`"
        :aria-current="board.boardNumber === activeBoardNumber ? 'true' : undefined"
        @click="selectBoard(board.boardNumber)"
      >
        {{ board.boardNumber }}
      </button>
    </div>
    <button class="menu-button screen-back-button" @click="goBack">‹ Sessions</button>
  </section>
</template>
