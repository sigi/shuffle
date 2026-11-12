<!-- Handoff screen shown after the cutter confirms the physical cut. -->
<script setup>
const emit = defineEmits(["acknowledge", "back"])

// Acknowledges the handoff before the dealer workflow continues.
function acknowledge() {
  emit("acknowledge")
}

// Returns to the cutter page using the previous app history entry.
function goBack() {
  emit("back")
}
</script>

<template>
  <section class="menu-screen handoff-screen" aria-label="Hand off to the dealer">
    <div class="handoff-content">
      <h1>Hand off the phone</h1>
      <div class="handoff-visual" aria-hidden="true">🃏 + 📱 <span class="i-mdi-arrow-right pb-6"></span> 🧑</div>
      <p>Pass the cut deck and phone to the dealer. Keep the bottom card out of sight so the dealer cannot see it.</p>
      <button class="menu-button" @click="acknowledge"><span class="i-mdi-check"></span> Dealer is
        ready</button>
    </div>
    <button class="menu-button" @click="goBack"><span class="i-mdi-undo"></span> Back to cutting</button>
  </section>
</template>
