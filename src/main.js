import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import PinScreen from './components/PinScreen.vue'
import NotesList from './components/NotesList.vue'
import NoteEditor from './components/NoteEditor.vue'
import './style.css'

const routes = [
  { path: '/', component: PinScreen },
  { path: '/notes', component: NotesList },
  { path: '/note/:id?', component: NoteEditor }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = sessionStorage.getItem('noties-authenticated')
  if (to.path !== '/' && !isAuthenticated) {
    next('/')
  } else if (to.path === '/' && isAuthenticated) {
    next('/notes')
  } else {
    next()
  }
})

createApp(App).use(router).mount('#app')
