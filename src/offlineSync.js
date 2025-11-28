import { openDB } from 'idb'

const DB_NAME = 'noties-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-changes'

let offlineDb = null

export async function initOfflineSync() {
  offlineDb = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
  
  window.addEventListener('online', syncPendingChanges)
  
  if (navigator.onLine) {
    await syncPendingChanges()
  }
  
  return offlineDb
}

export async function addPendingChange(change) {
  if (!offlineDb) return
  await offlineDb.add(STORE_NAME, {
    ...change,
    timestamp: Date.now()
  })
}

export async function syncPendingChanges() {
  if (!offlineDb || !navigator.onLine) return
  
  const tx = offlineDb.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const changes = await store.getAll()
  
  for (const change of changes) {
    try {
      await store.delete(change.id)
    } catch (err) {
      console.error('Failed to sync change:', err)
    }
  }
}

export function isOnline() {
  return navigator.onLine
}
