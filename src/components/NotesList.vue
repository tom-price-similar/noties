<template>
  <div class="container with-tab-bar">
    <header class="header">
      <h1>Noties</h1>
      <button class="header-btn primary" @click="createNewNote">+ New</button>
    </header>
    
    <main class="content">
      <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading notes...</p>
      </div>
      
      <div v-else-if="notes.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No notes yet</p>
        <p class="empty-hint">Tap "+ New" to create your first note</p>
      </div>
      
      <div v-else class="notes-list">
        <div
          v-for="note in notes"
          :key="note.id"
          class="note-card"
          @click="openNote(note.id)"
        >
          <div class="note-header">
            <h3 class="note-title">{{ note.title || 'Untitled' }}</h3>
            <svg v-if="note.checklist && note.checklist.length > 0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="checklist-icon">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
            </svg>
          </div>
          <p class="note-preview">{{ getPreview(note) }}</p>
          <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
        </div>
      </div>
    </main>
    
    <footer class="sync-indicator">
      <span 
        class="sync-dot" 
        :class="{ 
          offline: syncStatus === 'offline', 
          syncing: syncStatus === 'syncing' 
        }"
      ></span>
      <span>{{ syncStatusText }}</span>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotes, createNote } from '../notesStore'

const router = useRouter()
const { notes, isLoading, syncStatus } = useNotes()

const syncStatusText = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return 'Syncing...'
    case 'offline': return 'Offline'
    default: return 'Synced'
  }
})

function getPreview(note) {
  // New block-based format
  if (note.blocks && Array.isArray(note.blocks) && note.blocks.length > 0) {
    for (const block of note.blocks) {
      if (block.type === 'text' && block.content) {
        return block.content.slice(0, 100) + (block.content.length > 100 ? '...' : '')
      }
      if (block.type === 'heading' && block.content) {
        return block.content.slice(0, 100) + (block.content.length > 100 ? '...' : '')
      }
      if (block.type === 'checklist' && block.items && block.items.length > 0) {
        const uncheckedCount = block.items.filter(item => !item.checked).length
        const totalCount = block.items.length
        return `${uncheckedCount} of ${totalCount} items${uncheckedCount === 0 ? ' - All done!' : ''}`
      }
    }
  }

  // Legacy format support
  if (note.checklist && note.checklist.length > 0) {
    const uncheckedCount = note.checklist.filter(item => !item.checked).length
    const totalCount = note.checklist.length
    return `${uncheckedCount} of ${totalCount} items${uncheckedCount === 0 ? ' - All done!' : ''}`
  }
  if (note.content) {
    return note.content.slice(0, 100) + (note.content.length > 100 ? '...' : '')
  }

  return 'No content'
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  })
}

async function createNewNote() {
  const id = await createNote('Untitled', [])
  if (id) {
    router.push(`/note/${id}`)
  }
}

function openNote(id) {
  router.push(`/note/${id}`)
}
</script>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  text-align: center;
  padding: 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-hint {
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 8px;
}

.notes-list {
  padding: 8px;
}

.note-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.note-card:hover {
  background: var(--bg-tertiary);
  border-color: var(--border);
}

.note-card:active {
  transform: scale(0.98);
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.note-title {
  font-size: 17px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.checklist-icon {
  color: var(--accent);
  opacity: 0.8;
  flex-shrink: 0;
}

.note-preview {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-date {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
