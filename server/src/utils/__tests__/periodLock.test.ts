import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isCurrentMonthEntry, isCurrentMonth } from '../periodLock.js';

const NOW = new Date('2024-06-15T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isCurrentMonthEntry', () => {
  it('returns true for an entry in the current month', () => {
    const clockIn = new Date('2024-06-10T07:00:00.000Z');
    expect(isCurrentMonthEntry(clockIn)).toBe(true);
  });

  it('returns false for an entry in the previous month', () => {
    const clockIn = new Date('2024-05-31T07:00:00.000Z');
    expect(isCurrentMonthEntry(clockIn)).toBe(false);
  });

  it('returns true for the first day of the current month', () => {
    const clockIn = new Date('2024-06-01T00:00:00.000Z');
    expect(isCurrentMonthEntry(clockIn)).toBe(true);
  });

  it('returns false for the last day of the previous month', () => {
    // 2024-05-31T12:00:00Z = 15:00 Jerusalem — clearly May 31 in any TZ
    const clockIn = new Date('2024-05-31T12:00:00.000Z');
    expect(isCurrentMonthEntry(clockIn)).toBe(false);
  });

  it('returns false for an entry two months back', () => {
    const clockIn = new Date('2024-04-15T07:00:00.000Z');
    expect(isCurrentMonthEntry(clockIn)).toBe(false);
  });

  it('returns false for a December entry when now is January', () => {
    vi.setSystemTime(new Date('2025-01-10T12:00:00.000Z'));
    const clockIn = new Date('2024-12-15T07:00:00.000Z');
    expect(isCurrentMonthEntry(clockIn)).toBe(false);
  });
});

describe('isCurrentMonth', () => {
  it('returns true for a date string in the current month', () => {
    expect(isCurrentMonth('2024-06-10')).toBe(true);
  });

  it('returns false for a date string in a previous month', () => {
    expect(isCurrentMonth('2024-05-20')).toBe(false);
  });

  it('returns true for the first day of the current month', () => {
    expect(isCurrentMonth('2024-06-01')).toBe(true);
  });

  it('returns false for the last day of the previous month', () => {
    expect(isCurrentMonth('2024-05-31')).toBe(false);
  });
});
