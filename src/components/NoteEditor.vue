<template>
  <div class="container">
    <header class="header">
      <button class="header-btn" @click="goBack">← Back</button>
      <div class="header-actions">
        <button
          class="header-btn mode-toggle"
          @click="toggleMode"
          :class="{ active: mode === 'checklist' }"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
        </button>
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

      <!-- Text/Markdown Mode -->
      <div v-if="mode === 'text'" class="text-editor">
        <div class="formatting-toolbar">
          <button @click="insertMarkdown('# ', '')" title="Heading 1">H1</button>
          <button @click="insertMarkdown('## ', '')" title="Heading 2">H2</button>
          <button @click="insertMarkdown('### ', '')" title="Heading 3">H3</button>
          <div class="toolbar-separator"></div>
          <button @click="insertMarkdown('**', '**')" title="Bold">B</button>
          <button @click="insertMarkdown('*', '*')" title="Italic">I</button>
          <button @click="insertMarkdown('~~', '~~')" title="Strikethrough">S</button>
        </div>

        <textarea
          ref="contentInput"
          v-model="content"
          class="content-input"
          placeholder="Start writing... (Markdown supported)"
          @input="debouncedSave"
        ></textarea>

        <div v-if="content" class="markdown-preview">
          <h4 class="preview-label">Preview</h4>
          <div v-html="renderedMarkdown" class="markdown-content"></div>
        </div>
      </div>

      <!-- Checklist Mode -->
      <div v-else-if="mode === 'checklist'" class="checklist-editor">
        <div class="checklist-items">
          <ChecklistItem
            v-for="(item, index) in checklist"
            :key="item.id"
            :item="item"
            :index="index"
            @update="updateChecklistItem"
            @add="addChecklistItem"
            @remove="removeChecklistItem"
            @check="toggleChecklistItem"
          />
        </div>
        <button
          v-if="checklist.length === 0"
          @click="addChecklistItem(-1)"
          class="add-first-item"
        >
          + Add first item
        </button>
      </div>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotes, getNoteById, updateNote, deleteNote } from '../notesStore'
import ChecklistItem from './ChecklistItem.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const router = useRouter()
const route = useRoute()
const { syncStatus } = useNotes()

const noteId = computed(() => route.params.id)
const title = ref('')
const content = ref('')
const checklist = ref([])
const mode = ref('text')
const isSaving = ref(false)
const showDeleteModal = ref(false)
const titleInput = ref(null)
const contentInput = ref(null)

let saveTimeout = null

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
})

// Configure DOMPurify to handle links
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const statusText = computed(() => {
  if (isSaving.value) return 'Saving...'
  if (syncStatus.value === 'offline') return 'Offline'
  if (syncStatus.value === 'syncing') return 'Syncing...'
  return 'Saved'
})

const renderedMarkdown = computed(() => {
  if (!content.value) return ''

  // Parse markdown
  let html = marked.parse(content.value)

  // Auto-link URLs
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // Sanitize HTML
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'del', 'a', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
})

const sortedChecklist = computed(() => {
  const unchecked = checklist.value.filter(item => !item.checked)
  const checked = checklist.value.filter(item => item.checked)

  // Sort by priority within unchecked items
  const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 }
  unchecked.sort((a, b) => {
    const aPriority = priorityOrder[a.priority] ?? 3
    const bPriority = priorityOrder[b.priority] ?? 3
    return aPriority - bPriority
  })

  return [...unchecked, ...checked]
})

onMounted(() => {
  if (noteId.value) {
    const note = getNoteById(noteId.value)
    if (note) {
      title.value = note.title || ''
      content.value = note.content || ''
      checklist.value = note.checklist || []

      // Determine mode based on content
      if (note.checklist && note.checklist.length > 0) {
        mode.value = 'checklist'
      } else {
        mode.value = 'text'
      }
    }
  } else {
    titleInput.value?.focus()
  }
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
})

function toggleMode() {
  mode.value = mode.value === 'text' ? 'checklist' : 'text'

  // Initialize empty checklist if switching to checklist mode
  if (mode.value === 'checklist' && checklist.value.length === 0) {
    addChecklistItem(-1)
  }

  debouncedSave()
}

function insertMarkdown(before, after) {
  const textarea = contentInput.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end)

  const newText = content.value.substring(0, start) +
    before + selectedText + after +
    content.value.substring(end)

  content.value = newText

  // Set cursor position
  nextTick(() => {
    const newCursorPos = start + before.length + selectedText.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })

  debouncedSave()
}

function addChecklistItem(afterIndex) {
  const newItem = {
    id: Date.now().toString(),
    text: '',
    checked: false,
    priority: 'none',
    createdAt: new Date()
  }

  if (afterIndex === -1) {
    checklist.value.push(newItem)
  } else {
    checklist.value.splice(afterIndex + 1, 0, newItem)
  }

  debouncedSave()
}

function updateChecklistItem(index, updatedItem) {
  checklist.value[index] = updatedItem
  debouncedSave()
}

function removeChecklistItem(index) {
  checklist.value.splice(index, 1)
  debouncedSave()
}

function toggleChecklistItem(index) {
  checklist.value[index].checked = !checklist.value[index].checked

  // Animate the item moving to bottom if checked
  if (checklist.value[index].checked) {
    // Sort after a delay for animation
    setTimeout(() => {
      checklist.value = sortedChecklist.value
    }, 300)
  }

  debouncedSave()
}

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  isSaving.value = true
  saveTimeout = setTimeout(saveNote, 500)
}

async function saveNote() {
  if (!noteId.value) return

  await updateNote(noteId.value, {
    title: title.value,
    content: content.value,
    checklist: checklist.value
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

/* Text Editor */
.text-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.formatting-toolbar {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.formatting-toolbar button {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.formatting-toolbar button:hover {
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.formatting-toolbar button:active {
  transform: translateY(0);
}

.toolbar-separator {
  width: 1px;
  background: var(--border-color);
  margin: 0 4px;
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
  min-height: 200px;
}

.content-input::placeholder {
  color: var(--text-muted);
}

.markdown-preview {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  overflow-y: auto;
  max-height: 40%;
}

.preview-label {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.markdown-content {
  color: var(--text-primary);
  line-height: 1.6;
}

.markdown-content h1 {
  font-size: 24px;
  margin: 16px 0 8px;
}

.markdown-content h2 {
  font-size: 20px;
  margin: 14px 0 6px;
}

.markdown-content h3 {
  font-size: 18px;
  margin: 12px 0 4px;
}

.markdown-content p {
  margin: 8px 0;
}

.markdown-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.markdown-content a:hover {
  border-bottom-color: var(--accent);
}

.markdown-content strong {
  font-weight: 600;
}

.markdown-content em {
  font-style: italic;
}

.markdown-content del {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Checklist Editor */
.checklist-editor {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.checklist-items {
  display: flex;
  flex-direction: column;
}

.add-first-item {
  padding: 12px 24px;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 20px;
}

.add-first-item:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Mode Toggle */
.mode-toggle {
  padding: 8px !important;
  border-radius: 8px;
}

.mode-toggle.active {
  background: var(--accent);
  color: var(--bg-primary);
}

.mode-toggle svg {
  width: 20px;
  height: 20px;
}

/* Modal */
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