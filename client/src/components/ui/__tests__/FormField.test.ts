import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import FormField from '../FormField.vue';

describe('FormField', () => {
  it('renders label text', () => {
    const w = mount(FormField, { props: { label: 'Employee ID' } });
    expect(w.find('label').text()).toContain('Employee ID');
  });

  it('renders asterisk when required', () => {
    const w = mount(FormField, { props: { label: 'Name', required: true } });
    expect(w.find('label').text()).toContain('*');
  });

  it('does not render asterisk when not required', () => {
    const w = mount(FormField, { props: { label: 'Name', required: false } });
    expect(w.find('span[aria-hidden]').exists()).toBe(false);
  });

  it('renders hint text when hint prop provided', () => {
    const w = mount(FormField, { props: { label: 'Name', hint: 'Your full name' } });
    expect(w.text()).toContain('Your full name');
  });

  it('renders error text when error prop provided', () => {
    const w = mount(FormField, { props: { label: 'Name', error: 'Required field' } });
    expect(w.text()).toContain('Required field');
  });

  it('does not render hint element when no hint', () => {
    const w = mount(FormField, { props: { label: 'Name' } });
    const paras = w.findAll('p');
    expect(paras.every((p) => !p.text().includes('hint'))).toBe(true);
  });

  it('label for matches slot id', () => {
    const w = mount(FormField, {
      props: { label: 'Email' },
      slots: {
        default: (slotProps: { id: string }) => [h('input', { id: slotProps.id, type: 'email' })],
      },
    });
    const labelFor = w.find('label').attributes('for');
    const inputId = w.find('input').attributes('id');
    expect(labelFor).toBe(inputId);
    expect(labelFor).toBeTruthy();
  });

  it('error paragraph has an id (for aria-describedby wiring)', () => {
    const w = mount(FormField, { props: { label: 'Email', error: 'Invalid email' } });
    const errorEl = w.find('p.text-red-600');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.attributes('id')).toBeTruthy();
  });
});
