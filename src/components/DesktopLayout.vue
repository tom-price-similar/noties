<template>
  <div class="desktop-layout">
    <Sidebar
      :selectedNoteId="selectedNoteId"
      @select="selectNote"
      @create="handleCreate"
    />
    <div class="main-content">
      <NoteEditor v-if="selectedNoteId" :key="selectedNoteId" />
      <div v-else class="empty-state">
        <div class="empty-icon">📝</div>
        <p>Select a note or create a new one</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotes } from '../notesStore'
import Sidebar from './Sidebar.vue'
import NoteEditor from './NoteEditor.vue'

const route = useRoute()
const router = useRouter()
const { notes } = useNotes()

const selectedNoteId = ref(null)

// Provide isDesktop flag to children
provide('isDesktop', ref(true))

onMounted(() => {
  // Check if there's an ID in the route
  if (route.params.id) {
    selectedNoteId.value = route.params.id
  }
})

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId) {
    selectedNoteId.value = newId
  }
})

// Auto-select latest note when notes load
watch(notes, (newNotes) => {
  if (!selectedNoteId.value && newNotes.length > 0) {
    selectedNoteId.value = newNotes[0].id
    router.replace(`/note/${newNotes[0].id}`)
  }
}, { immediate: true })

function selectNote(id) {
  selectedNoteId.value = id
  router.push(`/note/${id}`)
}

function handleCreate(id) {
  selectedNoteId.value = id
  router.push(`/note/${id}`)
}
</script>

<style scoped>
.desktop-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  text-align: center;
  padding: 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
</style>
