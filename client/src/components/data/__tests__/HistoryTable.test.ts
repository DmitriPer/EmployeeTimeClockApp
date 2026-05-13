import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import type { HistoryEntryDto } from '@app/shared';
import HistoryTable from '../HistoryTable.vue';

function makeEntry(overrides: Partial<HistoryEntryDto> = {}): HistoryEntryDto {
  return {
    id: 1,
    clockInAt: '2024-01-15T09:00:00.000Z',
    clockOutAt: '2024-01-15T17:00:00.000Z',
    grossMinutes: 480,
    totalBreakMinutes: 30,
    excessBreakMinutes: 0,
    paidMinutes: 450,
    isAutoClosedBreak: false,
    isFlagged: false,
    isBreakReviewed: false,
    isCorrected: false,
    isRetroactive: false,
    employeeNote: null,
    breaks: [],
    overtimeRequest: null,
    pendingCorrection: null,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(props: { entries: HistoryEntryDto[]; [key: string]: unknown }): ReturnType<typeof mount> {
  return mount(HistoryTable, { props: props as any });
}

describe('HistoryTable', () => {
  it('renders a row for each entry', () => {
    const w = table({ entries: [makeEntry({ id: 1 }), makeEntry({ id: 2 })] });
    expect(w.findAll('tbody tr').length).toBeGreaterThanOrEqual(2);
  });

  it('does not show employee column by default', () => {
    const w = table({ entries: [makeEntry()] });
    expect(w.find('th').text()).not.toContain('Employee');
  });

  it('shows employee column when showEmployee is true', () => {
    const w = table({ entries: [makeEntry()], showEmployee: true });
    const headers = w.findAll('th').map((h) => h.text());
    expect(headers).toContain('Employee');
  });

  it('hides notes column when showNotes is false', () => {
    const w = table({ entries: [makeEntry()], showNotes: false });
    const headers = w.findAll('th').map((h) => h.text());
    expect(headers).not.toContain('Notes');
  });

  it('shows notes column by default', () => {
    const w = table({ entries: [makeEntry()] });
    const headers = w.findAll('th').map((h) => h.text());
    expect(headers).toContain('Notes');
  });

  it('does not show edit action column by default', () => {
    const w = table({ entries: [makeEntry()] });
    const btns = w.findAll('button').map((b) => b.text());
    expect(btns.some((t) => t.includes('Request Edit') || t.includes('Pending Edit'))).toBe(false);
  });

  it('shows Request Edit button when showEditAction is true and entry is complete', () => {
    const w = table({ entries: [makeEntry()], showEditAction: true });
    const btns = w.findAll('button').map((b) => b.text());
    expect(btns.some((t) => t.includes('Request Edit'))).toBe(true);
  });

  it('shows Pending Edit button when entry has a pending correction', () => {
    const entry = makeEntry({
      pendingCorrection: {
        id: 99,
        status: 'PENDING',
        requestedClockInAt: '2024-01-15T08:00:00.000Z',
        requestedClockOutAt: '2024-01-15T16:00:00.000Z',
        employeeNote: 'Please fix',
        managerNote: null,
      },
    });
    const w = table({ entries: [entry], showEditAction: true });
    const btns = w.findAll('button').map((b) => b.text());
    expect(btns.some((t) => t.includes('Pending Edit'))).toBe(true);
  });

  it('emits edit event when edit button is clicked', async () => {
    const entry = makeEntry();
    const w = table({ entries: [entry], showEditAction: true });
    const editBtn = w.findAll('button').find((b) => b.text().includes('Request Edit'))!;
    await editBtn.trigger('click');
    const emitted = w.emitted('edit');
    expect(emitted).toBeTruthy();
    expect((emitted as unknown[][])[0][0]).toEqual(entry);
  });

  it('shows pending correction sub-row', () => {
    const entry = makeEntry({
      pendingCorrection: {
        id: 99,
        status: 'PENDING',
        requestedClockInAt: '2024-01-15T08:00:00.000Z',
        requestedClockOutAt: '2024-01-15T16:00:00.000Z',
        employeeNote: 'Please fix',
        managerNote: null,
      },
    });
    const w = table({ entries: [entry] });
    expect(w.html()).toContain('Edit requested');
  });

  it('shows rejected correction sub-row', () => {
    const entry = makeEntry({
      pendingCorrection: {
        id: 99,
        status: 'REJECTED',
        requestedClockInAt: '2024-01-15T08:00:00.000Z',
        requestedClockOutAt: '2024-01-15T16:00:00.000Z',
        employeeNote: 'Please fix',
        managerNote: 'Not valid',
      },
    });
    const w = table({ entries: [entry] });
    expect(w.html()).toContain('Edit rejected');
    expect(w.html()).toContain('Not valid');
  });

  it('renders retroactive StatusBadge when isRetroactive is true', () => {
    const w = table({ entries: [makeEntry({ isRetroactive: true })] });
    expect(w.html()).toContain('Retroactive');
  });

  it('renders flagged StatusBadge when isFlagged is true', () => {
    const w = table({ entries: [makeEntry({ isFlagged: true })] });
    expect(w.html()).toContain('Flagged');
  });

  it('respects editableEntry predicate to hide edit button', () => {
    const w = table({
      entries: [makeEntry()],
      showEditAction: true,
      editableEntry: () => false,
    });
    const btns = w.findAll('button').map((b) => b.text());
    expect(btns.some((t) => t.includes('Request Edit') || t.includes('Pending Edit'))).toBe(false);
  });
});
