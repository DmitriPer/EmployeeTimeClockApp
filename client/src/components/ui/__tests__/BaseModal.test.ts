import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseModal from '../BaseModal.vue';

afterEach(() => {
  document.body.style.overflow = '';
  document.body.innerHTML = '';
});

function mountModal(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(BaseModal, {
    props: { open: true, title: 'Test Modal', ...props },
    slots,
    attachTo: document.body,
  });
}

// Teleport renders into document.body, not the wrapper's subtree.
function dialog() {
  return document.body.querySelector('[role="dialog"]');
}

describe('BaseModal', () => {
  it('renders title and subtitle in header', () => {
    mountModal({ subtitle: 'Sub text' });
    expect(dialog()!.querySelector('h2')!.textContent).toBe('Test Modal');
    expect(dialog()!.querySelector('p')!.textContent).toBe('Sub text');
  });

  it('does not render when open is false', () => {
    mountModal({ open: false });
    expect(dialog()).toBeNull();
  });

  it('renders when open is true', () => {
    mountModal({ open: true });
    expect(dialog()).not.toBeNull();
  });

  it('emits close and update:open=false on Esc key', async () => {
    const wrapper = mountModal();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
  });

  it('closes on backdrop click when closeOnBackdrop is true', async () => {
    const wrapper = mountModal({ closeOnBackdrop: true });
    (dialog() as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not close on backdrop click when closeOnBackdrop is false', async () => {
    const wrapper = mountModal({ closeOnBackdrop: false });
    (dialog() as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeFalsy();
  });

  it('locks body scroll when open', () => {
    mountModal({ open: true });
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('releases body scroll when closed', async () => {
    const wrapper = mountModal({ open: true });
    expect(document.body.style.overflow).toBe('hidden');
    await wrapper.setProps({ open: false });
    expect(document.body.style.overflow).toBe('');
  });

  it('renders footer slot content', () => {
    mountModal({}, { footer: '<button data-testid="footer-btn">OK</button>' });
    expect(document.body.querySelector('[data-testid="footer-btn"]')).not.toBeNull();
  });
});
