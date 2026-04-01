import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatTimeRange,
  formatTimeRemaining,
  formatDuration,
  formatPhone,
  formatName,
  truncate,
  formatCurrency,
  formatNumber,
  formatCourt,
  formatCourts,
  formatPlayerNames,
} from '../../../src/lib/formatters.js';

// ── formatTime ─────────────────────────────────────────────────
describe('formatTime', () => {
  it('returns null for falsy input', () => {
    expect(formatTime(null)).toBeNull();
    expect(formatTime(undefined)).toBeNull();
    expect(formatTime(0)).toBeNull();
    expect(formatTime('')).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(formatTime('not-a-date')).toBeNull();
  });

  it('formats a Date object', () => {
    const d = new Date(2024, 0, 15, 14, 30); // 2:30 PM local
    const result = formatTime(d);
    expect(result).toMatch(/2:30\sPM/);
  });

  it('formats an ISO string', () => {
    const result = formatTime('2024-01-15T14:30:00');
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
  });
});

// ── formatDate ─────────────────────────────────────────────────
describe('formatDate', () => {
  it('returns null for falsy input', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(formatDate('invalid')).toBeNull();
  });

  it('formats a date with weekday', () => {
    const d = new Date(2024, 0, 15); // Monday Jan 15
    const result = formatDate(d);
    expect(result).toMatch(/Mon/);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
  });
});

// ── formatDateShort ────────────────────────────────────────────
describe('formatDateShort', () => {
  it('returns null for falsy input', () => {
    expect(formatDateShort(null)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(formatDateShort('nope')).toBeNull();
  });

  it('formats a date without weekday', () => {
    const d = new Date(2024, 0, 15);
    const result = formatDateShort(d);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2024/);
    expect(result).not.toMatch(/Mon/);
  });
});

// ── formatDateTime ─────────────────────────────────────────────
describe('formatDateTime', () => {
  it('returns null for falsy input', () => {
    expect(formatDateTime(null)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(formatDateTime('bad')).toBeNull();
  });

  it('formats date and time', () => {
    const d = new Date(2024, 0, 15, 14, 30);
    const result = formatDateTime(d);
    expect(result).toMatch(/01\/15\/2024/);
    expect(result).toMatch(/[AP]M/);
  });
});

// ── formatTimeRange ────────────────────────────────────────────
describe('formatTimeRange', () => {
  it('returns empty string when start is invalid', () => {
    expect(formatTimeRange(null, new Date())).toBe('');
  });

  it('returns empty string when end is invalid', () => {
    expect(formatTimeRange(new Date(), null)).toBe('');
  });

  it('formats a time range with dash separator', () => {
    const start = new Date(2024, 0, 15, 10, 0);
    const end = new Date(2024, 0, 15, 11, 30);
    const result = formatTimeRange(start, end);
    expect(result).toMatch(/.+ - .+/);
  });
});

// ── formatTimeRemaining ────────────────────────────────────────
describe('formatTimeRemaining', () => {
  const now = new Date('2024-01-15T12:00:00');

  it('returns empty string for null endTime', () => {
    expect(formatTimeRemaining(null, now)).toBe('');
  });

  it('returns empty string for invalid endTime', () => {
    expect(formatTimeRemaining('invalid', now)).toBe('');
  });

  it('returns "Now" when exactly 0 minutes remaining', () => {
    expect(formatTimeRemaining(now, now)).toBe('Now');
  });

  it('returns "0m left" when 0 minutes with appendLeftSuffix', () => {
    expect(formatTimeRemaining(now, now, { appendLeftSuffix: true })).toBe('0m left');
  });

  it('formats positive minutes under 60', () => {
    const end = new Date('2024-01-15T12:30:00');
    expect(formatTimeRemaining(end, now)).toBe('30m');
  });

  it('appends " left" suffix when requested for positive minutes', () => {
    const end = new Date('2024-01-15T12:30:00');
    expect(formatTimeRemaining(end, now, { appendLeftSuffix: true })).toBe('30m left');
  });

  it('formats hours and minutes', () => {
    const end = new Date('2024-01-15T13:30:00');
    expect(formatTimeRemaining(end, now)).toBe('1h 30m');
  });

  it('formats exact hours', () => {
    const end = new Date('2024-01-15T14:00:00');
    expect(formatTimeRemaining(end, now)).toBe('2h');
  });

  it('formats hours with appendLeftSuffix always showing remainder', () => {
    const end = new Date('2024-01-15T14:00:00');
    expect(formatTimeRemaining(end, now, { appendLeftSuffix: true })).toBe('2h 0m left');
  });

  // Overtime (negative)
  it('formats overtime minutes', () => {
    const end = new Date('2024-01-15T11:45:00');
    expect(formatTimeRemaining(end, now)).toBe('15m over');
  });

  it('formats overtime hours (default mode, > 60m)', () => {
    // -90 min → Math.floor(-90/60) = -2, Math.abs(-2) = 2 → "2h over"
    const end = new Date('2024-01-15T10:30:00');
    expect(formatTimeRemaining(end, now)).toBe('2h over');
  });

  it('formats overtime with showOvertimeRemainder (hours + mins)', () => {
    const end = new Date('2024-01-15T10:15:00');
    expect(formatTimeRemaining(end, now, { showOvertimeRemainder: true })).toBe('1h 45m over');
  });

  it('formats overtime with showOvertimeRemainder (exact hours)', () => {
    const end = new Date('2024-01-15T10:00:00');
    expect(formatTimeRemaining(end, now, { showOvertimeRemainder: true })).toBe('2h over');
  });

  it('formats overtime with showOvertimeRemainder (under 60m)', () => {
    const end = new Date('2024-01-15T11:30:00');
    expect(formatTimeRemaining(end, now, { showOvertimeRemainder: true })).toBe('30m over');
  });
});

// ── formatDuration ─────────────────────────────────────────────
describe('formatDuration (formatters.js)', () => {
  it('returns empty string for non-number', () => {
    expect(formatDuration('abc' as any)).toBe('');
    expect(formatDuration(null as any)).toBe('');
    expect(formatDuration(NaN)).toBe('');
  });

  it('returns empty string for negative', () => {
    expect(formatDuration(-5)).toBe('');
  });

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats minutes under 60', () => {
    expect(formatDuration(45)).toBe('45m');
  });

  it('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });
});

// ── formatPhone ────────────────────────────────────────────────
describe('formatPhone', () => {
  it('returns empty string for falsy input', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
  });

  it('formats 10-digit number', () => {
    expect(formatPhone('5551234567')).toBe('(555) 123-4567');
  });

  it('formats 10-digit with existing formatting', () => {
    expect(formatPhone('555-123-4567')).toBe('(555) 123-4567');
  });

  it('formats 11-digit starting with 1', () => {
    expect(formatPhone('15551234567')).toBe('+1 (555) 123-4567');
  });

  it('returns original for invalid length', () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  it('handles numeric input', () => {
    expect(formatPhone(5551234567)).toBe('(555) 123-4567');
  });
});

// ── formatName ─────────────────────────────────────────────────
describe('formatName', () => {
  it('returns empty string for falsy/non-string', () => {
    expect(formatName('')).toBe('');
    expect(formatName(null as any)).toBe('');
    expect(formatName(123 as any)).toBe('');
  });

  it('capitalizes first letter of each word', () => {
    expect(formatName('john doe')).toBe('John Doe');
  });

  it('handles already capitalized names', () => {
    expect(formatName('JOHN DOE')).toBe('John Doe');
  });

  it('trims whitespace', () => {
    expect(formatName('  john  ')).toBe('John');
  });
});

// ── truncate ───────────────────────────────────────────────────
describe('truncate', () => {
  it('returns empty string for falsy/non-string', () => {
    expect(truncate('')).toBe('');
    expect(truncate(null)).toBe('');
  });

  it('returns text if within limit', () => {
    expect(truncate('short', 50)).toBe('short');
  });

  it('truncates with ellipsis', () => {
    expect(truncate('abcdefghij', 8)).toBe('abcde...');
  });

  it('uses default maxLength of 50', () => {
    const long = 'a'.repeat(60);
    const result = truncate(long);
    expect(result).toHaveLength(50);
    expect(result).toMatch(/\.\.\.$/);
  });
});

// ── formatCurrency ─────────────────────────────────────────────
describe('formatCurrency', () => {
  it('returns empty string for non-number', () => {
    expect(formatCurrency('abc' as any)).toBe('');
    expect(formatCurrency(NaN)).toBe('');
  });

  it('formats USD by default', () => {
    expect(formatCurrency(10)).toBe('$10.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});

// ── formatNumber ───────────────────────────────────────────────
describe('formatNumber', () => {
  it('returns empty string for non-number', () => {
    expect(formatNumber('abc' as any)).toBe('');
    expect(formatNumber(NaN)).toBe('');
  });

  it('formats with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

// ── formatCourt ────────────────────────────────────────────────
describe('formatCourt', () => {
  it('returns empty string for non-number', () => {
    expect(formatCourt('a' as any)).toBe('');
  });

  it('returns empty string for court < 1', () => {
    expect(formatCourt(0)).toBe('');
    expect(formatCourt(-1)).toBe('');
  });

  it('formats court number', () => {
    expect(formatCourt(3)).toBe('Court 3');
  });
});

// ── formatCourts ───────────────────────────────────────────────
describe('formatCourts', () => {
  it('returns empty string for non-array', () => {
    expect(formatCourts(null as any)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(formatCourts([])).toBe('');
  });

  it('formats single court', () => {
    expect(formatCourts([5])).toBe('Court 5');
  });

  it('formats multiple courts', () => {
    expect(formatCourts([1, 2, 3])).toBe('Courts 1, 2, 3');
  });
});

// ── formatPlayerNames ──────────────────────────────────────────
describe('formatPlayerNames', () => {
  it('returns empty string for non-array', () => {
    expect(formatPlayerNames(null as any)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(formatPlayerNames([])).toBe('');
  });

  it('formats string player names', () => {
    expect(formatPlayerNames(['Alice', 'Bob'])).toBe('Alice, Bob');
  });

  it('formats player objects with .name', () => {
    expect(formatPlayerNames([{ name: 'Alice' }, { name: 'Bob' }])).toBe('Alice, Bob');
  });

  it('truncates with +N when exceeding maxDisplay', () => {
    const players = ['A', 'B', 'C', 'D', 'E'];
    expect(formatPlayerNames(players, 3)).toBe('A, B, C +2');
  });

  it('shows all when at or under maxDisplay', () => {
    const players = ['A', 'B', 'C', 'D'];
    expect(formatPlayerNames(players, 4)).toBe('A, B, C, D');
  });

  it('filters out falsy player entries', () => {
    expect(formatPlayerNames([null, 'Alice', undefined, 'Bob'])).toBe('Alice, Bob');
  });
});
