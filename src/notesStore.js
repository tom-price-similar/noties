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
let currentPin = null

export function useNotes() {
  const sortedNotes = computed(() => {
    return [...notes.value].sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || a.updatedAt || 0
      const bTime = b.updatedAt?.toMillis?.() || b.updatedAt || 0
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

export async function createNote(title, content = '', checklist = []) {
  const notesCol = getNotesCollection()
  if (!notesCol) return null

  syncStatus.value = 'syncing'

  try {
    const docRef = await addDoc(notesCol, {
      title,
      content,
      checklist,
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
