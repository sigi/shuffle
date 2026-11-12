<!-- Session selection page backed by the generated deal library. -->
<script setup>
import { computed } from "vue"
import { useAppStore } from "../stores/app"

const emit = defineEmits(["back", "select"])
const app = useAppStore()
const sessions = computed(() => [...(app.dealLibrary?.sets ?? [])].sort((a, b) =>
  a.setId < b.setId ? -1 : a.setId > b.setId ? 1 : 0,
))

// Opens the selected session in board selection.
function selectSession(setId) {
  const session = sessions.value.find((item) => item.setId === setId)
  if (session) emit("select", { setId, boardCount: session.boards.length })
}

// Returns to the previous screen in app history.
function goBack() {
  emit("back")
}

</script>

<template>
  <section class="menu-screen session-screen" aria-label="Session selection">
    <h1>Select a session</h1>
    <p v-if="app.libraryStatus === 'loading'">Loading sessions…</p>
    <p v-else-if="app.libraryStatus === 'error'" role="alert">Could not load the deal library.</p>
    <p v-else-if="sessions.length === 0">No sessions are available.</p>
    <div v-else class="session-list">
      <button
        v-for="session in sessions"
        :key="session.setId"
        class="menu-button session-button"
        :class="{ touched: (app.completedBoards[session.setId]?.length ?? 0) > 0 }"
        @click="selectSession(session.setId)"
      >
        <span>{{ session.name }}</span>
        <small v-if="(app.completedBoards[session.setId]?.length ?? 0) > 0">In progress</small>
      </button>
    </div>
    <button class="menu-button screen-back-button" @click="goBack">⌂ Home</button>
  </section>
</template>
