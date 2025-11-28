<template>
  <div class="container" @keydown="handleGlobalKeydown">
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

      <div class="blocks-container" ref="blocksContainer">
        <div
          v-for="(block, index) in blocks"
          :key="block.id"
          class="block"
          :class="[`block-${block.type}`, { 'block-selected': selectedBlocks.includes(index) }]"
          :data-block-index="index"
          @click="handleBlockClick($event, index)"
        >
          <!-- Text Block - use ref callback to set initial content -->
          <div
            v-if="block.type === 'text'"
            class="text-block"
            contenteditable="true"
            :data-block-id="block.id"
            :data-block-index="index"
            :ref="el => setBlockContent(el, block)"
            @input="handleTextInput($event, index)"
            @keydown="handleTextKeydown($event, index)"
            @paste="handlePaste($event, index)"
            @focus="clearBlockSelection"
            :placeholder="index === 0 && blocks.length === 1 ? 'Start writing... (type / for commands)' : ''"
          ></div>

          <!-- Heading Block -->
          <div
            v-else-if="block.type === 'heading'"
            class="heading-block"
            :class="`heading-${block.level}`"
            contenteditable="true"
            :data-block-id="block.id"
            :data-block-index="index"
            :ref="el => setBlockContent(el, block)"
            @input="handleHeadingInput($event, index)"
            @keydown="handleHeadingKeydown($event, index)"
            @paste="handlePaste($event, index)"
            @focus="clearBlockSelection"
          ></div>

          <!-- Checklist Block -->
          <div v-else-if="block.type === 'checklist'" class="checklist-block">
            <div
              v-for="(item, itemIndex) in block.items"
              :key="item.id"
              class="checklist-item"
              :class="{ checked: item.checked, [`indent-${item.indent || 0}`]: true }"
              :style="{ paddingLeft: (item.indent || 0) * 24 + 'px' }"
            >
              <button
                class="checkbox"
                :class="`priority-${item.priority}`"
                @click="toggleChecklistItem(index, itemIndex)"
              >
                <svg v-if="item.checked" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <input
                type="text"
                class="checklist-input"
                :class="{ 'strike-through': item.checked }"
                :value="item.text"
                :data-block-index="index"
                :data-item-index="itemIndex"
                @input="updateChecklistItemText(index, itemIndex, $event.target.value)"
                @keydown="handleChecklistKeydown($event, index, itemIndex)"
                @focus="clearBlockSelection"
                placeholder="Add item..."
              />
            </div>
          </div>
        </div>

        <!-- Empty state / new block area -->
        <div
          v-if="blocks.length === 0"
          class="text-block empty-block"
          contenteditable="true"
          @input="handleEmptyBlockInput"
          @keydown="handleEmptyBlockKeydown"
          placeholder="Start writing... (type / for commands)"
        ></div>
      </div>

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
import { useNotes, getNoteById, updateNote, deleteNote, migrateNote, generateBlockId, generateItemId } from '../notesStore'
import SlashMenu from './SlashMenu.vue'

const router = useRouter()
const route = useRoute()
const { syncStatus } = useNotes()

// Check if running in desktop mode (injected from parent)
const isDesktop = inject('isDesktop', ref(false))

const noteId = computed(() => route.params.id)
const title = ref('')
const blocks = ref([])
const isSaving = ref(false)
const showDeleteModal = ref(false)
const titleInput = ref(null)
const blocksContainer = ref(null)

// Block selection state
const selectedBlocks = ref([])

// Slash menu state
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ x: 0, y: 0 })
const slashFilter = ref('')
const slashBlockIndex = ref(-1)
const slashStartOffset = ref(0)

// Track last empty Enter for double-enter detection
const lastEmptyEnterTime = ref(0)
const lastEmptyEnterBlockIndex = ref(-1)

let saveTimeout = null

// Track which blocks have been initialized to prevent re-setting content
const initializedBlocks = new Set()

// Set block content only once when element is created
function setBlockContent(el, block) {
  if (!el || initializedBlocks.has(block.id)) return

  // Only set content if element is empty or different
  if (el.innerText !== (block.content || '')) {
    el.innerText = block.content || ''
  }
  initializedBlocks.add(block.id)
}

const statusText = computed(() => {
  if (isSaving.value) return 'Saving...'
  if (syncStatus.value === 'offline') return 'Offline'
  if (syncStatus.value === 'syncing') return 'Syncing...'
  return 'Saved'
})

onMounted(() => {
  // Clear initialized blocks set for fresh start (important when switching notes)
  initializedBlocks.clear()

  if (noteId.value) {
    const note = getNoteById(noteId.value)
    if (note) {
      const migratedNote = migrateNote(note)
      title.value = migratedNote.title || ''
      blocks.value = migratedNote.blocks || []
    }
  } else {
    titleInput.value?.focus()
  }
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
})

// Handle global keydown for multi-block operations
function handleGlobalKeydown(event) {
  // Delete selected blocks
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBlocks.value.length > 0) {
    event.preventDefault()
    deleteSelectedBlocks()
    return
  }

  // Select all with Cmd/Ctrl+A when no text input is focused
  if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
    const activeElement = document.activeElement
    const isInEditor = activeElement?.closest('.blocks-container')

    if (isInEditor) {
      // If there's a text selection, let normal behavior happen first time
      const selection = window.getSelection()
      if (selection.toString().length === 0 || selectedBlocks.value.length > 0) {
        event.preventDefault()
        selectAllBlocks()
      }
    }
  }
}

function handleBlockClick(event, index) {
  if (event.shiftKey && selectedBlocks.value.length > 0) {
    // Shift+click to extend selection
    const lastSelected = selectedBlocks.value[selectedBlocks.value.length - 1]
    const start = Math.min(lastSelected, index)
    const end = Math.max(lastSelected, index)
    selectedBlocks.value = Array.from({ length: end - start + 1 }, (_, i) => start + i)
  } else if (event.metaKey || event.ctrlKey) {
    // Cmd/Ctrl+click to toggle selection
    const idx = selectedBlocks.value.indexOf(index)
    if (idx > -1) {
      selectedBlocks.value.splice(idx, 1)
    } else {
      selectedBlocks.value.push(index)
    }
  }
}

function clearBlockSelection() {
  selectedBlocks.value = []
}

function selectAllBlocks() {
  selectedBlocks.value = blocks.value.map((_, i) => i)
}

function deleteSelectedBlocks() {
  if (selectedBlocks.value.length === 0) return

  // Sort in descending order to delete from end first
  const toDelete = [...selectedBlocks.value].sort((a, b) => b - a)

  for (const index of toDelete) {
    blocks.value.splice(index, 1)
  }

  // If all blocks deleted, create empty text block
  if (blocks.value.length === 0) {
    blocks.value.push({
      id: generateBlockId(),
      type: 'text',
      content: ''
    })
  }

  selectedBlocks.value = []
  debouncedSave()

  nextTick(() => {
    focusBlock(0)
  })
}

function handleTextInput(event, index) {
  const text = event.target.innerText
  blocks.value[index].content = text
  debouncedSave()

  // Check for slash command
  checkForSlashCommand(event.target, index)
}

function handleHeadingInput(event, index) {
  blocks.value[index].content = event.target.innerText
  debouncedSave()
}

function handleTextKeydown(event, index) {
  const target = event.target
  const text = target.innerText

  if (event.key === 'Enter' && !event.shiftKey) {
    // If slash menu is open, let it handle Enter
    if (showSlashMenu.value) return

    event.preventDefault()
    // Create new text block after current one
    const newBlock = { id: generateBlockId(), type: 'text', content: '' }
    blocks.value.splice(index + 1, 0, newBlock)
    debouncedSave()

    nextTick(() => {
      focusBlock(index + 1)
    })
  } else if (event.key === 'Backspace' && text === '' && blocks.value.length > 1) {
    event.preventDefault()
    blocks.value.splice(index, 1)
    debouncedSave()

    nextTick(() => {
      focusBlock(Math.max(0, index - 1))
    })
  } else if (event.key === 'Escape') {
    if (showSlashMenu.value) {
      closeSlashMenu()
    }
  }
}

function handleHeadingKeydown(event, index) {
  if (event.key === 'Enter') {
    event.preventDefault()
    // Create new text block after heading
    const newBlock = { id: generateBlockId(), type: 'text', content: '' }
    blocks.value.splice(index + 1, 0, newBlock)
    debouncedSave()

    nextTick(() => {
      focusBlock(index + 1)
    })
  } else if (event.key === 'Backspace' && event.target.innerText === '') {
    event.preventDefault()
    blocks.value.splice(index, 1)
    debouncedSave()

    nextTick(() => {
      focusBlock(Math.max(0, index - 1))
    })
  }
}

function handleChecklistKeydown(event, blockIndex, itemIndex) {
  const block = blocks.value[blockIndex]
  const item = block.items[itemIndex]

  if (event.key === 'Tab') {
    event.preventDefault()

    if (event.shiftKey) {
      // Shift+Tab: Decrease indent
      if (item.indent && item.indent > 0) {
        item.indent = item.indent - 1
        debouncedSave()
      }
    } else {
      // Tab: Increase indent (max 3 levels)
      const maxIndent = 3
      const currentIndent = item.indent || 0
      if (currentIndent < maxIndent) {
        item.indent = currentIndent + 1
        debouncedSave()
      }
    }
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()

    const now = Date.now()
    const isDoubleEnter = item.text === '' &&
                          lastEmptyEnterBlockIndex.value === blockIndex &&
                          now - lastEmptyEnterTime.value < 500

    if (isDoubleEnter) {
      // Double enter on empty item - exit checklist, create text block
      // Remove the current empty item
      block.items.splice(itemIndex, 1)

      // If checklist is now empty, replace it with text block
      if (block.items.length === 0) {
        blocks.value[blockIndex] = {
          id: generateBlockId(),
          type: 'text',
          content: ''
        }
        debouncedSave()
        nextTick(() => {
          focusBlock(blockIndex)
        })
      } else {
        // Insert a text block after the checklist
        const newBlock = { id: generateBlockId(), type: 'text', content: '' }
        blocks.value.splice(blockIndex + 1, 0, newBlock)
        debouncedSave()
        nextTick(() => {
          focusBlock(blockIndex + 1)
        })
      }

      lastEmptyEnterTime.value = 0
      lastEmptyEnterBlockIndex.value = -1
      return
    }

    // Track this enter for double-enter detection
    if (item.text === '') {
      lastEmptyEnterTime.value = now
      lastEmptyEnterBlockIndex.value = blockIndex
    } else {
      lastEmptyEnterTime.value = 0
      lastEmptyEnterBlockIndex.value = -1
    }

    // Add new item after current one with same priority and indent
    const newItem = {
      id: generateItemId(),
      text: '',
      checked: false,
      priority: item.priority,
      indent: item.indent || 0
    }
    block.items.splice(itemIndex + 1, 0, newItem)
    debouncedSave()

    nextTick(() => {
      focusChecklistItem(blockIndex, itemIndex + 1)
    })
  } else if (event.key === 'Backspace' && event.target.value === '') {
    event.preventDefault()

    // Reset double-enter tracking
    lastEmptyEnterTime.value = 0
    lastEmptyEnterBlockIndex.value = -1

    if (block.items.length === 1) {
      // Last item in checklist - convert to text block
      blocks.value[blockIndex] = {
        id: block.id,
        type: 'text',
        content: ''
      }
      debouncedSave()
      nextTick(() => {
        focusBlock(blockIndex)
      })
    } else {
      // Remove item
      block.items.splice(itemIndex, 1)
      debouncedSave()

      nextTick(() => {
        focusChecklistItem(blockIndex, Math.max(0, itemIndex - 1))
      })
    }
  } else {
    // Any other key resets double-enter tracking
    if (event.key.length === 1 || event.key === 'Delete') {
      lastEmptyEnterTime.value = 0
      lastEmptyEnterBlockIndex.value = -1
    }
  }
}

function handleEmptyBlockInput(event) {
  const text = event.target.innerText

  if (text) {
    // Create first text block
    blocks.value.push({
      id: generateBlockId(),
      type: 'text',
      content: text
    })
    debouncedSave()

    // Clear empty block
    event.target.innerText = ''

    nextTick(() => {
      focusBlock(0)
    })
  }
}

function handleEmptyBlockKeydown(event) {
  if (event.key === '/') {
    // Show slash menu
    const rect = event.target.getBoundingClientRect()
    slashMenuPosition.value = { x: rect.left, y: rect.bottom + 4 }
    slashBlockIndex.value = -1 // -1 indicates empty state
    slashFilter.value = ''
    showSlashMenu.value = true
  }
}

function handlePaste(event, index) {
  event.preventDefault()
  const text = event.clipboardData.getData('text/plain')
  document.execCommand('insertText', false, text)
}

function checkForSlashCommand(target, index) {
  const text = target.innerText
  const selection = window.getSelection()

  if (!selection.rangeCount) return

  // Get cursor position
  const range = selection.getRangeAt(0)
  let cursorPos = 0

  // Calculate cursor position in the text
  if (range.startContainer === target) {
    cursorPos = range.startOffset
  } else if (range.startContainer.nodeType === Node.TEXT_NODE) {
    // Find position within the contenteditable
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null, false)
    let node
    let pos = 0
    while ((node = walker.nextNode())) {
      if (node === range.startContainer) {
        cursorPos = pos + range.startOffset
        break
      }
      pos += node.textContent.length
    }
  }

  const beforeText = text.substring(0, cursorPos)
  const slashIndex = beforeText.lastIndexOf('/')

  if (slashIndex !== -1 && (slashIndex === 0 || beforeText[slashIndex - 1] === ' ' || beforeText[slashIndex - 1] === '\n')) {
    const filter = beforeText.substring(slashIndex + 1)

    // Position menu at cursor
    const rect = range.getBoundingClientRect()

    slashMenuPosition.value = { x: rect.left || target.getBoundingClientRect().left, y: (rect.bottom || target.getBoundingClientRect().bottom) + 4 }
    slashBlockIndex.value = index
    slashStartOffset.value = slashIndex
    slashFilter.value = filter
    showSlashMenu.value = true
  } else if (showSlashMenu.value) {
    closeSlashMenu()
  }
}

function handleSlashSelect(item) {
  const blockIndex = slashBlockIndex.value

  closeSlashMenu()

  if (item.type === 'heading') {
    const newBlock = {
      id: generateBlockId(),
      type: 'heading',
      level: item.level,
      content: ''
    }

    if (blockIndex === -1) {
      // Empty state - just add the block
      blocks.value.push(newBlock)
      debouncedSave()
      nextTick(() => {
        focusBlock(0)
      })
    } else {
      // Get current block and update its content (remove slash command)
      const currentBlock = blocks.value[blockIndex]
      const contentBeforeSlash = (currentBlock.content || '').substring(0, slashStartOffset.value)

      if (contentBeforeSlash.trim() === '') {
        // No content before slash - replace the block
        // Remove old block from initialized set so new one can be set
        initializedBlocks.delete(currentBlock.id)
        blocks.value[blockIndex] = newBlock
        debouncedSave()
        nextTick(() => {
          focusBlock(blockIndex)
        })
      } else {
        // Has content before slash - keep it and insert new block after
        // Update DOM directly to avoid re-render issues
        const container = blocksContainer.value
        if (container) {
          const blockEl = container.querySelectorAll('.block')[blockIndex]
          const editable = blockEl?.querySelector('[contenteditable="true"]')
          if (editable) {
            editable.innerText = contentBeforeSlash
          }
        }
        currentBlock.content = contentBeforeSlash
        blocks.value.splice(blockIndex + 1, 0, newBlock)
        debouncedSave()
        nextTick(() => {
          focusBlock(blockIndex + 1)
        })
      }
    }

  } else if (item.type === 'checklist') {
    const newBlock = {
      id: generateBlockId(),
      type: 'checklist',
      items: [{
        id: generateItemId(),
        text: '',
        checked: false,
        priority: item.priority,
        indent: 0
      }]
    }

    if (blockIndex === -1) {
      // Empty state - just add the block
      blocks.value.push(newBlock)
      debouncedSave()
      nextTick(() => {
        focusChecklistItem(0, 0)
      })
    } else {
      // Get current block and update its content (remove slash command)
      const currentBlock = blocks.value[blockIndex]
      const contentBeforeSlash = (currentBlock.content || '').substring(0, slashStartOffset.value)

      if (contentBeforeSlash.trim() === '') {
        // No content before slash - replace the block
        // Remove old block from initialized set
        initializedBlocks.delete(currentBlock.id)
        blocks.value[blockIndex] = newBlock
        debouncedSave()
        nextTick(() => {
          focusChecklistItem(blockIndex, 0)
        })
      } else {
        // Has content before slash - keep it and insert new block after
        // Update DOM directly to avoid re-render issues
        const container = blocksContainer.value
        if (container) {
          const blockEl = container.querySelectorAll('.block')[blockIndex]
          const editable = blockEl?.querySelector('[contenteditable="true"]')
          if (editable) {
            editable.innerText = contentBeforeSlash
          }
        }
        currentBlock.content = contentBeforeSlash
        blocks.value.splice(blockIndex + 1, 0, newBlock)
        debouncedSave()
        nextTick(() => {
          focusChecklistItem(blockIndex + 1, 0)
        })
      }
    }
  }
}

function closeSlashMenu() {
  showSlashMenu.value = false
  slashFilter.value = ''
  slashBlockIndex.value = -1
}

function toggleChecklistItem(blockIndex, itemIndex) {
  blocks.value[blockIndex].items[itemIndex].checked = !blocks.value[blockIndex].items[itemIndex].checked
  debouncedSave()
}

function updateChecklistItemText(blockIndex, itemIndex, text) {
  blocks.value[blockIndex].items[itemIndex].text = text
  debouncedSave()
}

function focusBlock(index) {
  const container = blocksContainer.value
  if (!container) return

  nextTick(() => {
    const allBlocks = container.querySelectorAll('.block')
    const block = allBlocks[index]
    if (block) {
      const editable = block.querySelector('[contenteditable="true"]')
      if (editable) {
        editable.focus()
        // Move cursor to end
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(editable)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  })
}

function focusChecklistItem(blockIndex, itemIndex) {
  const container = blocksContainer.value
  if (!container) return

  nextTick(() => {
    const allBlocks = container.querySelectorAll('.block')
    const block = allBlocks[blockIndex]
    if (block) {
      const inputs = block.querySelectorAll('.checklist-input')
      if (inputs[itemIndex]) {
        inputs[itemIndex].focus()
      }
    }
  })
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
    blocks: blocks.value
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

.blocks-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.block {
  position: relative;
  border-radius: 4px;
  transition: background 0.15s;
}

.block-selected {
  background: rgba(255, 200, 87, 0.2);
  outline: 2px solid var(--accent);
}

/* Text Block */
.text-block {
  width: 100%;
  min-height: 24px;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.6;
  outline: none;
  word-wrap: break-word;
  white-space: pre-wrap;
  padding: 2px 4px;
}

.text-block:empty::before {
  content: attr(placeholder);
  color: var(--text-muted);
  pointer-events: none;
}

/* Heading Blocks */
.heading-block {
  width: 100%;
  outline: none;
  font-weight: 700;
  color: var(--text-primary);
  margin: 8px 0;
  padding: 2px 4px;
}

.heading-block:empty::before {
  content: 'Heading';
  color: var(--text-muted);
  pointer-events: none;
}

.heading-1 {
  font-size: 24px;
  margin: 16px 0 8px;
}

.heading-2 {
  font-size: 20px;
  margin: 14px 0 6px;
}

.heading-3 {
  font-size: 18px;
  margin: 12px 0 4px;
}

/* Checklist Block */
.checklist-block {
  display: flex;
  flex-direction: column;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  transition: opacity 0.3s ease, padding-left 0.2s ease;
}

.checklist-item.checked {
  opacity: 0.6;
}

.checkbox {
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
}

.checkbox:hover {
  transform: scale(1.05);
}

.checkbox:active {
  transform: scale(0.95);
}

.checkbox svg {
  color: var(--text-primary);
}

/* Priority colors */
.checkbox.priority-none {
  border-color: var(--border-color);
}

.checkbox.priority-high {
  border-color: var(--priority-high);
  background: rgba(255, 107, 107, 0.1);
}

.checkbox.priority-high svg {
  color: var(--priority-high);
}

.checkbox.priority-medium {
  border-color: var(--priority-medium);
  background: rgba(255, 200, 87, 0.1);
}

.checkbox.priority-medium svg {
  color: var(--priority-medium);
}

.checkbox.priority-low {
  border-color: var(--priority-low);
  background: rgba(74, 222, 128, 0.1);
}

.checkbox.priority-low svg {
  color: var(--priority-low);
}

.checklist-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 16px;
  outline: none;
  padding: 4px 0;
}

.checklist-input.strike-through {
  text-decoration: line-through;
  color: var(--text-secondary);
}

.checklist-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.empty-block {
  min-height: 100px;
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
