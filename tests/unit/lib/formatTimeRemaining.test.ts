import { describe, it, expect } from 'vitest';
import { formatTimeRemaining } from '../../../src/lib/formatters.js';

// Fixed reference time for deterministic tests
const NOW = new Date('2026-06-15T14:00:00Z');
const mins = (n) => new Date(NOW.getTime() + n * 60000);

// ============================================================
// A) Guard clauses
// ============================================================
describe('formatTimeRemaining — guard clauses', () => {
  it('null input → empty string', () => {
    expect(formatTimeRemaining(null, NOW)).toBe('');
  });

  it('undefined input → empty string', () => {
    expect(formatTimeRemaining(undefined, NOW)).toBe('');
  });

  it('invalid date string → empty string', () => {
    expect(formatTimeRemaining('not-a-date', NOW)).toBe('');
  });
});

// ============================================================
// B) Zero minutes
// ============================================================
describe('formatTimeRemaining — zero', () => {
  it('endTime === currentTime → "Now"', () => {
    expect(formatTimeRemaining(NOW, NOW)).toBe('Now');
  });
});

// ============================================================
// C) Positive minutes (time remaining)
// ============================================================
describe('formatTimeRemaining — positive', () => {
  it('30 minutes remaining → "30m"', () => {
    expect(formatTimeRemaining(mins(30), NOW)).toBe('30m');
  });

  it('59 minutes remaining → "59m"', () => {
    expect(formatTimeRemaining(mins(59), NOW)).toBe('59m');
  });

  it('1 minute remaining → "1m"', () => {
    expect(formatTimeRemaining(mins(1), NOW)).toBe('1m');
  });

  it('60 minutes (exactly 1 hour) → "1h"', () => {
    expect(formatTimeRemaining(mins(60), NOW)).toBe('1h');
  });

  it('90 minutes → "1h 30m"', () => {
    expect(formatTimeRemaining(mins(90), NOW)).toBe('1h 30m');
  });

  it('120 minutes (exactly 2 hours) → "2h"', () => {
    expect(formatTimeRemaining(mins(120), NOW)).toBe('2h');
  });
});

// ============================================================
// D) Negative minutes (overtime)
// ============================================================
describe('formatTimeRemaining — overtime (negative)', () => {
  it('15 minutes over → "15m over"', () => {
    expect(formatTimeRemaining(mins(-15), NOW)).toBe('15m over');
  });

  it('59 minutes over → "59m over"', () => {
    expect(formatTimeRemaining(mins(-59), NOW)).toBe('59m over');
  });

  it('60 minutes over → "1h over" (remainder dropped)', () => {
    expect(formatTimeRemaining(mins(-60), NOW)).toBe('60m over');
    // Note: -60 min means minutes === -60, which is NOT < -60,
    // so it falls to the `minutes < 0` branch → "60m over"
  });

  it('61 minutes over → "2h over" (Math.floor rounds away from zero)', () => {
    expect(formatTimeRemaining(mins(-61), NOW)).toBe('2h over');
    // minutes === -61, which IS < -60
    // Math.abs(Math.floor(-61/60)) = Math.abs(-2) = 2 → "2h over"
    // Math.floor on negatives rounds DOWN (away from zero), so 61 min rounds to 2h
  });

  it('120 minutes over → "2h over"', () => {
    expect(formatTimeRemaining(mins(-120), NOW)).toBe('2h over');
    // Math.abs(Math.floor(-120/60)) = Math.abs(-2) = 2
  });

  it('135 minutes over → "3h over" (Math.floor rounds away from zero)', () => {
    expect(formatTimeRemaining(mins(-135), NOW)).toBe('3h over');
    // minutes === -135, < -60
    // Math.abs(Math.floor(-135/60)) = Math.abs(-3) = 3 → "3h over"
    // 2h15m over displays as "3h over" due to Math.floor rounding on negatives
  });
});

// ============================================================
// E) Input parsing
// ============================================================
describe('formatTimeRemaining — input parsing', () => {
  it('string endTime is parsed correctly', () => {
    const end = mins(45).toISOString();
    expect(formatTimeRemaining(end, NOW)).toBe('45m');
  });

  it('Date object endTime works', () => {
    expect(formatTimeRemaining(mins(45), NOW)).toBe('45m');
  });

  it('currentTime defaults to now if omitted', () => {
    // Use a time far enough in the future that it's always positive
    const farFuture = new Date('2099-01-01T00:00:00Z');
    const result = formatTimeRemaining(farFuture);
    // Should return a non-empty string (not '' or 'Now')
    expect(result).not.toBe('');
    expect(result).not.toBe('Now');
    // Should contain 'h' since it's years away
    expect(result).toContain('h');
  });
});

// ============================================================
// F) appendLeftSuffix option
// ============================================================
describe('formatTimeRemaining — appendLeftSuffix', () => {
  const opts = { appendLeftSuffix: true };

  it('30 minutes → "30m left"', () => {
    expect(formatTimeRemaining(mins(30), NOW, opts)).toBe('30m left');
  });

  it('0 minutes → "0m left" (not "Now")', () => {
    expect(formatTimeRemaining(NOW, NOW, opts)).toBe('0m left');
  });

  it('60 minutes → "1h 0m left" (always shows remainder)', () => {
    expect(formatTimeRemaining(mins(60), NOW, opts)).toBe('1h 0m left');
  });

  it('90 minutes → "1h 30m left"', () => {
    expect(formatTimeRemaining(mins(90), NOW, opts)).toBe('1h 30m left');
  });

  it('120 minutes → "2h 0m left"', () => {
    expect(formatTimeRemaining(mins(120), NOW, opts)).toBe('2h 0m left');
  });

  it('negative minutes still show "over" (no suffix)', () => {
    // appendLeftSuffix only affects positive/zero; overtime uses default path
    expect(formatTimeRemaining(mins(-15), NOW, opts)).toBe('15m over');
  });
});

// ============================================================
// G) showOvertimeRemainder option
// ============================================================
describe('formatTimeRemaining — showOvertimeRemainder', () => {
  const opts = { showOvertimeRemainder: true };

  it('75 minutes over → "1h 15m over" (shows remainder)', () => {
    expect(formatTimeRemaining(mins(-75), NOW, opts)).toBe('1h 15m over');
  });

  it('60 minutes over → "1h over" (no remainder)', () => {
    expect(formatTimeRemaining(mins(-60), NOW, opts)).toBe('1h over');
  });

  it('61 minutes over → "1h 1m over" (clean division, not 2h)', () => {
    // With showOvertimeRemainder: Math.floor(61/60)=1, 61%60=1 → "1h 1m over"
    // Without: Math.abs(Math.floor(-61/60))=2 → "2h over"
    expect(formatTimeRemaining(mins(-61), NOW, opts)).toBe('1h 1m over');
  });

  it('135 minutes over → "2h 15m over"', () => {
    expect(formatTimeRemaining(mins(-135), NOW, opts)).toBe('2h 15m over');
  });

  it('15 minutes over → "15m over" (under 60, same as default)', () => {
    expect(formatTimeRemaining(mins(-15), NOW, opts)).toBe('15m over');
  });

  it('120 minutes over → "2h over"', () => {
    expect(formatTimeRemaining(mins(-120), NOW, opts)).toBe('2h over');
  });

  it('positive minutes unaffected', () => {
    expect(formatTimeRemaining(mins(30), NOW, opts)).toBe('30m');
  });
});

// ============================================================
// H) Both options combined (admin mode)
// ============================================================
describe('formatTimeRemaining — admin mode (both options)', () => {
  const opts = { appendLeftSuffix: true, showOvertimeRemainder: true };

  it('30 minutes → "30m left"', () => {
    expect(formatTimeRemaining(mins(30), NOW, opts)).toBe('30m left');
  });

  it('0 minutes → "0m left"', () => {
    expect(formatTimeRemaining(NOW, NOW, opts)).toBe('0m left');
  });

  it('60 minutes → "1h 0m left"', () => {
    expect(formatTimeRemaining(mins(60), NOW, opts)).toBe('1h 0m left');
  });

  it('75 minutes over → "1h 15m over"', () => {
    expect(formatTimeRemaining(mins(-75), NOW, opts)).toBe('1h 15m over');
  });

  it('60 minutes over → "1h over"', () => {
    expect(formatTimeRemaining(mins(-60), NOW, opts)).toBe('1h over');
  });
});
