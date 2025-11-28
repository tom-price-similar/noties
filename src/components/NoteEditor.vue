<template>
  <div class="container">
    <header class="header">
      <button class="header-btn" @click="goBack">← Back</button>
      <div class="header-actions">
        <button class="header-btn danger" @click="confirmDelete" v-if="noteId">Delete</button>
      </div>
    </header>
    
    <main class="editor-content">
      <input
        ref="titleInput"
        v-model="title"
        class="title-input"
        placeholder="Title"
        @input="debouncedSave"
      />
      <textarea
        ref="contentInput"
        v-model="content"
        class="content-input"
        placeholder="Start writing..."
        @input="debouncedSave"
      ></textarea>
    </main>
    
    <footer class="sync-indicator">
      <span 
        class="sync-dot" 
        :class="{ 
          offline: syncStatus === 'offline', 
          syncing: syncStatus === 'syncing' || isSaving
        }"
      ></span>
      <span>{{ statusText }}</span>
    </footer>
    
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal" @click.stop>
        <h3>Delete Note?</h3>
        <p>This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="modal-btn" @click="showDeleteModal = false">Cancel</button>
          <button class="modal-btn danger" @click="handleDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotes, getNoteById, updateNote, deleteNote } from '../notesStore'

const router = useRouter()
const route = useRoute()
const { syncStatus } = useNotes()

const noteId = computed(() => route.params.id)
const title = ref('')
const content = ref('')
const isSaving = ref(false)
const showDeleteModal = ref(false)
const titleInput = ref(null)

let saveTimeout = null

const statusText = computed(() => {
  if (isSaving.value) return 'Saving...'
  if (syncStatus.value === 'offline') return 'Offline'
  if (syncStatus.value === 'syncing') return 'Syncing...'
  return 'Saved'
})

onMounted(() => {
  if (noteId.value) {
    const note = getNoteById(noteId.value)
    if (note) {
      title.value = note.title || ''
      content.value = note.content || ''
    }
  } else {
    titleInput.value?.focus()
  }
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
})

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  isSaving.value = true
  saveTimeout = setTimeout(saveNote, 500)
}

async function saveNote() {
  if (!noteId.value) return
  
  await updateNote(noteId.value, {
    title: title.value,
    content: content.value
  })
  
  isSaving.value = false
}

function goBack() {
  router.push('/notes')
}

function confirmDelete() {
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!noteId.value) return
  
  await deleteNote(noteId.value)
  router.push('/notes')
}
</script>

<style scoped>
.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.title-input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 700;
  padding: 0;
  margin-bottom: 16px;
  outline: none;
}

.title-input::placeholder {
  color: var(--text-muted);
}

.content-input {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.6;
  padding: 0;
  outline: none;
  resize: none;
}

.content-input::placeholder {
  color: var(--text-muted);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}

.modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.modal h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.modal p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  background: var(--bg-tertiary);
  transition: background 0.2s;
}

.modal-btn:hover {
  background: var(--border);
}

.modal-btn.danger {
  background: var(--danger);
  color: white;
}

.modal-btn.danger:hover {
  background: #ff5252;
}
</style>
