<!-- Full-screen 52-arrow display shared by the specific-deal dealer page. -->
<script setup>
defineProps({
  arrows: { type: Array, required: true },
})
const emit = defineEmits(["complete"])
let swipeStart = null

// Records the start point for a possible downward completion swipe.
function startSwipe(event) {
  swipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
}

// Emits completion only for a clear downward swipe of at least 80 pixels.
function finishSwipe(event) {
  if (!swipeStart || swipeStart.pointerId !== event.pointerId) return
  const deltaX = Math.abs(event.clientX - swipeStart.x)
  const deltaY = event.clientY - swipeStart.y
  swipeStart = null
  if (deltaY >= 80 && deltaY > deltaX * 1.25) emit("complete")
}
</script>

<template>
  <section
    class="arrow-grid deal-arrow-display h-full w-full"
    aria-label="Bridge deal arrows"
    @pointerdown="startSwipe"
    @pointerup="finishSwipe"
    @pointercancel="swipeStart = null"
  >
    <i
      v-for="(direction, index) in arrows"
      :key="index"
      :class="[direction, { stripe: Math.floor(index / 6) % 2 === 1 }]"
      aria-hidden="true"
    />
  </section>
</template>
