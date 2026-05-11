import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserRole } from '@app/shared';

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref<boolean>(false);
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(null);

  function setUser(newUser: AuthUser, token: string): void {
    user.value = newUser;
    accessToken.value = token;
    isAuthenticated.value = true;
  }

  function setAccessToken(token: string): void {
    accessToken.value = token;
  }

  function clear(): void {
    user.value = null;
    accessToken.value = null;
    isAuthenticated.value = false;
  }

  return { isAuthenticated, user, accessToken, setUser, setAccessToken, clear };
});
