<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { UserRole } from '@app/shared';
import { useAuthStore } from '../../stores/auth.js';
import PasswordInput from '../../components/PasswordInput.vue';
import {
  fetchUsers,
  createUser,
  updateUser,
  deactivateUser,
  resetUserPassword,
  type UserSummary,
  type CreateUserPayload,
} from '../../api/users.js';

const authStore = useAuthStore();

const users = ref<UserSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

type Mode = 'list' | 'create' | 'edit' | 'reset';
const mode = ref<Mode>('list');
const editingUser = ref<UserSummary | null>(null);
const resettingUser = ref<UserSummary | null>(null);
const resetForm = ref({ newPassword: '', confirmPassword: '' });

const form = ref<CreateUserPayload>({
  employeeId: '',
  name: '',
  email: '',
  password: '',
  role: UserRole.EMPLOYEE,
});

const editForm = ref({ name: '', email: '', role: UserRole.EMPLOYEE as UserRole });
const lastSuggestedId = ref('');

onMounted(async () => {
  await loadUsers();
});

async function loadUsers(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    users.value = await fetchUsers();
  } catch {
    error.value = 'Failed to load users.';
  } finally {
    loading.value = false;
  }
}

function suggestNextId(role: UserRole): string {
  const prefix = role === UserRole.EMPLOYEE ? 'EMP' : role === UserRole.MANAGER ? 'MGR' : 'ADMIN';
  const nums = users.value
    .filter((u) => u.employeeId.startsWith(prefix))
    .map((u) => parseInt(u.employeeId.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function startCreate(): void {
  const suggested = suggestNextId(UserRole.EMPLOYEE);
  lastSuggestedId.value = suggested;
  form.value = { employeeId: suggested, name: '', email: '', password: '', role: UserRole.EMPLOYEE };
  mode.value = 'create';
  error.value = null;
}

watch(
  () => form.value.role,
  (newRole) => {
    if (!form.value.employeeId || form.value.employeeId === lastSuggestedId.value) {
      lastSuggestedId.value = suggestNextId(newRole);
      form.value.employeeId = lastSuggestedId.value;
    }
  },
);

function startEdit(u: UserSummary): void {
  editingUser.value = u;
  editForm.value = { name: u.name, email: u.email, role: u.role };
  mode.value = 'edit';
  error.value = null;
}

async function submitCreate(): Promise<void> {
  error.value = null;
  try {
    await createUser(form.value);
    await loadUsers();
    mode.value = 'list';
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message;
    error.value = msg ?? 'Failed to create user.';
  }
}

async function submitEdit(): Promise<void> {
  if (!editingUser.value) return;
  error.value = null;
  try {
    await updateUser(editingUser.value.id, editForm.value);
    await loadUsers();
    mode.value = 'list';
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message;
    error.value = msg ?? 'Failed to update user.';
  }
}

async function handleDeactivate(u: UserSummary): Promise<void> {
  if (!confirm(`Deactivate ${u.name}? Their session will be invalidated immediately.`)) return;
  error.value = null;
  try {
    await deactivateUser(u.id);
    await loadUsers();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message;
    error.value = msg ?? 'Failed to deactivate user.';
  }
}

function startReset(u: UserSummary): void {
  resettingUser.value = u;
  resetForm.value = { newPassword: '', confirmPassword: '' };
  mode.value = 'reset';
  error.value = null;
}

async function submitReset(): Promise<void> {
  if (resetForm.value.newPassword !== resetForm.value.confirmPassword) {
    error.value = 'Passwords do not match.';
    return;
  }
  if (!resettingUser.value) return;
  error.value = null;
  try {
    await resetUserPassword(resettingUser.value.id, resetForm.value.newPassword);
    mode.value = 'list';
  } catch {
    error.value = 'Failed to reset password.';
  }
}

const ROLES = [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN];
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-base font-semibold text-gray-800">User Management</h1>
      <button
        v-if="mode === 'list'"
        @click="startCreate"
        class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        + New User
      </button>
    </div>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Create form -->
    <div v-if="mode === 'create'" class="rounded border border-gray-200 bg-white p-5 space-y-3">
      <h2 class="text-sm font-medium text-gray-700">New User</h2>
      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Employee ID
          <input v-model="form.employeeId" type="text" class="rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Full Name
          <input v-model="form.name" type="text" class="rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Email
          <input v-model="form.email" type="email" class="rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Password
          <PasswordInput v-model="form.password" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Role
          <select v-model="form.role" class="rounded border border-gray-300 px-2 py-1.5 text-sm">
            <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
      </div>
      <div class="flex gap-2 pt-1">
        <button @click="submitCreate" class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">Create</button>
        <button @click="mode = 'list'" class="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
    </div>

    <!-- Edit form -->
    <div v-if="mode === 'edit'" class="rounded border border-gray-200 bg-white p-5 space-y-3">
      <h2 class="text-sm font-medium text-gray-700">Edit — {{ editingUser?.name }}</h2>
      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Full Name
          <input v-model="editForm.name" type="text" class="rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Email
          <input v-model="editForm.email" type="email" class="rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Role
          <select v-model="editForm.role" class="rounded border border-gray-300 px-2 py-1.5 text-sm">
            <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
      </div>
      <div class="flex gap-2 pt-1">
        <button @click="submitEdit" class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">Save</button>
        <button @click="mode = 'list'" class="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
    </div>

    <!-- Reset password form -->
    <div v-if="mode === 'reset'" class="rounded border border-gray-200 bg-white p-5 space-y-3">
      <h2 class="text-sm font-medium text-gray-700">Reset Password — {{ resettingUser?.name }}</h2>
      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          New Password
          <PasswordInput v-model="resetForm.newPassword" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-600">
          Confirm Password
          <PasswordInput v-model="resetForm.confirmPassword" input-class="w-full rounded border border-gray-300 px-2 py-1.5 pr-10 text-sm" />
        </label>
      </div>
      <div class="flex gap-2 pt-1">
        <button @click="submitReset" class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">Reset</button>
        <button @click="mode = 'list'" class="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
    </div>

    <!-- Users table -->
    <div v-if="mode === 'list'" class="overflow-x-auto rounded border border-gray-200">
      <div v-if="loading" class="p-4 text-sm text-gray-400">Loading…</div>
      <table v-else class="min-w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-4 py-2">Employee ID</th>
            <th class="px-4 py-2">Name</th>
            <th class="px-4 py-2">Email</th>
            <th class="px-4 py-2">Role</th>
            <th class="px-4 py-2">Status</th>
            <th class="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50">
            <td class="px-4 py-2 font-mono text-xs text-gray-700">{{ u.employeeId }}</td>
            <td class="px-4 py-2 text-gray-800">{{ u.name }}</td>
            <td class="px-4 py-2 text-gray-500">{{ u.email }}</td>
            <td class="px-4 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs"
                :class="{
                  'bg-gray-100 text-gray-600': u.role === UserRole.EMPLOYEE,
                  'bg-blue-100 text-blue-700': u.role === UserRole.MANAGER,
                  'bg-purple-100 text-purple-700': u.role === UserRole.ADMIN,
                }">
                {{ u.role }}
              </span>
            </td>
            <td class="px-4 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs"
                :class="u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'">
                {{ u.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-4 py-2">
              <div class="flex gap-3">
                <button @click="startEdit(u)" class="text-xs text-blue-600 hover:underline">Edit</button>
                <button v-if="u.id !== authStore.user?.id" @click="startReset(u)" class="text-xs text-gray-500 hover:underline">Reset pwd</button>
                <button
                  v-if="u.isActive"
                  @click="handleDeactivate(u)"
                  class="text-xs text-red-500 hover:underline"
                >
                  Deactivate
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
