<script setup>
import { ref } from "vue"
import screenfull from "screenfull"
import { useArrowsStore } from "./stores/arrows"

const arrows = useArrowsStore()
const firstTap = ref(true)

function handleTap() {
  if (firstTap.value) {
    firstTap.value = false
    if (screenfull.isEnabled) void screenfull.request().catch(() => {})
    return
  }

  arrows.regenerate()
}
</script>

<template>
  <main class="arrow-grid h-full w-full" aria-label="Random bridge deal arrows" @click="handleTap">
    <i
      v-for="(direction, index) in arrows.arrows"
      :key="index"
      :class="{ stripe: Math.floor(index / 6) % 2 === 1 }"
      aria-hidden="true"
      >{{ direction }}</i
    >
  </main>
</template>
