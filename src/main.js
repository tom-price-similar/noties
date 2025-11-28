import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import NotesList from './components/NotesList.vue'
import NoteEditor from './components/NoteEditor.vue'
import DayPlanner from './components/DayPlanner.vue'
import './style.css'

const routes = [
  { path: '/', redirect: '/notes' },
  { path: '/notes', component: NotesList },
  { path: '/note/:id?', component: NoteEditor },
  { path: '/planner', component: DayPlanner }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

createApp(App).use(router).mount('#app')
