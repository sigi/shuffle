<!-- Session selection page backed by the generated deal library. -->
<script setup>
import { onMounted, ref } from "vue"

const emit = defineEmits(["back", "select"])
const sessions = ref([])
const loading = ref(true)
const error = ref("")

// Loads and deterministically orders the generated session list.
async function loadSessions() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}deal-library.json`)
    if (!response.ok) throw new Error("Deal library unavailable")
    const library = await response.json()
    if (library.schemaVersion !== 1 || !Array.isArray(library.sets)) {
      throw new Error("Deal library has an unsupported format")
    }
    sessions.value = [...library.sets].sort((a, b) =>
      a.setId < b.setId ? -1 : a.setId > b.setId ? 1 : 0,
    )
  } catch {
    error.value = "Could not load the deal library."
  } finally {
    loading.value = false
  }
}

// Opens the selected session in board selection.
function selectSession(setId) {
  const session = sessions.value.find((item) => item.setId === setId)
  if (session) emit("select", { setId, boardCount: session.boards.length })
}

// Returns to the previous screen in app history.
function goBack() {
  emit("back")
}

onMounted(loadSessions)
</script>

<template>
  <section class="menu-screen session-screen" aria-label="Session selection">
    <h1>Select a session</h1>
    <p v-if="loading">Loading sessions…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <p v-else-if="sessions.length === 0">No sessions are available.</p>
    <div v-else class="session-list">
      <button
        v-for="session in sessions"
        :key="session.setId"
        class="menu-button session-button"
        @click="selectSession(session.setId)"
      >
        {{ session.name }}
      </button>
    </div>
    <button class="menu-button screen-back-button" @click="goBack">Back</button>
  </section>
</template>
