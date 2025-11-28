<template>
  <div class="container">
    <header class="header">
      <button v-if="!isDesktop" class="header-btn" @click="goBack">← Back</button>
      <div v-else class="header-spacer"></div>
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

      <div
        ref="editorRef"
        class="editor"
        contenteditable="true"
        @input="handleInput"
        @keydown="handleKeydown"
        @paste="handlePaste"
        @click="handleClick"
        :data-placeholder="'Start writing... (type / for commands)'"
      ></div>

      <!-- Slash Menu -->
      <SlashMenu
        v-if="showSlashMenu"
        :position="slashMenuPosition"
        :filter="slashFilter"
        @select="handleSlashSelect"
        @close="closeSlashMenu"
      />
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
import { ref, computed, onMounted, onUnmounted, nextTick, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotes, getNoteById, updateNote, deleteNote, generateBlockId, generateItemId } from '../notesStore'
import SlashMenu from './SlashMenu.vue'

const router = useRouter()
const route = useRoute()
const { syncStatus } = useNotes()

const isDesktop = inject('isDesktop', ref(false))

const noteId = computed(() => route.params.id)
const title = ref('')
const isSaving = ref(false)
const showDeleteModal = ref(false)
const titleInput = ref(null)
const editorRef = ref(null)

// Slash menu state
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ x: 0, y: 0 })
const slashFilter = ref('')
const slashRange = ref(null)

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
      // Load content into editor
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.innerHTML = deserializeContent(note)
          attachChecklistListeners()
        }
      })
    }
  } else {
    titleInput.value?.focus()
  }
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
})

// Convert stored data to HTML for the editor
function deserializeContent(note) {
  // Handle new blocks format
  if (note.blocks && Array.isArray(note.blocks)) {
    return note.blocks.map(block => {
      if (block.type === 'text') {
        return `<p>${escapeHtml(block.content) || '<br>'}</p>`
      } else if (block.type === 'heading') {
        const tag = `h${block.level}`
        return `<${tag}>${escapeHtml(block.content)}</${tag}>`
      } else if (block.type === 'checklist') {
        return block.items.map(item => createChecklistItemHtml(item)).join('')
      }
      return ''
    }).join('')
  }

  // Handle legacy content string
  if (note.content) {
    return note.content.split('\n').map(line => `<p>${escapeHtml(line) || '<br>'}</p>`).join('')
  }

  return '<p><br></p>'
}

// Convert editor HTML back to storage format
function serializeContent() {
  if (!editorRef.value) return []

  const blocks = []
  const children = editorRef.value.childNodes

  for (const node of children) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim()
      if (text) {
        blocks.push({ id: generateBlockId(), type: 'text', content: text })
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase()

      if (tag === 'p' || tag === 'div') {
        const text = node.textContent
        if (text || blocks.length === 0) {
          blocks.push({ id: generateBlockId(), type: 'text', content: text })
        }
      } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        blocks.push({
          id: generateBlockId(),
          type: 'heading',
          level: parseInt(tag[1]),
          content: node.textContent
        })
      } else if (node.classList?.contains('checklist-item')) {
        // Find or create checklist block
        let lastBlock = blocks[blocks.length - 1]
        if (!lastBlock || lastBlock.type !== 'checklist') {
          lastBlock = { id: generateBlockId(), type: 'checklist', items: [] }
          blocks.push(lastBlock)
        }

        const checkbox = node.querySelector('.checkbox')
        const input = node.querySelector('.checklist-text')
        const priority = checkbox?.dataset.priority || 'none'
        const checked = checkbox?.classList.contains('checked') || false
        const indent = parseInt(node.dataset.indent) || 0

        lastBlock.items.push({
          id: generateItemId(),
          text: input?.textContent || '',
          checked,
          priority,
          indent
        })
      }
    }
  }

  // Ensure at least one block
  if (blocks.length === 0) {
    blocks.push({ id: generateBlockId(), type: 'text', content: '' })
  }

  return blocks
}

function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function createChecklistItemHtml(item, focus = false) {
  const checkedClass = item.checked ? 'checked' : ''
  const priorityClass = `priority-${item.priority || 'none'}`
  const indent = item.indent || 0

  return `<div class="checklist-item" contenteditable="false" data-indent="${indent}" style="padding-left: ${indent * 24}px">
    <button class="checkbox ${checkedClass} ${priorityClass}" data-priority="${item.priority || 'none'}">
      ${item.checked ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
    </button>
    <span class="checklist-text ${item.checked ? 'strike-through' : ''}" contenteditable="true" data-placeholder="Add item...">${escapeHtml(item.text)}</span>
  </div>`
}

function attachChecklistListeners() {
  if (!editorRef.value) return

  // Attach click listeners to checkboxes
  editorRef.value.querySelectorAll('.checkbox').forEach(checkbox => {
    checkbox.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      toggleCheckbox(checkbox)
    }
  })

  // Attach keydown listeners to checklist text spans
  editorRef.value.querySelectorAll('.checklist-text').forEach(span => {
    span.onkeydown = (e) => handleChecklistTextKeydown(e, span)
  })
}

function toggleCheckbox(checkbox) {
  const isChecked = checkbox.classList.toggle('checked')
  const textSpan = checkbox.parentElement.querySelector('.checklist-text')

  if (isChecked) {
    checkbox.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    textSpan?.classList.add('strike-through')
  } else {
    checkbox.innerHTML = ''
    textSpan?.classList.remove('strike-through')
  }

  debouncedSave()
}

function handleChecklistTextKeydown(e, span) {
  const item = span.closest('.checklist-item')

  if (e.key === 'Enter') {
    e.preventDefault()

    // Check for double-enter on empty item
    if (!span.textContent.trim()) {
      // Convert to regular paragraph and exit checklist
      const p = document.createElement('p')
      p.innerHTML = '<br>'
      item.replaceWith(p)

      // Place cursor in the new paragraph
      const range = document.createRange()
      range.setStart(p, 0)
      range.collapse(true)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      // Create new checklist item after this one
      const priority = item.querySelector('.checkbox')?.dataset.priority || 'none'
      const indent = parseInt(item.dataset.indent) || 0
      const newItem = { id: generateItemId(), text: '', checked: false, priority, indent }

      const newHtml = createChecklistItemHtml(newItem)
      item.insertAdjacentHTML('afterend', newHtml)

      // Focus new item
      const newItemEl = item.nextElementSibling
      const newSpan = newItemEl?.querySelector('.checklist-text')
      if (newSpan) {
        newSpan.focus()
        attachChecklistListeners()
      }
    }

    debouncedSave()
  } else if (e.key === 'Backspace' && !span.textContent) {
    e.preventDefault()

    // Get previous sibling
    const prev = item.previousElementSibling

    // Remove this item
    item.remove()

    // Focus previous element
    if (prev?.classList.contains('checklist-item')) {
      const prevSpan = prev.querySelector('.checklist-text')
      if (prevSpan) {
        prevSpan.focus()
        // Move cursor to end
        const range = document.createRange()
        range.selectNodeContents(prevSpan)
        range.collapse(false)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      }
    } else if (prev) {
      prev.focus()
    }

    debouncedSave()
  } else if (e.key === 'Tab') {
    e.preventDefault()

    const currentIndent = parseInt(item.dataset.indent) || 0
    const newIndent = e.shiftKey ? Math.max(0, currentIndent - 1) : Math.min(3, currentIndent + 1)

    item.dataset.indent = newIndent
    item.style.paddingLeft = `${newIndent * 24}px`

    debouncedSave()
  }
}

function handleInput(e) {
  checkForSlashCommand()
  debouncedSave()
}

function handleKeydown(e) {
  if (e.key === 'Escape' && showSlashMenu.value) {
    closeSlashMenu()
    e.preventDefault()
  }

  // Handle Enter in slash menu
  if (e.key === 'Enter' && showSlashMenu.value) {
    // Let SlashMenu handle it
    return
  }
}

function handlePaste(e) {
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  document.execCommand('insertText', false, text)
}

function handleClick(e) {
  // Clicked on a checkbox
  if (e.target.classList.contains('checkbox')) {
    return
  }

  // Close slash menu if clicking elsewhere
  if (showSlashMenu.value) {
    const sel = window.getSelection()
    if (sel.rangeCount) {
      checkForSlashCommand()
    }
  }
}

function checkForSlashCommand() {
  const sel = window.getSelection()
  if (!sel.rangeCount) return

  const range = sel.getRangeAt(0)

  // Get text before cursor
  const textNode = range.startContainer
  if (textNode.nodeType !== Node.TEXT_NODE) {
    if (showSlashMenu.value) closeSlashMenu()
    return
  }

  const text = textNode.textContent.substring(0, range.startOffset)
  const slashIndex = text.lastIndexOf('/')

  if (slashIndex !== -1 && (slashIndex === 0 || text[slashIndex - 1] === ' ' || text[slashIndex - 1] === '\n')) {
    const filter = text.substring(slashIndex + 1)

    // Get position for menu
    const tempRange = document.createRange()
    tempRange.setStart(textNode, slashIndex)
    tempRange.setEnd(textNode, slashIndex + 1)
    const rect = tempRange.getBoundingClientRect()

    slashMenuPosition.value = { x: rect.left, y: rect.bottom + 4 }
    slashFilter.value = filter
    slashRange.value = { node: textNode, slashIndex, endOffset: range.startOffset }
    showSlashMenu.value = true
  } else if (showSlashMenu.value) {
    closeSlashMenu()
  }
}

function handleSlashSelect(item) {
  if (!slashRange.value) {
    closeSlashMenu()
    return
  }

  const { node, slashIndex, endOffset } = slashRange.value

  // Remove the slash command text
  const before = node.textContent.substring(0, slashIndex)
  const after = node.textContent.substring(endOffset)
  node.textContent = before + after

  // Create and insert the new element
  let newElement

  if (item.type === 'heading') {
    newElement = document.createElement(`h${item.level}`)
    newElement.innerHTML = '<br>'
  } else if (item.type === 'checklist') {
    const checklistItem = { id: generateItemId(), text: '', checked: false, priority: item.priority, indent: 0 }
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = createChecklistItemHtml(checklistItem)
    newElement = tempDiv.firstElementChild
  }

  if (newElement) {
    // Find the parent block element
    let parent = node.parentElement
    while (parent && parent !== editorRef.value && !['P', 'DIV', 'H1', 'H2', 'H3'].includes(parent.tagName)) {
      parent = parent.parentElement
    }

    if (parent && parent !== editorRef.value) {
      // If there's text before, keep it in current element
      if (before.trim()) {
        parent.insertAdjacentElement('afterend', newElement)
      } else {
        // Replace the current element
        parent.replaceWith(newElement)
      }
    } else {
      // Just append to editor
      editorRef.value.appendChild(newElement)
    }

    // Focus the new element
    nextTick(() => {
      if (item.type === 'checklist') {
        const textSpan = newElement.querySelector('.checklist-text')
        if (textSpan) {
          textSpan.focus()
          attachChecklistListeners()
        }
      } else {
        newElement.focus()
        const range = document.createRange()
        range.setStart(newElement, 0)
        range.collapse(true)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      }
    })
  }

  closeSlashMenu()
  debouncedSave()
}

function closeSlashMenu() {
  showSlashMenu.value = false
  slashFilter.value = ''
  slashRange.value = null
}

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  isSaving.value = true
  saveTimeout = setTimeout(saveNote, 500)
}

async function saveNote() {
  if (!noteId.value) return

  const blocks = serializeContent()

  await updateNote(noteId.value, {
    title: title.value,
    blocks
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
.header-spacer {
  width: 80px;
}

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

.editor {
  flex: 1;
  overflow-y: auto;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.6;
  outline: none;
}

.editor:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
}

.editor p,
.editor div:not(.checklist-item) {
  margin: 0;
  min-height: 1.6em;
}

.editor h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 16px 0 8px;
}

.editor h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 14px 0 6px;
}

.editor h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 12px 0 4px;
}

/* Checklist styles */
.editor :deep(.checklist-item) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  margin: 0;
}

.editor :deep(.checkbox) {
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 6px;
  border: 2px solid var(--border-color);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.editor :deep(.checkbox:hover) {
  transform: scale(1.05);
}

.editor :deep(.checkbox svg) {
  color: var(--text-primary);
}

.editor :deep(.checkbox.priority-none) {
  border-color: var(--border-color);
}

.editor :deep(.checkbox.priority-high) {
  border-color: var(--priority-high);
  background: rgba(255, 107, 107, 0.1);
}

.editor :deep(.checkbox.priority-high svg) {
  color: var(--priority-high);
}

.editor :deep(.checkbox.priority-medium) {
  border-color: var(--priority-medium);
  background: rgba(255, 200, 87, 0.1);
}

.editor :deep(.checkbox.priority-medium svg) {
  color: var(--priority-medium);
}

.editor :deep(.checkbox.priority-low) {
  border-color: var(--priority-low);
  background: rgba(74, 222, 128, 0.1);
}

.editor :deep(.checkbox.priority-low svg) {
  color: var(--priority-low);
}

.editor :deep(.checklist-text) {
  flex: 1;
  outline: none;
  min-height: 1.6em;
}

.editor :deep(.checklist-text:empty::before) {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
}

.editor :deep(.checklist-text.strike-through) {
  text-decoration: line-through;
  color: var(--text-secondary);
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
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.modal-btn:hover {
  background: var(--border-color);
}

.modal-btn.danger {
  background: var(--danger);
  color: white;
}

.modal-btn.danger:hover {
  background: #ff5252;
}
</style>
