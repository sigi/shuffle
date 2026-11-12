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
const emit = defineEmits(["complete"])
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
</script>

<template>
  <p v-if="error" role="alert">Could not load the selected deal.</p>
  <ArrowDisplay v-else :arrows="arrows" @complete="requestCompletion" />
</template>
