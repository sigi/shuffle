<!-- Random practice page retaining the existing 52-arrow display. -->
<script setup>
import { useArrowsStore } from "../stores/arrows"

const arrows = useArrowsStore()
const emit = defineEmits(["back"])
let swipeStart = null
let suppressNextClick = false
let suppressClickTimer

// Regenerates a random deal when the display is tapped.
function regenerate() {
  arrows.regenerate()
}

// Captures upward swipes locally so random mode always has an exit gesture.
function startSwipe(event) {
  swipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
}

// Returns to the previous app screen after a clear upward swipe.
function finishSwipe(event) {
  if (!swipeStart || swipeStart.pointerId !== event.pointerId) return
  const deltaX = Math.abs(event.clientX - swipeStart.x)
  const deltaY = event.clientY - swipeStart.y
  swipeStart = null
  if (deltaY <= -80 && Math.abs(deltaY) > deltaX * 1.25) {
    suppressNextClick = true
    clearTimeout(suppressClickTimer)
    suppressClickTimer = setTimeout(() => {
      suppressNextClick = false
    }, 0)
    emit("back")
  }
}

// Prevents a swipe-generated click from also regenerating the random deal.
function handleClick(event) {
  if (!suppressNextClick) {
    regenerate()
    return
  }
  suppressNextClick = false
  clearTimeout(suppressClickTimer)
  event.preventDefault()
  event.stopPropagation()
}
</script>

<template>
  <section
    class="arrow-grid random-arrow-grid h-full w-full"
    aria-label="Random bridge deal arrows"
    @pointerdown="startSwipe"
    @pointerup="finishSwipe"
    @pointercancel="swipeStart = null"
    @click="handleClick"
  >
    <i
      v-for="(direction, index) in arrows.arrows"
      :key="index"
      :class="{ stripe: Math.floor(index / 6) % 2 === 1 }"
      aria-hidden="true"
      >{{ direction }}</i
    >
  </section>
</template>
