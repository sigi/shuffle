<!-- Confirmation page for marking the active board complete. -->
<script setup>
defineProps({ boardNumber: { type: Number, default: null } })
const emit = defineEmits(["confirm", "cancel"])

// Confirms completion of the active board.
function confirm() {
  emit("confirm")
}

// Cancels completion and returns to the arrow display.
function cancel() {
  emit("cancel")
}
</script>

<template>
  <section class="menu-screen" aria-label="Confirm board completion">
    <h1>Complete board {{ boardNumber }}?</h1>
    <p>Confirm after all cards have been dealt.</p>
    <button class="menu-button" @click="confirm">Confirm</button>
    <button class="menu-button" @click="cancel">Cancel</button>
  </section>
</template>
