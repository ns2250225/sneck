import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './pages/Home.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/modes', name: 'modes', component: () => import('./pages/Modes.vue') },
    { path: '/game/:mode', name: 'game', component: () => import('./pages/Game.vue') },
    { path: '/settings', name: 'settings', component: () => import('./pages/Settings.vue') },
    { path: '/achievements', name: 'achievements', component: () => import('./pages/Achievements.vue') },
    { path: '/stats', name: 'stats', component: () => import('./pages/Statistics.vue') },
    { path: '/skins', name: 'skins', component: () => import('./pages/Skins.vue') },
    { path: '/help', name: 'help', component: () => import('./pages/Help.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
