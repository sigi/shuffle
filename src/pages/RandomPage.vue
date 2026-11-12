<!-- Random practice page retaining the existing 52-arrow display. -->
<script setup>
import { useArrowsStore } from "../stores/arrows"

const arrows = useArrowsStore()

// Regenerates a random deal when the display is tapped.
function regenerate() {
  arrows.regenerate()
}
</script>

<template>
  <section class="arrow-grid h-full w-full" aria-label="Random bridge deal arrows" @click="regenerate">
    <i
      v-for="(direction, index) in arrows.arrows"
      :key="index"
      :class="{ stripe: Math.floor(index / 6) % 2 === 1 }"
      aria-hidden="true"
      >{{ direction }}</i
    >
  </section>
</template>
