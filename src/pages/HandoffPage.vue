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
      <p>Give the phone to the dealer before continuing.</p>
      <button class="menu-button" @click="acknowledge">Continue</button>
    </div>
    <button class="menu-button" @click="goBack">Back</button>
  </section>
</template>
