<template>
  <div class="checklist-item" :class="{ checked: item.checked }">
    <button
      class="checkbox"
      :class="`priority-${item.priority}`"
      @click="toggleCheck"
      @contextmenu.prevent="showPriorityPicker"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      :aria-label="`Priority: ${item.priority}, ${item.checked ? 'Checked' : 'Unchecked'}`"
    >
      <svg v-if="item.checked" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>

    <input
      ref="inputRef"
      v-model="item.text"
      @input="handleTextChange"
      @keydown.enter="handleEnter"
      @keydown.backspace="handleBackspace"
      type="text"
      class="checklist-input"
      :class="{ 'strike-through': item.checked }"
      placeholder="Add item..."
    />

    <PriorityPicker
      v-if="showPicker"
      :currentPriority="item.priority"
      @select="selectPriority"
      @close="showPicker = false"
      :position="pickerPosition"
    />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import PriorityPicker from './PriorityPicker.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update', 'add', 'remove', 'check'])

const inputRef = ref(null)
const showPicker = ref(false)
const pickerPosition = ref({ x: 0, y: 0 })
const touchTimer = ref(null)
const touchStartTime = ref(0)

function toggleCheck() {
  // If long press was triggered, don't toggle check
  if (Date.now() - touchStartTime.value > 500) return

  emit('check', props.index)
}

function handleTextChange() {
  emit('update', props.index, { ...props.item, text: props.item.text })
}

function handleEnter(event) {
  event.preventDefault()
  emit('add', props.index)
}

function handleBackspace(event) {
  if (props.item.text === '' && event.target.selectionStart === 0) {
    event.preventDefault()
    emit('remove', props.index)
  }
}

function showPriorityPicker(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  pickerPosition.value = {
    x: rect.left + rect.width / 2,
    y: rect.top - 8
  }
  showPicker.value = true
}

function handleTouchStart(event) {
  touchStartTime.value = Date.now()
  touchTimer.value = setTimeout(() => {
    showPriorityPicker(event)
  }, 500) // 500ms for long press
}

function handleTouchEnd() {
  if (touchTimer.value) {
    clearTimeout(touchTimer.value)
  }
}

function selectPriority(priority) {
  emit('update', props.index, { ...props.item, priority })
  showPicker.value = false
}

function cyclePriority() {
  const priorities = ['none', 'high', 'medium', 'low']
  const currentIndex = priorities.indexOf(props.item.priority)
  const nextIndex = (currentIndex + 1) % priorities.length
  emit('update', props.index, { ...props.item, priority: priorities[nextIndex] })
}

// Focus input when created
nextTick(() => {
  if (props.item.text === '') {
    inputRef.value?.focus()
  }
})
</script>

<style scoped>
.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  transition: opacity 0.3s ease;
  position: relative;
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
  position: relative;
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

.checkbox.priority-none.checked,
.checkbox.priority-none svg {
  border-color: var(--text-secondary);
  color: var(--text-secondary);
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

@media (hover: none) {
  /* Touch devices */
  .checkbox:hover {
    transform: none;
  }
}
</style>