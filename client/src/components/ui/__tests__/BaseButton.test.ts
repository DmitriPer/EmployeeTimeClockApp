import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseButton from '../BaseButton.vue';

import type { ButtonVariant, ButtonSize } from '../types.js';

function btn(props: { variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit' | 'reset' } = {}) {
  return mount(BaseButton, { props, slots: { default: 'Click me' } });
}

describe('BaseButton', () => {
  it('renders slot content', () => {
    expect(btn().text()).toContain('Click me');
  });

  it('applies primary variant classes by default', () => {
    const w = btn();
    expect(w.classes()).toContain('bg-blue-600');
    expect(w.classes()).toContain('text-white');
  });

  it('applies danger variant classes', () => {
    const w = btn({ variant: 'danger' });
    expect(w.classes()).toContain('bg-red-600');
  });

  it('applies success variant classes', () => {
    const w = btn({ variant: 'success' });
    expect(w.classes()).toContain('bg-green-600');
  });

  it('applies ghost variant classes', () => {
    const w = btn({ variant: 'ghost' });
    expect(w.classes()).toContain('text-gray-400');
  });

  it('applies sm size classes', () => {
    const w = btn({ size: 'sm' });
    expect(w.classes()).toContain('px-2.5');
    expect(w.classes()).toContain('text-xs');
  });

  it('applies lg size classes', () => {
    const w = btn({ size: 'lg' });
    expect(w.classes()).toContain('px-4');
    expect(w.classes()).toContain('font-medium');
  });

  it('is disabled when disabled prop is true', () => {
    const w = btn({ disabled: true });
    expect((w.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled when loading prop is true', () => {
    const w = btn({ loading: true });
    expect((w.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows spinner when loading', () => {
    const w = btn({ loading: true });
    expect(w.find('span.animate-spin').exists()).toBe(true);
  });

  it('does not show spinner when not loading', () => {
    const w = btn();
    expect(w.find('span.animate-spin').exists()).toBe(false);
  });

  it('uses button type by default', () => {
    const w = btn();
    expect((w.element as HTMLButtonElement).type).toBe('button');
  });
});
