<template>
  <div :class="{ 'electron-app': isElectron }">
    <!-- Desktop Electron layout with sidebar -->
    <DesktopLayout v-if="isElectron && isNotesRoute" />

    <!-- PWA / Web layout -->
    <template v-else>
      <router-view />
      <TabBar v-if="showTabBar" />
    </template>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { initFirebase } from './firebase'
import { initOfflineSync } from './offlineSync'
import { subscribeToNotes } from './notesStore'
import TabBar from './components/TabBar.vue'
import DesktopLayout from './components/DesktopLayout.vue'

const route = useRoute()

// Detect if running in Electron
const isElectron = ref(false)

// Check if on notes-related route
const isNotesRoute = computed(() => {
  return route.path === '/notes' || route.path.startsWith('/note')
})

// Only show tab bar on notes list and planner pages (not on desktop Electron)
const showTabBar = computed(() => {
  if (isElectron.value) return false
  return route.path === '/notes' || route.path === '/planner'
})

onMounted(async () => {
  // Check for Electron environment
  isElectron.value = !!(window.electronAPI?.isElectron)

  await initFirebase()
  await initOfflineSync()

  // Subscribe to notes immediately (no PIN required)
  subscribeToNotes()
})
</script>
