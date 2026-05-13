<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { UserRole } from '@app/shared';
import { useAuthStore } from '../stores/auth.js';
import { logoutUser } from '../api/auth.js';
import BaseButton from './ui/BaseButton.vue';

interface NavItem {
  to: string;
  label: string;
  show: boolean;
}

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isManagerOrAdmin = computed(
  () => authStore.user?.role === UserRole.MANAGER || authStore.user?.role === UserRole.ADMIN,
);
const isAdmin = computed(() => authStore.user?.role === UserRole.ADMIN);

const navItems = computed<NavItem[]>(() => [
  { to: '/',                    label: 'Clock',            show: true },
  { to: '/history',             label: 'My History',       show: true },
  { to: '/manager/approvals',   label: 'Approvals',        show: isManagerOrAdmin.value },
  { to: '/manager/history',     label: 'Employee History', show: isManagerOrAdmin.value },
  { to: '/change-password',     label: 'Change Password',  show: true },
  { to: '/admin/users',         label: 'User Management',  show: isAdmin.value },
]);

const visibleNavItems = computed(() => navItems.value.filter((n) => n.show));

const drawerOpen = ref(false);
function openDrawer(): void { drawerOpen.value = true; }
function closeDrawer(): void { drawerOpen.value = false; }
watch(() => route.fullPath, closeDrawer);

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
    <!-- Backdrop (mobile only) -->
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-30 bg-black/40 md:hidden"
      aria-hidden="true"
      @click="closeDrawer"
    />

    <!-- Sidebar / Drawer -->
    <nav
      id="primary-nav"
      class="fixed inset-y-0 left-0 z-40 w-64 -translate-x-full bg-white shadow-sm transition-transform md:relative md:w-56 md:translate-x-0 md:shadow-sm"
      :class="{ 'translate-x-0': drawerOpen }"
      :aria-hidden="!drawerOpen ? true : undefined"
    >
      <div class="flex items-center justify-between px-4 py-5">
        <span class="text-sm font-semibold text-gray-800">Time Clock</span>
        <button
          class="md:hidden rounded p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Close navigation"
          @click="closeDrawer"
        >✕</button>
      </div>
      <ul class="space-y-1 px-2 pb-4">
        <li v-for="item in visibleNavItems" :key="item.to">
          <RouterLink
            :to="item.to"
            class="flex items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 min-h-[40px]"
            active-class="bg-blue-50 text-blue-600 font-medium"
            :exact-active-class="item.to === '/' ? '' : undefined"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Main area -->
    <div class="flex flex-1 flex-col min-w-0">
      <header class="flex items-center justify-between gap-2 bg-white px-4 py-3 shadow-sm sm:px-6">
        <button
          class="md:hidden rounded p-2 text-gray-600 hover:bg-gray-100 min-h-[40px] min-w-[40px]"
          aria-label="Open navigation"
          aria-controls="primary-nav"
          :aria-expanded="drawerOpen"
          @click="openDrawer"
        >
          <span class="block h-0.5 w-5 bg-current" />
          <span class="mt-1 block h-0.5 w-5 bg-current" />
          <span class="mt-1 block h-0.5 w-5 bg-current" />
        </button>
        <span class="truncate text-sm text-gray-500">{{ authStore.user?.name }}</span>
        <BaseButton variant="secondary" size="sm" @click="handleLogout">Logout</BaseButton>
      </header>

      <main class="flex-1 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
