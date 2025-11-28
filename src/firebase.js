import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBYMBho5w0-63rAhxCAwVCyxgMNOosYqaw",
  authDomain: "noties-56e25.firebaseapp.com",
  projectId: "noties-56e25",
  storageBucket: "noties-56e25.firebasestorage.app",
  messagingSenderId: "247056707412",
  appId: "1:247056707412:web:005b5c4a5eec24f1d622c1"
}

let app = null
let db = null

export async function initFirebase() {
  if (app) return { app, db }
  
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  
  try {
    await enableIndexedDbPersistence(db)
    console.log('Offline persistence enabled')
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence only works in one tab')
    } else if (err.code === 'unimplemented') {
      console.warn('Browser does not support offline persistence')
    }
  }
  
  return { app, db }
}

export function getDb() {
  return db
}

export function getApp() {
  return app
}
