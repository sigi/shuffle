<!-- Displays a bridge suit using the Cartamini ligature font. -->
<script setup>
import { computed } from "vue"

const props = defineProps({
  suit: { type: String, required: true },
})
const suitCode = computed(() => props.suit.toLowerCase())
const ligature = computed(() => ({ c: "!c", d: "!d", h: "!h", s: "!s" })[suitCode.value] ?? "")
</script>

<template>
  <span class="card-suit" :class="`suit-${suitCode}`" aria-hidden="true">{{ ligature }}</span>
</template>

<style scoped>
.card-suit {
  font-family: "cartamini2", sans-serif;
  font-variant-ligatures: common-ligatures;
  font-feature-settings: "liga" 1;
  padding-bottom: .15rem;
  margin-right: -.2rem;
  margin-left: -.5rem;
  font-size: 90%;
}
</style>
