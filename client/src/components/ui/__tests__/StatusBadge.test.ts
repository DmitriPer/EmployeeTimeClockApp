import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusBadge from '../StatusBadge.vue';

import type { StatusVariant, StatusTone } from '../types.js';

function badge(props: { variant: StatusVariant; label?: string; tone?: StatusTone }) {
  return mount(StatusBadge, { props });
}

describe('StatusBadge', () => {
  it('renders "Pending" label for pending variant', () => {
    expect(badge({ variant: 'pending' }).text()).toBe('Pending');
  });

  it('renders "Approved" label for approved variant', () => {
    expect(badge({ variant: 'approved' }).text()).toBe('Approved');
  });

  it('renders "Rejected" label for rejected variant', () => {
    expect(badge({ variant: 'rejected' }).text()).toBe('Rejected');
  });

  it('renders "Break fixed" label for break-fixed variant', () => {
    expect(badge({ variant: 'break-fixed' }).text()).toBe('Break fixed');
  });

  it('applies yellow tone classes for pending', () => {
    const w = badge({ variant: 'pending' });
    expect(w.classes()).toContain('bg-yellow-100');
    expect(w.classes()).toContain('text-yellow-700');
  });

  it('applies green tone classes for approved', () => {
    const w = badge({ variant: 'approved' });
    expect(w.classes()).toContain('bg-green-100');
    expect(w.classes()).toContain('text-green-700');
  });

  it('applies teal tone classes for break-fixed', () => {
    const w = badge({ variant: 'break-fixed' });
    expect(w.classes()).toContain('bg-teal-100');
    expect(w.classes()).toContain('text-teal-700');
  });

  it('renders custom label and tone for custom variant', () => {
    const w = badge({ variant: 'custom', label: '+30m OT', tone: 'amber' });
    expect(w.text()).toBe('+30m OT');
    expect(w.classes()).toContain('bg-amber-100');
  });

  it('overrides preset label when label prop is provided', () => {
    const w = badge({ variant: 'pending', label: 'OT pending' });
    expect(w.text()).toBe('OT pending');
  });
});
