<!-- Dealer page generating and displaying arrows for the selected specific deal. -->
<script setup>
import { onMounted, ref } from "vue"
import ArrowDisplay from "../components/ArrowDisplay.vue"
import { createDealArrows } from "../lib/deal-arrows.js"

const props = defineProps({
  setId: { type: String, default: "" },
  boardNumber: { type: Number, default: null },
  cuttingCard: { type: String, default: "" },
})
const arrows = ref([])
const error = ref(false)
const emit = defineEmits(["complete"])

// Loads the selected board and derives its arrow sequence from the actual cut card.
async function createArrows() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}deal-library.json`)
    if (!response.ok) throw new Error("Deal library unavailable")
    const library = await response.json()
    const session = library.sets?.find((set) => set.setId === props.setId)
    const board = session?.boards?.find((item) => item.boardNumber === props.boardNumber)
    if (!board) throw new Error("Selected deal unavailable")
    arrows.value = createDealArrows(board.owners, props.cuttingCard)
  } catch {
    error.value = true
  }
}

onMounted(createArrows)

// Requests the app's completion confirmation after a double tap.
function requestCompletion() {
  emit("complete")
}
</script>

<template>
  <p v-if="error" role="alert">Could not load the selected deal.</p>
  <ArrowDisplay v-else :arrows="arrows" @complete="requestCompletion" />
</template>
