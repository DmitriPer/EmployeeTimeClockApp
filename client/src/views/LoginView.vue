<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { ErrorCode } from '@app/shared';
import { loginUser } from '../api/auth.js';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const employeeId = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleSubmit(): Promise<void> {
  errorMessage.value = '';
  isLoading.value = true;

  try {
    const result = await loginUser(employeeId.value, password.value);
    authStore.setUser(result.user, result.accessToken);
    router.push('/');
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const code = err.response.data?.error?.code;
      if (code === ErrorCode.AUTH_ACCOUNT_DISABLED) {
        errorMessage.value = 'This account has been disabled';
      } else {
        errorMessage.value = 'Invalid Employee ID or password';
      }
    } else {
      errorMessage.value = 'Invalid Employee ID or password';
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow">
      <h1 class="mb-6 text-center text-2xl font-semibold text-gray-800">
        Employee Time Clock
      </h1>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="mb-4">
          <label for="employeeId" class="mb-1 block text-sm font-medium text-gray-700">
            Employee ID
          </label>
          <input
            id="employeeId"
            v-model="employeeId"
            type="text"
            autocomplete="username"
            required
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div class="mb-6">
          <label for="password" class="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <p v-if="errorMessage" role="alert" class="mb-4 text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>
