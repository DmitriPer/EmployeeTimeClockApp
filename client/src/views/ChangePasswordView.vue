<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { changeOwnPassword } from '../api/users.js';
import { useAuthStore } from '../stores/auth.js';
import PasswordInput from '../components/PasswordInput.vue';

const router = useRouter();
const authStore = useAuthStore();

const form = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
const loading = ref(false);
const error = ref<string | null>(null);

async function submit(): Promise<void> {
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = 'New passwords do not match.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    await changeOwnPassword(form.value.currentPassword, form.value.newPassword);
    authStore.clear();
    router.push('/login');
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message;
    error.value = msg ?? 'Failed to change password.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-sm space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Change Password</h1>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="rounded border border-gray-200 bg-white p-5 space-y-3">
      <label class="flex flex-col gap-1 text-xs text-gray-600">
        Current Password
        <PasswordInput v-model="form.currentPassword" autocomplete="current-password" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
      </label>
      <label class="flex flex-col gap-1 text-xs text-gray-600">
        New Password
        <PasswordInput v-model="form.newPassword" autocomplete="new-password" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
      </label>
      <label class="flex flex-col gap-1 text-xs text-gray-600">
        Confirm New Password
        <PasswordInput v-model="form.confirmPassword" autocomplete="new-password" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
      </label>
      <div class="pt-1">
        <button
          @click="submit"
          :disabled="loading"
          class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ loading ? 'Saving…' : 'Change Password' }}
        </button>
      </div>
    </div>

    <p class="text-xs text-gray-400">You will be logged out after changing your password.</p>
  </div>
</template>
