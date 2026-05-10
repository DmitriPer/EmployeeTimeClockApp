import { describe, it, expect } from 'vitest';
import { calcGrossTime, calcPaidHours, isOvertime } from '../timeCalculations.js';

describe('calcGrossTime', () => {
  it('returns 570 for a 9.5-hour shift', () => {
    expect(calcGrossTime('2026-05-10T06:00:00Z', '2026-05-10T15:30:00Z')).toBe(570);
  });

  it('returns 480 for an exact 8-hour shift', () => {
    expect(calcGrossTime('2026-05-10T07:00:00Z', '2026-05-10T15:00:00Z')).toBe(480);
  });

  it('returns 540 for an exact 9-hour shift', () => {
    expect(calcGrossTime('2026-05-10T06:00:00Z', '2026-05-10T15:00:00Z')).toBe(540);
  });

  it('returns 541 for a shift that is 1 minute over 9 hours', () => {
    expect(calcGrossTime('2026-05-10T06:00:00Z', '2026-05-10T15:01:00Z')).toBe(541);
  });
});

describe('calcPaidHours', () => {
  it('returns gross time unchanged when breaks are under 60 minutes', () => {
    expect(calcPaidHours(570, 45)).toBe(570);
  });

  it('returns gross time unchanged when breaks are exactly 60 minutes', () => {
    expect(calcPaidHours(570, 60)).toBe(570);
  });

  it('deducts 30 minutes when breaks are 90 minutes (30 min excess)', () => {
    expect(calcPaidHours(570, 90)).toBe(540);
  });

  it('deducts the full excess when breaks are well over the allowance', () => {
    expect(calcPaidHours(480, 120)).toBe(420); // 60 min excess deducted
  });

  it('handles zero break time', () => {
    expect(calcPaidHours(570, 0)).toBe(570);
  });
});

describe('isOvertime', () => {
  it('returns true for 541 minutes (9h 1m)', () => {
    expect(isOvertime(541)).toBe(true);
  });

  it('returns false for 540 minutes (exactly 9h)', () => {
    expect(isOvertime(540)).toBe(false);
  });

  it('returns false for times well under 9 hours', () => {
    expect(isOvertime(480)).toBe(false);
  });

  it('returns true for a long shift', () => {
    expect(isOvertime(660)).toBe(true); // 11 hours
  });
});
