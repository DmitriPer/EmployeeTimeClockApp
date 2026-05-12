import axios from 'axios';
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { UserRole } from '@app/shared';

let authInitialized = false;
let initPromise: Promise<void> | null = null;

async function doInitAuth(): Promise<void> {
  try {
    const { data: refreshData } = await axios.post<{ success: boolean; data: { accessToken: string } }>(
      '/api/auth/refresh',
      {},
      { withCredentials: true },
    );
    const token = refreshData.data?.accessToken;
    if (!token) return;

    const { data: meData } = await axios.get<{
      success: boolean;
      data: { id: number; name: string; role: UserRole };
    }>('/api/users/me', {
      withCredentials: true,
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile = meData.data;
    useAuthStore().setUser({ id: profile.id, name: profile.name, role: profile.role }, token);
  } catch {
    // Not authenticated — proceed as guest
  }
}

export async function initAuth(): Promise<void> {
  if (authInitialized) return;
  if (!initPromise) {
    initPromise = doInitAuth().finally(() => {
      authInitialized = true;
    });
  }
  return initPromise;
}

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
