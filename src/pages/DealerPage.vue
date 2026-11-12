<!-- Dealer page generating and displaying arrows for the selected specific deal. -->
<script setup>
import { computed, ref, watch } from "vue"
import ArrowDisplay from "../components/ArrowDisplay.vue"
import { createDealArrows } from "../lib/deal-arrows.js"
import { useAppStore } from "../stores/app"

const props = defineProps({
  setId: { type: String, default: "" },
  boardNumber: { type: Number, default: null },
  cuttingCard: { type: String, default: "" },
})
const arrows = ref([])
const error = ref(false)
const emit = defineEmits(["complete", "back"])
const app = useAppStore()
const board = computed(() => app.dealLibrary?.sets
  ?.find((set) => set.setId === props.setId)
  ?.boards?.find((item) => item.boardNumber === props.boardNumber))

// Derives the selected board's arrows from the actual cut card when data is ready.
function createArrows() {
  if (app.libraryStatus === "loading") return
  try {
    if (!board.value) throw new Error("Selected deal unavailable")
    arrows.value = createDealArrows(board.value.owners, props.cuttingCard)
    error.value = false
  } catch {
    error.value = true
  }
}

watch(() => [app.libraryStatus, props.setId, props.boardNumber, props.cuttingCard], createArrows, { immediate: true })

// Requests the app's completion confirmation after a double tap.
function requestCompletion() {
  emit("complete")
}

// Returns to board selection when the selected deal cannot be displayed.
function returnToBoards() {
  emit("back")
}
</script>

<template>
  <section v-if="error" class="menu-screen" role="alert" aria-label="Deal display error">
    <h1>Deal unavailable</h1>
    <p>Could not display this deal.</p>
    <button class="menu-button" @click="returnToBoards">↶ Back to boards</button>
  </section>
  <ArrowDisplay v-else :arrows="arrows" @complete="requestCompletion" />
</template>
