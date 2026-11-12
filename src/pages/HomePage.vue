<!-- Home page offering the app's random and deal-library modes. -->
<script setup>
const emit = defineEmits(["navigate"])

// Requests navigation to the selected mode.
function openMode(mode) {
  emit("navigate", mode)
}
</script>

<template>
  <section class="menu-screen" aria-label="Home">
    <h1>Shuffle</h1>
    <button class="menu-button" @click="openMode('random')">Random mode</button>
    <button class="menu-button" @click="openMode('library')">Library mode</button>
  </section>
</template>
