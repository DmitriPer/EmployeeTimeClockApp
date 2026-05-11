<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { UserRole } from '@app/shared';
import { useAuthStore } from '../stores/auth.js';
import { logoutUser } from '../api/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const isManagerOrAdmin = computed(
  () => authStore.user?.role === UserRole.MANAGER || authStore.user?.role === UserRole.ADMIN,
);
const isAdmin = computed(() => authStore.user?.role === UserRole.ADMIN);

async function handleLogout(): Promise<void> {
  try {
    await logoutUser();
  } finally {
    authStore.clear();
    router.push('/login');
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <nav class="w-56 shrink-0 bg-white shadow-sm">
      <div class="px-4 py-5">
        <span class="text-sm font-semibold text-gray-800">Time Clock</span>
      </div>

      <ul class="space-y-1 px-2 pb-4">
        <li>
          <RouterLink
            to="/"
            class="flex items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            active-class="bg-blue-50 text-blue-600 font-medium"
            exact-active-class=""
          >
            Clock
          </RouterLink>
        </li>

        <li>
          <RouterLink
            to="/history"
            class="flex items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            active-class="bg-blue-50 text-blue-600 font-medium"
          >
            My History
          </RouterLink>
        </li>

        <template v-if="isManagerOrAdmin">
          <li>
            <RouterLink
              to="/manager/overtime"
              class="flex items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              active-class="bg-blue-50 text-blue-600 font-medium"
            >
              Overtime Queue
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/manager/flagged"
              class="flex items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              active-class="bg-blue-50 text-blue-600 font-medium"
            >
              Flagged Sessions
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/manager/history"
              class="flex items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              active-class="bg-blue-50 text-blue-600 font-medium"
            >
              Employee History
            </RouterLink>
          </li>
        </template>

        <li v-if="isAdmin">
          <RouterLink
            to="/admin/users"
            class="flex items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            active-class="bg-blue-50 text-blue-600 font-medium"
          >
            User Management
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Main area -->
    <div class="flex flex-1 flex-col">
      <header class="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
        <span class="text-sm text-gray-500">{{ authStore.user?.name }}</span>
        <button
          @click="handleLogout"
          class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
        >
          Logout
        </button>
      </header>

      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
