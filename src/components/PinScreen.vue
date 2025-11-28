<template>
  <div class="pin-screen">
    <div class="pin-container">
      <div class="logo">📝</div>
      <h1>Noties</h1>
      <p class="subtitle">Enter your PIN to continue</p>
      
      <div class="pin-dots">
        <span 
          v-for="i in 4" 
          :key="i" 
          class="dot" 
          :class="{ filled: pin.length >= i }"
        ></span>
      </div>
      
      <div class="keypad">
        <button 
          v-for="num in [1,2,3,4,5,6,7,8,9,null,0,'del']" 
          :key="num"
          class="key"
          :class="{ invisible: num === null, delete: num === 'del' }"
          @click="handleKey(num)"
          :disabled="num === null"
        >
          {{ num === 'del' ? '⌫' : num }}
        </button>
      </div>
      
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { setPin, subscribeToNotes } from '../notesStore'

const router = useRouter()
const pin = ref('')
const error = ref('')

function handleKey(key) {
  error.value = ''
  
  if (key === 'del') {
    pin.value = pin.value.slice(0, -1)
    return
  }
  
  if (key === null) return
  
  if (pin.value.length < 4) {
    pin.value += key.toString()
    
    if (pin.value.length === 4) {
      submitPin()
    }
  }
}

async function submitPin() {
  if (pin.value.length !== 4) {
    error.value = 'Please enter a 4-digit PIN'
    return
  }
  
  setPin(pin.value)
  sessionStorage.setItem('noties-authenticated', 'true')
  subscribeToNotes()
  router.push('/notes')
}
</script>

<style scoped>
.pin-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.pin-container {
  text-align: center;
  width: 100%;
  max-width: 300px;
}

.logo {
  font-size: 64px;
  margin-bottom: 16px;
}

h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.pin-dots {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 32px;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--text-secondary);
  transition: all 0.2s;
}

.dot.filled {
  background: var(--accent);
  border-color: var(--accent);
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 260px;
  margin: 0 auto;
}

.key {
  height: 64px;
  font-size: 24px;
  font-weight: 500;
  border-radius: 50%;
  background: var(--bg-secondary);
  transition: all 0.15s;
}

.key:hover {
  background: var(--bg-tertiary);
}

.key:active {
  transform: scale(0.95);
}

.key.invisible {
  visibility: hidden;
}

.key.delete {
  font-size: 20px;
}

.error {
  color: var(--danger);
  margin-top: 16px;
  font-size: 14px;
}

@media (max-width: 360px) {
  .key {
    height: 56px;
    font-size: 20px;
  }
}
</style>
