import { ref, computed } from 'vue'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { getDb } from './firebase'

const notes = ref([])
const isLoading = ref(true)
const syncStatus = ref('synced')

let unsubscribe = null
// Default collection name (no PIN required)
const DEFAULT_COLLECTION = 'default'
let currentPin = DEFAULT_COLLECTION

// Migrate old note format to new block-based format
export function migrateNote(note) {
  // Already has blocks array - no migration needed
  if (note.blocks && Array.isArray(note.blocks)) {
    return note
  }

  const blocks = []

  // Migrate old content string to text block
  if (note.content && typeof note.content === 'string' && note.content.trim()) {
    blocks.push({
      id: `text-${Date.now()}`,
      type: 'text',
      content: note.content
    })
  }

  // Migrate old checklist array to checklist block
  if (note.checklist && Array.isArray(note.checklist) && note.checklist.length > 0) {
    blocks.push({
      id: `checklist-${Date.now()}`,
      type: 'checklist',
      items: note.checklist.map(item => ({
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: item.text || '',
        checked: item.checked || false,
        priority: item.priority || 'none'
      }))
    })
  }

  return {
    ...note,
    blocks,
    // Keep old fields for backward compatibility during transition
    content: note.content || '',
    checklist: note.checklist || []
  }
}

// Generate unique block ID
export function generateBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Generate unique item ID
export function generateItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function useNotes() {
  const sortedNotes = computed(() => {
    return [...notes.value].sort((a, b) => {
      // Handle Firestore Timestamp objects, regular timestamps, and pending serverTimestamp
      const getTime = (note) => {
        if (!note.updatedAt) return 0
        // Firestore Timestamp object
        if (typeof note.updatedAt.toMillis === 'function') {
          return note.updatedAt.toMillis()
        }
        // Firestore pending write (serverTimestamp not yet confirmed)
        if (note.updatedAt.seconds !== undefined) {
          return note.updatedAt.seconds * 1000
        }
        // Regular number/Date
        return note.updatedAt
      }

      const aTime = getTime(a)
      const bTime = getTime(b)

      // If times are equal (or both 0), maintain stable order by id
      if (aTime === bTime) {
        return (a.id || '').localeCompare(b.id || '')
      }

      return bTime - aTime
    })
  })

  return {
    notes: sortedNotes,
    isLoading,
    syncStatus
  }
}

export function setPin(pin) {
  currentPin = pin
}

export function getPin() {
  return currentPin
}

function getNotesCollection() {
  const db = getDb()
  if (!db || !currentPin) return null
  return collection(db, `pins/${currentPin}/notes`)
}

export function subscribeToNotes() {
  const notesCol = getNotesCollection()
  if (!notesCol) return

  isLoading.value = true
  
  const q = query(notesCol, orderBy('updatedAt', 'desc'))
  
  unsubscribe = onSnapshot(q, 
    (snapshot) => {
      notes.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      isLoading.value = false
      syncStatus.value = 'synced'
    },
    (error) => {
      console.error('Snapshot error:', error)
      isLoading.value = false
      syncStatus.value = 'offline'
    }
  )
}

export function unsubscribeFromNotes() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

export async function createNote(title, blocks = []) {
  const notesCol = getNotesCollection()
  if (!notesCol) return null

  syncStatus.value = 'syncing'

  try {
    const docRef = await addDoc(notesCol, {
      title,
      blocks,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    syncStatus.value = 'synced'
    return docRef.id
  } catch (err) {
    console.error('Error creating note:', err)
    syncStatus.value = 'offline'
    return null
  }
}

export async function updateNote(id, updates) {
  const notesCol = getNotesCollection()
  if (!notesCol) return false

  syncStatus.value = 'syncing'
  
  try {
    const noteRef = doc(notesCol, id)
    await updateDoc(noteRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
    syncStatus.value = 'synced'
    return true
  } catch (err) {
    console.error('Error updating note:', err)
    syncStatus.value = 'offline'
    return false
  }
}

export async function deleteNote(id) {
  const notesCol = getNotesCollection()
  if (!notesCol) return false

  syncStatus.value = 'syncing'
  
  try {
    const noteRef = doc(notesCol, id)
    await deleteDoc(noteRef)
    syncStatus.value = 'synced'
    return true
  } catch (err) {
    console.error('Error deleting note:', err)
    syncStatus.value = 'offline'
    return false
  }
}

export function getNoteById(id) {
  return notes.value.find(n => n.id === id)
}
