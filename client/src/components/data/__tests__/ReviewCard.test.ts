import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ReviewCard from '../ReviewCard.vue';

function card(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(ReviewCard, { props: { title: 'Test Entry', ...props }, slots });
}

describe('ReviewCard', () => {
  it('renders the title', () => {
    expect(card().text()).toContain('Test Entry');
  });

  it('renders subtitle when provided', () => {
    const w = card({ subtitle: 'sub text' });
    expect(w.text()).toContain('sub text');
  });

  it('renders timestamp when provided', () => {
    const w = card({ timestamp: 'Jan 15' });
    expect(w.text()).toContain('Jan 15');
  });

  it('shows Review button when not reviewing', () => {
    const w = card({ reviewing: false });
    expect(w.find('button').text()).toBe('Review');
  });

  it('emits start-review when Review button is clicked', async () => {
    const w = card({ reviewing: false });
    await w.find('button').trigger('click');
    expect(w.emitted('start-review')).toBeTruthy();
  });

  it('shows Approve/Reject/Cancel buttons when reviewing', () => {
    const w = card({ reviewing: true });
    const texts = w.findAll('button').map((b) => b.text());
    expect(texts).toContain('Approve');
    expect(texts).toContain('Reject');
    expect(texts).toContain('Cancel');
  });

  it('emits approve with null note when note is empty', async () => {
    const w = card({ reviewing: true });
    await w.find('button[class*="bg-green"]').trigger('click');
    const emitted = w.emitted('approve') as [string | null][][];
    expect(emitted[0][0]).toBeNull();
  });

  it('emits approve with trimmed note', async () => {
    const w = card({ reviewing: true });
    const input = w.find('input');
    await input.setValue('  good work  ');
    await w.find('button[class*="bg-green"]').trigger('click');
    const emitted = w.emitted('approve') as [string | null][][];
    expect(emitted[0][0]).toBe('good work');
  });

  it('emits reject with note', async () => {
    const w = card({ reviewing: true });
    await w.find('input').setValue('missing docs');
    await w.find('button[class*="bg-red"]').trigger('click');
    const emitted = w.emitted('reject') as [string | null][][];
    expect(emitted[0][0]).toBe('missing docs');
  });

  it('emits cancel when Cancel is clicked', async () => {
    const w = card({ reviewing: true });
    const cancelBtn = w.findAll('button').find((b) => b.text() === 'Cancel')!;
    await cancelBtn.trigger('click');
    expect(w.emitted('cancel')).toBeTruthy();
  });

  it('does not emit approve when noteRequired and note is empty', async () => {
    const w = card({ reviewing: true, noteRequired: true });
    await w.find('button[class*="bg-green"]').trigger('click');
    expect(w.emitted('approve')).toBeFalsy();
  });

  it('emits approve when noteRequired and note is provided', async () => {
    const w = card({ reviewing: true, noteRequired: true });
    await w.find('input').setValue('required note');
    await w.find('button[class*="bg-green"]').trigger('click');
    expect(w.emitted('approve')).toBeTruthy();
  });

  it('renders default slot content', () => {
    const w = card({}, { default: '<span class="slot-content">details here</span>' });
    expect(w.find('.slot-content').exists()).toBe(true);
  });

  it('shows header badge when headerBadge prop is provided', () => {
    const w = card({ headerBadge: { variant: 'pending' } });
    expect(w.html()).toContain('Pending');
  });
});
