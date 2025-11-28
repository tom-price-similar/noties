import { ref, computed } from 'vue'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { getDb } from '../firebase'
import { openDB } from 'idb'

// Initialize IndexedDB for offline support
let idbInstance = null

async function getIDB() {
  if (!idbInstance) {
    idbInstance = await openDB('notiesPlanner', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('dayplans')) {
          db.createObjectStore('dayplans', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('pendingUpdates')) {
          db.createObjectStore('pendingUpdates', { keyPath: 'id' })
        }
      }
    })
  }
  return idbInstance
}

export function usePlanner() {
  const dayPlan = ref(null)
  const loading = ref(false)
  const syncStatus = ref('synced')
  const currentDateId = ref(null)
  let unsubscribe = null

  const pin = computed(() => sessionStorage.getItem('userPin'))

  const syncStatusText = computed(() => {
    switch (syncStatus.value) {
      case 'syncing': return 'Syncing...'
      case 'synced': return 'Synced'
      case 'offline': return 'Offline'
      default: return ''
    }
  })

  async function loadDayPlan(dateId) {
    if (!pin.value) return

    loading.value = true
    currentDateId.value = dateId

    try {
      // Unsubscribe from previous listener if exists
      if (unsubscribe) {
        unsubscribe()
      }

      const docRef = doc(getDb(), 'pins', pin.value, 'dayplans', dateId)

      // Set up real-time listener
      unsubscribe = onSnapshot(
        docRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            dayPlan.value = { id: snapshot.id, ...snapshot.data() }
          } else {
            // Create empty plan for this date
            dayPlan.value = {
              id: dateId,
              slots: {},
              updatedAt: new Date()
            }
          }

          // Cache in IndexedDB
          try {
            const idb = await getIDB()
            await idb.put('dayplans', dayPlan.value)
          } catch (error) {
            console.error('Failed to cache day plan:', error)
          }

          loading.value = false
          syncStatus.value = 'synced'
        },
        async (error) => {
          console.error('Failed to load day plan from Firestore:', error)

          // Try to load from IndexedDB if offline
          try {
            const idb = await getIDB()
            const cached = await idb.get('dayplans', dateId)
            if (cached) {
              dayPlan.value = cached
            } else {
              dayPlan.value = {
                id: dateId,
                slots: {},
                updatedAt: new Date()
              }
            }
          } catch (idbError) {
            console.error('Failed to load from IndexedDB:', idbError)
          }

          loading.value = false
          syncStatus.value = 'offline'
        }
      )
    } catch (error) {
      console.error('Failed to setup day plan listener:', error)
      loading.value = false
      syncStatus.value = 'offline'
    }
  }

  async function updateSlot(dateId, time, value) {
    if (!pin.value) return

    syncStatus.value = 'syncing'

    // Update local state immediately
    if (!dayPlan.value) {
      dayPlan.value = {
        id: dateId,
        slots: {},
        updatedAt: new Date()
      }
    }

    if (!dayPlan.value.slots) {
      dayPlan.value.slots = {}
    }

    // Update or delete the slot value
    if (value) {
      dayPlan.value.slots[time] = value
    } else {
      delete dayPlan.value.slots[time]
    }

    try {
      const docRef = doc(getDb(), 'pins', pin.value, 'dayplans', dateId)

      await setDoc(docRef, {
        slots: dayPlan.value.slots,
        updatedAt: serverTimestamp()
      }, { merge: true })

      syncStatus.value = 'synced'

      // Update IndexedDB cache
      const idb = await getIDB()
      await idb.put('dayplans', dayPlan.value)
    } catch (error) {
      console.error('Failed to update slot:', error)
      syncStatus.value = 'offline'

      // Store update for later sync
      try {
        const idb = await getIDB()
        await idb.put('pendingUpdates', {
          id: `${dateId}-${time}-${Date.now()}`,
          dateId,
          time,
          value,
          timestamp: Date.now()
        })
      } catch (idbError) {
        console.error('Failed to store pending update:', idbError)
      }
    }
  }

  // Sync pending updates when coming back online
  async function syncPendingUpdates() {
    if (!pin.value) return

    try {
      const idb = await getIDB()
      const pendingUpdates = await idb.getAll('pendingUpdates')

      for (const update of pendingUpdates) {
        try {
          const docRef = doc(getDb(), 'pins', pin.value, 'dayplans', update.dateId)
          const docSnap = await getDoc(docRef)

          const existingSlots = docSnap.exists() ? docSnap.data().slots || {} : {}

          if (update.value) {
            existingSlots[update.time] = update.value
          } else {
            delete existingSlots[update.time]
          }

          await setDoc(docRef, {
            slots: existingSlots,
            updatedAt: serverTimestamp()
          }, { merge: true })

          // Remove from pending after successful sync
          await idb.delete('pendingUpdates', update.id)
        } catch (error) {
          console.error('Failed to sync pending update:', error)
        }
      }

      syncStatus.value = 'synced'
    } catch (error) {
      console.error('Failed to sync pending updates:', error)
    }
  }

  // Listen for online/offline events
  window.addEventListener('online', syncPendingUpdates)
  window.addEventListener('offline', () => {
    syncStatus.value = 'offline'
  })

  return {
    dayPlan,
    loading,
    syncStatus,
    syncStatusText,
    loadDayPlan,
    updateSlot
  }
}