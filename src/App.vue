<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { initFirebase } from './firebase'
import { initOfflineSync } from './offlineSync'

onMounted(async () => {
  await initFirebase()
  await initOfflineSync()
})
</script>
