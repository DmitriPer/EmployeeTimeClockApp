import { createRouter, createWebHistory, RouterView } from 'vue-router';
import { initAuth, requireAuth, requireRole } from './guards.js';
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
      component: () => import('../components/AppLayout.vue'),
      beforeEnter: requireAuth,
      children: [
        {
          path: '',
          name: 'clock',
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('../views/HistoryView.vue'),
        },
        {
          path: 'change-password',
          name: 'change-password',
          component: () => import('../views/ChangePasswordView.vue'),
        },
        {
          path: 'manager',
          component: RouterView,
          beforeEnter: requireRole([UserRole.MANAGER, UserRole.ADMIN]),
          children: [
            {
              path: 'approvals',
              name: 'manager-approvals',
              component: () => import('../views/manager/ManagerApprovalsView.vue'),
            },
            {
              path: 'overtime',
              redirect: { name: 'manager-approvals' },
            },
            {
              path: 'flagged',
              redirect: { name: 'manager-approvals' },
            },
            {
              path: 'corrections',
              redirect: { name: 'manager-approvals' },
            },
            {
              path: 'history',
              name: 'manager-history',
              component: () => import('../views/manager/ManagerHistoryView.vue'),
            },
          ],
        },
        {
          path: 'admin',
          component: RouterView,
          beforeEnter: requireRole([UserRole.ADMIN]),
          children: [
            {
              path: 'users',
              name: 'admin-users',
              component: () => import('../views/admin/UserManagementView.vue'),
            },
          ],
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach(async (_to, _from, next) => {
  await initAuth();
  next();
});
