<template>
  <div class="priority-picker-backdrop" @click="$emit('close')">
    <div
      class="priority-picker"
      :style="{
        left: position.x + 'px',
        top: position.y + 'px'
      }"
      @click.stop
    >
      <button
        v-for="priority in priorities"
        :key="priority.value"
        class="priority-option"
        :class="`priority-${priority.value}`"
        @click="selectPriority(priority.value)"
      >
        <span class="priority-dot"></span>
        <span>{{ priority.label }}</span>
        <svg
          v-if="currentPriority === priority.value"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  currentPriority: {
    type: String,
    default: 'none'
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['select', 'close'])

const priorities = [
  { value: 'none', label: 'None' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

function selectPriority(priority) {
  emit('select', priority)
}
</script>

<style scoped>
.priority-picker-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.priority-picker {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  min-width: 160px;
  transform: translate(-50%, -100%);
  z-index: 1000;
}

.priority-option {
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
  transition: background 0.2s;
  text-align: left;
}

.priority-option:hover {
  background: var(--bg-tertiary);
}

.priority-option svg {
  margin-left: auto;
  color: var(--accent);
}

.priority-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid currentColor;
}

.priority-option.priority-none .priority-dot {
  border-color: var(--border-color);
  background: transparent;
}

.priority-option.priority-high .priority-dot {
  border-color: var(--priority-high);
  background: var(--priority-high);
}

.priority-option.priority-medium .priority-dot {
  border-color: var(--priority-medium);
  background: var(--priority-medium);
}

.priority-option.priority-low .priority-dot {
  border-color: var(--priority-low);
  background: var(--priority-low);
}

/* Mobile adjustments */
@media (max-width: 480px) {
  .priority-picker {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    transform: none;
    border-radius: 16px 16px 0 0;
    padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }
}
</style>