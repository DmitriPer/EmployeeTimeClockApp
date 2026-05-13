import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { UserRole } from '@app/shared';
import AppLayout from '../AppLayout.vue';
import { useAuthStore } from '../../stores/auth.js';

vi.mock('../../api/auth.js', () => ({
  logoutUser: vi.fn().mockResolvedValue(undefined),
}));

const routes = [
  { path: '/', component: { template: '<div />' } },
  { path: '/history', component: { template: '<div />' } },
  { path: '/manager/approvals', component: { template: '<div />' } },
  { path: '/manager/history', component: { template: '<div />' } },
  { path: '/change-password', component: { template: '<div />' } },
  { path: '/admin/users', component: { template: '<div />' } },
];

function mountLayout(role: UserRole) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({ history: createMemoryHistory(), routes });
  const store = useAuthStore(pinia);
  store.setUser({ id: 1, name: 'Test User', role }, 'token');
  const wrapper = mount(AppLayout, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
  return { wrapper, router };
}

function navItems(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('nav li');
}

function isDrawerOpen(wrapper: ReturnType<typeof mount>) {
  // nav gets aria-hidden="true" when drawer is closed; attribute absent when open
  return !wrapper.find('nav').attributes('aria-hidden');
}

describe('AppLayout', () => {
  it('employee sees 3 nav items', () => {
    const { wrapper } = mountLayout(UserRole.EMPLOYEE);
    expect(navItems(wrapper)).toHaveLength(3);
  });

  it('manager sees 5 nav items', () => {
    const { wrapper } = mountLayout(UserRole.MANAGER);
    expect(navItems(wrapper)).toHaveLength(5);
  });

  it('admin sees 6 nav items', () => {
    const { wrapper } = mountLayout(UserRole.ADMIN);
    expect(navItems(wrapper)).toHaveLength(6);
  });

  it('hamburger button opens the drawer', async () => {
    const { wrapper } = mountLayout(UserRole.EMPLOYEE);
    expect(isDrawerOpen(wrapper)).toBe(false);
    await wrapper.find('button[aria-label="Open navigation"]').trigger('click');
    expect(isDrawerOpen(wrapper)).toBe(true);
  });

  it('backdrop click closes the drawer', async () => {
    const { wrapper } = mountLayout(UserRole.EMPLOYEE);
    await wrapper.find('button[aria-label="Open navigation"]').trigger('click');
    expect(isDrawerOpen(wrapper)).toBe(true);
    await wrapper.find('[aria-hidden="true"]').trigger('click');
    expect(isDrawerOpen(wrapper)).toBe(false);
  });

  it('close-X button closes the drawer', async () => {
    const { wrapper } = mountLayout(UserRole.EMPLOYEE);
    await wrapper.find('button[aria-label="Open navigation"]').trigger('click');
    expect(isDrawerOpen(wrapper)).toBe(true);
    await wrapper.find('button[aria-label="Close navigation"]').trigger('click');
    expect(isDrawerOpen(wrapper)).toBe(false);
  });

  it('route change closes the drawer', async () => {
    const { wrapper, router } = mountLayout(UserRole.EMPLOYEE);
    await wrapper.find('button[aria-label="Open navigation"]').trigger('click');
    expect(isDrawerOpen(wrapper)).toBe(true);
    await router.push('/history');
    await nextTick();
    expect(isDrawerOpen(wrapper)).toBe(false);
  });
});
