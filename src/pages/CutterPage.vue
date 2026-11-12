<!-- Cutter page revealing and refreshing the randomly selected cut card. -->
<script setup>
import { computed } from "vue"
import { useAppStore } from "../stores/app"

const props = defineProps({
  sessionId: { type: String, default: "" },
  boardNumber: { type: Number, default: null },
  cuttingCard: { type: String, default: "" },
})
const emit = defineEmits(["refresh", "confirm"])
const suits = { C: "♣", D: "♦", H: "♥", S: "♠" }
const app = useAppStore()
const sessionName = computed(() => app.dealLibrary?.sets
  ?.find((set) => set.setId === props.sessionId)?.name ?? props.sessionId)

// Returns the suit class used to color both card characters.
function suitClass(card) {
  return `suit-${card.slice(-1).toLowerCase()}`
}

// Requests a new uniformly selected cut card.
function refreshCard() {
  emit("refresh")
}

// Confirms the physical cut and advances to handoff.
function confirmCut() {
  emit("confirm")
}
</script>

<template>
  <section class="cutter-screen" aria-label="Cut the deck">
    <h1>{{ sessionName }} · Board {{ boardNumber }}</h1>
    <p>Find this card from the bottom of the sorted deck.</p>
    <button
      class="cut-card"
      :class="suitClass(cuttingCard)"
      :aria-label="`Cutting card ${suits[cuttingCard.slice(-1)]}${cuttingCard.slice(0, -1)}. Tap to refresh.`"
      @click="refreshCard"
    >
      <span>{{ suits[cuttingCard.slice(-1)] }}</span><span>{{ cuttingCard.slice(0, -1) }}</span>
    </button>
    <div class="cutter-actions">
      <button class="menu-button" @click="confirmCut">Confirm cut</button>
    </div>
  </section>
</template>
