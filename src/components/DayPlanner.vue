<template>
  <div class="day-planner">
    <header class="planner-header">
      <h1>Day Planner</h1>
      <div class="day-selector">
        <button
          @click="selectedDay = 'today'"
          class="day-btn"
          :class="{ active: selectedDay === 'today' }"
        >
          Today
        </button>
        <button
          @click="selectedDay = 'tomorrow'"
          class="day-btn"
          :class="{ active: selectedDay === 'tomorrow' }"
        >
          Tomorrow
        </button>
      </div>
      <p class="date-display">{{ displayDate }}</p>
    </header>

    <div class="time-slots" v-if="!loading">
      <div
        v-for="slot in timeSlots"
        :key="slot.time"
        class="time-slot"
        :class="{
          'current-time': isCurrentTimeSlot(slot.time),
          'has-content': dayPlan?.slots?.[slot.time]
        }"
      >
        <span class="time-label">{{ slot.label }}</span>
        <input
          type="text"
          v-model="slotValues[slot.time]"
          @input="handleSlotUpdate(slot.time)"
          :placeholder="isCurrentTimeSlot(slot.time) ? 'Now' : ''"
          class="slot-input"
        />
      </div>
    </div>

    <div v-else class="loading">
      Loading...
    </div>

    <div class="sync-status" :class="syncStatus">
      <span class="sync-dot"></span>
      <span>{{ syncStatusText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlanner } from '../stores/plannerStore'

const {
  dayPlan,
  loading,
  syncStatus,
  syncStatusText,
  loadDayPlan,
  updateSlot
} = usePlanner()

const selectedDay = ref('today')
const slotValues = ref({})
const updateTimeouts = ref({})

// Generate time slots from 6:00 AM to 10:00 PM
const timeSlots = computed(() => {
  const slots = []
  for (let hour = 6; hour <= 21; hour++) {
    for (let minute of [0, 30]) {
      if (hour === 21 && minute === 30) continue // Stop at 21:30
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const label = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`
      slots.push({ time, label })
    }
  }
  slots.push({ time: '21:30', label: '9:30 PM' }) // Add the final slot
  return slots
})

const displayDate = computed(() => {
  const date = selectedDay.value === 'today' ? new Date() : new Date(Date.now() + 86400000)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
})

const dateId = computed(() => {
  const date = selectedDay.value === 'today' ? new Date() : new Date(Date.now() + 86400000)
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
})

function isCurrentTimeSlot(slotTime) {
  if (selectedDay.value !== 'today') return false

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const [slotHour, slotMinute] = slotTime.split(':').map(Number)

  // Check if current time falls within this 30-minute slot
  const slotStart = slotHour * 60 + slotMinute
  const slotEnd = slotStart + 30
  const currentTime = currentHour * 60 + currentMinute

  return currentTime >= slotStart && currentTime < slotEnd
}

function handleSlotUpdate(time) {
  // Clear existing timeout for this slot
  if (updateTimeouts.value[time]) {
    clearTimeout(updateTimeouts.value[time])
  }

  // Debounce the update
  updateTimeouts.value[time] = setTimeout(() => {
    updateSlot(dateId.value, time, slotValues.value[time] || '')
  }, 500)
}

// Watch for day changes
watch(selectedDay, async () => {
  await loadDayPlan(dateId.value)
})

// Watch for dayPlan changes and update local values
watch(dayPlan, (newPlan) => {
  if (newPlan?.slots) {
    slotValues.value = { ...newPlan.slots }
  } else {
    slotValues.value = {}
  }
}, { immediate: true })

// Auto-refresh current time slot indicator every minute
let intervalId
onMounted(async () => {
  await loadDayPlan(dateId.value)
  intervalId = setInterval(() => {
    // Force re-render to update current time slot
  }, 60000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  // Clear all timeouts
  Object.values(updateTimeouts.value).forEach(timeout => clearTimeout(timeout))
})
</script>

<style scoped>
.day-planner {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(56px + env(safe-area-inset-bottom)); /* Account for tab bar */
}

.planner-header {
  padding: 20px;
  padding-top: calc(20px + env(safe-area-inset-top));
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.planner-header h1 {
  font-size: 28px;
  margin: 0 0 16px 0;
}

.day-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.day-btn {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.day-btn:active {
  transform: scale(0.98);
}

.day-btn.active {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}

.date-display {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.time-slots {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.time-slot {
  display: flex;
  align-items: center;
  padding: 0 20px;
  min-height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.time-slot:hover {
  background: rgba(255, 255, 255, 0.02);
}

.time-slot.current-time {
  background: rgba(255, 200, 87, 0.1);
  border-left: 3px solid var(--accent);
  padding-left: 17px;
}

.time-slot.has-content .time-label {
  color: var(--accent);
}

.time-label {
  width: 80px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.slot-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  padding: 12px 8px;
  outline: none;
}

.slot-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.sync-status {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-radius: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  z-index: 10;
}

.sync-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.sync-status.synced .sync-dot {
  background: #4ade80;
}

.sync-status.syncing .sync-dot {
  background: var(--accent);
  animation: pulse 1s infinite;
}

.sync-status.offline .sync-dot {
  background: #ff6b6b;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>