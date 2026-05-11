<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { logoutUser } from '../api/auth.js';

const router = useRouter();
const authStore = useAuthStore();

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
  <div class="min-h-screen bg-gray-50">
    <header class="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
      <span class="font-semibold text-gray-800">Employee Time Clock</span>
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-600">{{ authStore.user?.name }}</span>
        <button
          @click="handleLogout"
          class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
        >
          Logout
        </button>
      </div>
    </header>
    <main class="p-6">
      <p class="text-gray-500">Dashboard — implemented in Epic 3</p>
    </main>
  </div>
</template>
