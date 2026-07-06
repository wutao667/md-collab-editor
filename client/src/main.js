import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Login from './views/Login.vue'
import FileList from './views/FileList.vue'
import Editor from './views/Editor.vue'

const routes = [
  { path: '/login', name: 'login', component: Login },
  { path: '/', name: 'files', component: FileList, meta: { requiresAuth: true } },
  { path: '/edit/:path(.*)', name: 'editor', component: Editor, props: true, meta: { requiresAuth: true } },
  { path: '/s/:token', name: 'share-editor', component: Editor, props: true, meta: { noAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard: redirect to login if not authenticated
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('md_collab_token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
