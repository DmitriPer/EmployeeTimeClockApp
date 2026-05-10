import { describe, it, expect } from 'vitest';
import { toJerusalem, dayStart, dayEnd } from '../timezone.js';

describe('toJerusalem', () => {
  it('converts a UTC ISO string to Asia/Jerusalem timezone', () => {
    const result = toJerusalem('2026-05-10T06:00:00Z');
    expect(result.zoneName).toBe('Asia/Jerusalem');
    expect(result.hour).toBe(9); // UTC+3 in summer (IDT)
  });

  it('handles DST boundary — winter UTC+2 (standard time)', () => {
    // January is UTC+2 (IST)
    const result = toJerusalem('2026-01-10T06:00:00Z');
    expect(result.zoneName).toBe('Asia/Jerusalem');
    expect(result.hour).toBe(8); // UTC+2
  });
});

describe('dayStart', () => {
  it('returns midnight UTC for a Jerusalem calendar day', () => {
    // 2026-05-10 09:00 IDT = 2026-05-10 06:00 UTC → day starts at 2026-05-09 21:00 UTC (IDT midnight)
    const result = dayStart('2026-05-10T06:00:00Z');
    expect(result.toISO()).toBe('2026-05-09T21:00:00.000Z');
  });

  it('midnight rollover — UTC time before Jerusalem midnight belongs to previous calendar day', () => {
    // 2026-05-10 00:30 UTC = 2026-05-10 03:30 IDT → same calendar day
    const result = dayStart('2026-05-10T00:30:00Z');
    expect(result.toISO()).toBe('2026-05-09T21:00:00.000Z');
  });

  it('midnight rollover — UTC time past Jerusalem midnight belongs to next calendar day', () => {
    // 2026-05-09 22:00 UTC = 2026-05-10 01:00 IDT → Jerusalem day is May 10
    const result = dayStart('2026-05-09T22:00:00Z');
    expect(result.toISO()).toBe('2026-05-09T21:00:00.000Z');
  });

  it('handles DST spring-forward boundary', () => {
    // Israel DST begins last Friday of March — in 2026 that's 2026-03-27
    // After spring-forward: UTC+3 (IDT). Day start = 21:00 UTC previous day
    const result = dayStart('2026-03-28T06:00:00Z');
    expect(result.toISO()).toBe('2026-03-27T21:00:00.000Z');
  });

  it('winter (IST, UTC+2) — day start is 22:00 UTC, not 21:00', () => {
    // In winter, Jerusalem is UTC+2 (IST), so midnight = 22:00 UTC previous day
    const result = dayStart('2026-11-15T12:00:00Z');
    expect(result.toISO()).toBe('2026-11-14T22:00:00.000Z');
  });
});

describe('dayEnd', () => {
  it('returns end of the Jerusalem calendar day in UTC', () => {
    // Day end for 2026-05-10 IDT = 2026-05-10 23:59:59.999 IDT = 2026-05-10 20:59:59.999 UTC
    const result = dayEnd('2026-05-10T06:00:00Z');
    expect(result.toISO()).toBe('2026-05-10T20:59:59.999Z');
  });
});
