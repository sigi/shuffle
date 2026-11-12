<!-- Home page offering the app's random and deal-library modes. -->
<script setup>
const emit = defineEmits(["navigate"])
const appIconUrl = `${import.meta.env.BASE_URL}icons/shuffle_192x192.png`

// Requests navigation to the selected mode.
function openMode(mode) {
  emit("navigate", mode)
}
</script>

<template>
  <section class="menu-screen home-screen" aria-label="Home">
    <div class="home-brand">
      <img class="home-icon" :src="appIconUrl" alt="" />
      <h1>Shuffle</h1>
    </div>
    <div class="home-actions">
      <button class="menu-button" @click="openMode('random')"><span class="i-mdi-dice-5" aria-hidden="true" /> Random dealing</button>
      <button class="menu-button" @click="openMode('library')"><span class="i-mdi-folder-open" aria-hidden="true" /> Play a session</button>
    </div>
  </section>
</template>
