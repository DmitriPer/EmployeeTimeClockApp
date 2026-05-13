<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { changeOwnPassword } from '../api/users.js';
import { useAuthStore } from '../stores/auth.js';
import PasswordInput from '../components/PasswordInput.vue';
import FormField from '../components/ui/FormField.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import { useAsyncData } from '../composables/useAsyncData.js';

const router = useRouter();
const authStore = useAuthStore();

const form = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
const { loading, error, run: runSubmit } = useAsyncData<void>();

async function submit(): Promise<void> {
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = 'New passwords do not match.';
    return;
  }
  await runSubmit(async () => {
    await changeOwnPassword(form.value.currentPassword, form.value.newPassword);
    authStore.clear();
    router.push('/login');
  }, 'Failed to change password.');
}
</script>

<template>
  <div class="max-w-sm space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Change Password</h1>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="rounded border border-gray-200 bg-white p-5 space-y-3">
      <FormField label="Current Password" v-slot="{ id }">
        <PasswordInput :id="id" v-model="form.currentPassword" autocomplete="current-password" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
      </FormField>
      <FormField label="New Password" v-slot="{ id }">
        <PasswordInput :id="id" v-model="form.newPassword" autocomplete="new-password" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
      </FormField>
      <FormField label="Confirm New Password" v-slot="{ id }">
        <PasswordInput :id="id" v-model="form.confirmPassword" autocomplete="new-password" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
      </FormField>
      <div class="pt-1">
        <BaseButton @click="submit" :loading="loading">
          {{ loading ? 'Saving…' : 'Change Password' }}
        </BaseButton>
      </div>
    </div>

    <p class="text-xs text-gray-400">You will be logged out after changing your password.</p>
  </div>
</template>
