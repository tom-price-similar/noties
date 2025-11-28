<template>
  <div class="slash-menu-backdrop" @click="$emit('close')">
    <div
      class="slash-menu"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
      @click.stop
    >
      <div class="slash-menu-header">Insert block</div>
      <div class="slash-menu-items">
        <button
          v-for="(item, index) in filteredItems"
          :key="item.id"
          class="slash-menu-item"
          :class="{ active: index === selectedIndex }"
          @click="selectItem(item)"
          @mouseenter="selectedIndex = index"
        >
          <span class="slash-menu-icon" :class="item.iconClass">{{ item.icon }}</span>
          <span class="slash-menu-label">{{ item.label }}</span>
        </button>
      </div>
      <div v-if="filteredItems.length === 0" class="slash-menu-empty">
        No matching options
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  filter: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'close'])

const selectedIndex = ref(0)

const menuItems = [
  { id: 'checklist-high', label: 'Red Checklist', icon: '', iconClass: 'priority-high', type: 'checklist', priority: 'high' },
  { id: 'checklist-medium', label: 'Yellow Checklist', icon: '', iconClass: 'priority-medium', type: 'checklist', priority: 'medium' },
  { id: 'checklist-low', label: 'Green Checklist', icon: '', iconClass: 'priority-low', type: 'checklist', priority: 'low' },
  { id: 'heading-1', label: 'Heading 1', icon: 'H1', iconClass: 'heading', type: 'heading', level: 1 },
  { id: 'heading-2', label: 'Heading 2', icon: 'H2', iconClass: 'heading', type: 'heading', level: 2 },
  { id: 'heading-3', label: 'Heading 3', icon: 'H3', iconClass: 'heading', type: 'heading', level: 3 }
]

const filteredItems = computed(() => {
  if (!props.filter) return menuItems
  const search = props.filter.toLowerCase()
  return menuItems.filter(item =>
    item.label.toLowerCase().includes(search) ||
    item.id.toLowerCase().includes(search)
  )
})

watch(() => props.filter, () => {
  selectedIndex.value = 0
})

function selectItem(item) {
  emit('select', item)
}

function handleKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = selectedIndex.value <= 0 ? filteredItems.value.length - 1 : selectedIndex.value - 1
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filteredItems.value.length > 0) {
      selectItem(filteredItems.value[selectedIndex.value])
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.slash-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.slash-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  min-width: 200px;
  max-width: 280px;
  z-index: 1000;
}

.slash-menu-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px 8px;
}

.slash-menu-items {
  display: flex;
  flex-direction: column;
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
  text-align: left;
}

.slash-menu-item:hover,
.slash-menu-item.active {
  background: var(--bg-tertiary);
}

.slash-menu-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.slash-menu-icon.priority-high {
  background: rgba(255, 107, 107, 0.2);
  border: 2px solid var(--priority-high);
}

.slash-menu-icon.priority-medium {
  background: rgba(255, 200, 87, 0.2);
  border: 2px solid var(--priority-medium);
}

.slash-menu-icon.priority-low {
  background: rgba(74, 222, 128, 0.2);
  border: 2px solid var(--priority-low);
}

.slash-menu-icon.heading {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.slash-menu-label {
  flex: 1;
}

.slash-menu-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

/* Mobile adjustments */
@media (max-width: 480px) {
  .slash-menu {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    border-radius: 16px 16px 0 0;
    padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
    max-width: none;
  }
}
</style>
