<template>
  <router-view />
  <TabBar v-if="showTabBar" />
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { initFirebase } from './firebase'
import { initOfflineSync } from './offlineSync'
import TabBar from './components/TabBar.vue'

const route = useRoute()

// Only show tab bar on notes list and planner pages
const showTabBar = computed(() => {
  return route.path === '/notes' || route.path === '/planner'
})

onMounted(async () => {
  await initFirebase()
  await initOfflineSync()
})
</script>
