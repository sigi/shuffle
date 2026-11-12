<!-- Scrollable board grid for the selected session. -->
<script setup>
import { onMounted, ref } from "vue"

const props = defineProps({
  setId: { type: String, default: "" },
  activeBoardNumber: { type: Number, default: null },
  completedBoardNumbers: { type: Array, default: () => [] },
})
const emit = defineEmits(["back", "select"])
const session = ref(null)
const loading = ref(true)
const error = ref("")

// Loads the selected session's board list from the generated library.
async function loadSession() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}deal-library.json`)
    if (!response.ok) throw new Error("Deal library unavailable")
    const library = await response.json()
    session.value = library.sets?.find((set) => set.setId === props.setId) ?? null
    if (!session.value) error.value = "This session is no longer available."
    else session.value.boards.sort((a, b) => a.boardNumber - b.boardNumber)
  } catch {
    error.value = "Could not load the session."
  } finally {
    loading.value = false
  }
}

// Opens the cutter workflow for the selected board.
function selectBoard(boardNumber) {
  emit("select", boardNumber)
}

// Returns to session selection through app-managed history.
function goBack() {
  emit("back")
}

onMounted(loadSession)
</script>

<template>
  <section class="board-screen" aria-label="Board selection">
    <h1>{{ session?.name ?? "Select a board" }}</h1>
    <p v-if="loading">Loading boards…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <div v-else class="board-grid">
      <button
        v-for="board in session.boards"
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
    <button class="menu-button screen-back-button" @click="goBack">Back</button>
  </section>
</template>
