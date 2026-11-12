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
const displayRank = computed(() => props.cuttingCard.startsWith("T") ? "10" : props.cuttingCard.slice(0, -1))
const displayCard = computed(() => `${suits[props.cuttingCard.slice(-1)]}${displayRank.value}`)

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
    <div class="cutter-instructions">
      <p>Start at the bottom of the sorted deck (♣2), keeping every card face up and in order.</p>
      <p>Find the target card. Move all cards below it to the top without changing their order. The target card is now on the bottom.</p>
      <p>Tap the card to choose a new target if needed. When the cut is done, pass the phone to the dealer without showing the target.</p>
    </div>
    <button
      class="cut-card"
      :class="suitClass(cuttingCard)"
      :aria-label="`Cutting card ${displayCard}. Tap to refresh.`"
      @click="refreshCard"
    >
      <span>{{ suits[cuttingCard.slice(-1)] }}</span><span>{{ displayRank }}</span>
      <span class="cut-card-refresh" aria-hidden="true">↻</span>
    </button>
    <div class="cutter-actions">
      <button class="menu-button" @click="confirmCut">✓ Cut performed — hand off</button>
    </div>
  </section>
</template>
