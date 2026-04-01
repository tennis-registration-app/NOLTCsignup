import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  toLocalDate,
  formatDateTime,
  formatDate,
  formatTime,
  formatCourtTime,
  addMinutes,
  isOverTime,
  durationForGroupSize,
  CLUB_TIMEZONE,
} from '../../../src/lib/dateUtils.js';

describe('formatDuration', () => {
  it('formats 0 minutes as "0m"', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats null/undefined as "0m"', () => {
    expect(formatDuration(null as any)).toBe('0m');
    expect(formatDuration(undefined as any)).toBe('0m');
  });

  it('formats negative minutes as "0m"', () => {
    expect(formatDuration(-10)).toBe('0m');
  });

  it('formats minutes under one hour', () => {
    expect(formatDuration(30)).toBe('30m');
    expect(formatDuration(45)).toBe('45m');
  });

  it('formats exactly one hour', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('formats exactly two hours', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats hours and minutes combined', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(150)).toBe('2h 30m');
  });

  it('formats single digit minutes', () => {
    expect(formatDuration(5)).toBe('5m');
    expect(formatDuration(65)).toBe('1h 5m');
  });
});

// ── toLocalDate ────────────────────────────────────────────────
describe('toLocalDate', () => {
  it('returns null for falsy input', () => {
    expect(toLocalDate(null)).toBeNull();
    expect(toLocalDate(undefined)).toBeNull();
    expect(toLocalDate('')).toBeNull();
  });

  it('parses an ISO string into a Date', () => {
    const result = toLocalDate('2024-01-15T12:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(new Date('2024-01-15T12:00:00Z').getTime());
  });

  it('returns the same Date object when given a Date', () => {
    const d = new Date(2024, 0, 15);
    expect(toLocalDate(d)).toBe(d);
  });
});

// ── formatDateTime (dateUtils) ─────────────────────────────────
describe('formatDateTime (dateUtils)', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
    expect(formatDateTime('')).toBe('');
  });

  it('formats a Date object with Central timezone', () => {
    const result = formatDateTime(new Date('2024-01-15T18:30:00Z'));
    expect(result).toBeTruthy();
    expect(result).toMatch(/[AP]M/);
  });

  it('formats an ISO string', () => {
    const result = formatDateTime('2024-06-15T20:00:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('accepts custom options that override defaults', () => {
    const result = formatDateTime('2024-01-15T18:30:00Z', { hour12: false });
    expect(result).toBeTruthy();
  });
});

// ── formatDate (dateUtils) ─────────────────────────────────────
describe('formatDate (dateUtils)', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('formats a Date in MM/DD/YYYY format', () => {
    const result = formatDate(new Date('2024-06-15T12:00:00Z'));
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('formats an ISO string', () => {
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toBeTruthy();
    expect(result).toMatch(/01\/15\/2024/);
  });
});

// ── formatTime (dateUtils) ─────────────────────────────────────
describe('formatTime (dateUtils)', () => {
  it('returns empty string for falsy input', () => {
    expect(formatTime(null)).toBe('');
    expect(formatTime('')).toBe('');
  });

  it('formats a date to HH:MM AM/PM', () => {
    const result = formatTime(new Date('2024-01-15T18:30:00Z'));
    expect(result).toMatch(/\d{2}:\d{2}\s[AP]M/);
  });

  it('formats an ISO string', () => {
    const result = formatTime('2024-01-15T08:00:00Z');
    expect(result).toBeTruthy();
    expect(result).toMatch(/[AP]M/);
  });
});

// ── formatCourtTime ────────────────────────────────────────────
describe('formatCourtTime', () => {
  it('returns empty string for falsy input', () => {
    expect(formatCourtTime(null)).toBe('');
    expect(formatCourtTime('')).toBe('');
  });

  it('formats a date to numeric hour:minute AM/PM', () => {
    const result = formatCourtTime(new Date('2024-01-15T18:30:00Z'));
    expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
  });

  it('formats an ISO string', () => {
    const result = formatCourtTime('2024-01-15T08:00:00Z');
    expect(result).toBeTruthy();
  });
});

// ── addMinutes ─────────────────────────────────────────────────
describe('addMinutes', () => {
  it('adds positive minutes', () => {
    const base = new Date('2024-01-15T10:00:00Z');
    const result = addMinutes(base, 30);
    expect(result.getTime()).toBe(new Date('2024-01-15T10:30:00Z').getTime());
  });

  it('adds 0 minutes (no change)', () => {
    const base = new Date('2024-01-15T10:00:00Z');
    const result = addMinutes(base, 0);
    expect(result.getTime()).toBe(base.getTime());
  });

  it('adds negative minutes (subtracts)', () => {
    const base = new Date('2024-01-15T10:00:00Z');
    const result = addMinutes(base, -15);
    expect(result.getTime()).toBe(new Date('2024-01-15T09:45:00Z').getTime());
  });

  it('returns a new Date (does not mutate original)', () => {
    const base = new Date('2024-01-15T10:00:00Z');
    const result = addMinutes(base, 60);
    expect(result).not.toBe(base);
    expect(base.getTime()).toBe(new Date('2024-01-15T10:00:00Z').getTime());
  });
});

// ── isOverTime ─────────────────────────────────────────────────
describe('isOverTime', () => {
  it('returns true when now is past endTime', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    const end = new Date('2024-01-15T11:00:00Z');
    expect(isOverTime(now, end)).toBe(true);
  });

  it('returns false when now is before endTime', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const end = new Date('2024-01-15T11:00:00Z');
    expect(isOverTime(now, end)).toBe(false);
  });

  it('returns false when now equals endTime', () => {
    const now = new Date('2024-01-15T11:00:00Z');
    const end = new Date('2024-01-15T11:00:00Z');
    expect(isOverTime(now, end)).toBe(false);
  });

  it('accepts string endTime', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    expect(isOverTime(now, '2024-01-15T11:00:00Z')).toBe(true);
  });
});

// ── durationForGroupSize ───────────────────────────────────────
describe('durationForGroupSize', () => {
  it('returns singlesMinutes for group < 4', () => {
    expect(durationForGroupSize(1)).toBe(60);
    expect(durationForGroupSize(2)).toBe(60);
    expect(durationForGroupSize(3)).toBe(60);
  });

  it('returns doublesMinutes for group >= 4', () => {
    expect(durationForGroupSize(4)).toBe(90);
    expect(durationForGroupSize(5)).toBe(90);
  });

  it('uses custom durations when provided', () => {
    expect(durationForGroupSize(2, 45, 75)).toBe(45);
    expect(durationForGroupSize(4, 45, 75)).toBe(75);
  });
});

// ── CLUB_TIMEZONE ──────────────────────────────────────────────
describe('CLUB_TIMEZONE', () => {
  it('is America/Chicago', () => {
    expect(CLUB_TIMEZONE).toBe('America/Chicago');
  });
});
