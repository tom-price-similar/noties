<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <button class="new-note-btn" @click="createNewNote">+ New</button>
    </div>

    <div class="sidebar-content">
      <div v-if="isLoading" class="sidebar-loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="notes.length === 0" class="sidebar-empty">
        No notes
      </div>

      <div v-else class="notes-list">
        <button
          v-for="note in notes"
          :key="note.id"
          class="note-item"
          :class="{ active: note.id === selectedNoteId }"
          @click="selectNote(note.id)"
        >
          <span class="note-title">{{ note.title || 'Untitled' }}</span>
        </button>
      </div>
    </div>

    <footer class="sidebar-footer">
      <span
        class="sync-dot"
        :class="{
          offline: syncStatus === 'offline',
          syncing: syncStatus === 'syncing'
        }"
      ></span>
      <span class="sync-text">{{ syncStatusText }}</span>
    </footer>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useNotes, createNote } from '../notesStore'

const props = defineProps({
  selectedNoteId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['select', 'create'])

const { notes, isLoading, syncStatus } = useNotes()

const syncStatusText = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return 'Syncing...'
    case 'offline': return 'Offline'
    default: return 'Synced'
  }
})

async function createNewNote() {
  const id = await createNote('Untitled', [])
  if (id) {
    emit('create', id)
  }
}

function selectNote(id) {
  emit('select', id)
}
</script>

<style scoped>
.sidebar {
  width: 150px;
  min-width: 150px;
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 8px;
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
  padding-top: 40px; /* Space for traffic lights */
}

.new-note-btn {
  width: 100%;
  padding: 8px 12px;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  -webkit-app-region: no-drag;
}

.new-note-btn:hover {
  background: #e6b44e;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-loading {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sidebar-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.notes-list {
  display: flex;
  flex-direction: column;
}

.note-item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.note-item:hover {
  background: var(--bg-tertiary);
}

.note-item.active {
  background: var(--bg-tertiary);
  border-left-color: var(--accent);
}

.note-title {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.sync-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
}

.sync-dot.offline {
  background: var(--danger);
}

.sync-dot.syncing {
  background: var(--accent);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.sync-text {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
