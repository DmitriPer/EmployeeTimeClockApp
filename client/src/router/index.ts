import { createRouter, createWebHistory } from 'vue-router';
import { requireAuth, requireRole } from './guards.js';
import { UserRole } from '@app/shared';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('../views/ForbiddenView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      beforeEnter: requireAuth,
    },
    {
      path: '/manager',
      beforeEnter: [requireAuth, requireRole([UserRole.MANAGER, UserRole.ADMIN])],
      children: [],
    },
    {
      path: '/admin',
      beforeEnter: [requireAuth, requireRole([UserRole.ADMIN])],
      children: [],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});
