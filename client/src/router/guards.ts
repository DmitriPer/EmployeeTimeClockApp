import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { UserRole } from '@app/shared';

export function requireAuth(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  const authStore = useAuthStore();
  if (!authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
}

export function requireRole(
  roles: UserRole[],
): (_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => void {
  return (
    _to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): void => {
    const authStore = useAuthStore();
    if (!authStore.user || !roles.includes(authStore.user.role)) {
      next('/403');
    } else {
      next();
    }
  };
}
