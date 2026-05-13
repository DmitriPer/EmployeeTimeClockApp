import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AsyncSection from '../AsyncSection.vue';

function section(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return mount(AsyncSection, { props: { loading: false, error: null, ...props }, slots });
}

describe('AsyncSection', () => {
  it('shows loading text when loading is true', () => {
    const w = section({ loading: true });
    expect(w.text()).toContain('Loading…');
  });

  it('shows custom loading text', () => {
    const w = section({ loading: true, loadingText: 'Fetching data…' });
    expect(w.text()).toContain('Fetching data…');
  });

  it('shows error message when error is set', () => {
    const w = section({ error: 'Failed to load' });
    expect(w.text()).toContain('Failed to load');
    expect(w.find('.bg-red-50').exists()).toBe(true);
  });

  it('shows empty text when empty is true', () => {
    const w = section({ empty: true });
    expect(w.text()).toContain('No results.');
  });

  it('shows custom empty text', () => {
    const w = section({ empty: true, emptyText: 'No entries this month.' });
    expect(w.text()).toContain('No entries this month.');
  });

  it('renders slot content when not loading, no error, not empty', () => {
    const w = section({}, { default: '<p class="content">data here</p>' });
    expect(w.find('.content').exists()).toBe(true);
  });

  it('does not render slot when loading', () => {
    const w = section({ loading: true }, { default: '<p class="content">data</p>' });
    expect(w.find('.content').exists()).toBe(false);
  });

  it('does not render slot when error is set', () => {
    const w = section({ error: 'oops' }, { default: '<p class="content">data</p>' });
    expect(w.find('.content').exists()).toBe(false);
  });

  it('error takes priority over loading', () => {
    const w = section({ loading: true, error: 'oops' });
    expect(w.find('.bg-red-50').exists()).toBe(true);
    expect(w.text()).not.toContain('Loading');
  });
});
