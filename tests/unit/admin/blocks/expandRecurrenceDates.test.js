/**
 * expandRecurrenceDates tests
 */

import { describe, it, expect } from 'vitest';
import { expandRecurrenceDates } from '../../../../src/admin/blocks/utils/expandRecurrenceDates.js';

describe('expandRecurrenceDates', () => {
  const baseDate = new Date('2024-06-15T10:00:00Z');

  it('returns single date when no recurrence', () => {
    const result = expandRecurrenceDates(baseDate, null);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(baseDate);
  });

  it('returns single date when recurrence is undefined', () => {
    const result = expandRecurrenceDates(baseDate, undefined);
    expect(result).toHaveLength(1);
  });

  // ── daily pattern ──────────────────────────────────────────
  it('expands daily recurrence with "after" end type', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'daily',
      frequency: 1,
      endType: 'after',
      occurrences: 3,
    });
    expect(result).toHaveLength(3);
    // Second date should be 1 day after first
    const day0 = result[0].date.getDate();
    const day1 = result[1].date.getDate();
    expect(day1 - day0).toBe(1);
  });

  it('expands daily with frequency 2 (every other day)', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'daily',
      frequency: 2,
      endType: 'after',
      occurrences: 3,
    });
    expect(result).toHaveLength(3);
    const day0 = result[0].date.getDate();
    const day1 = result[1].date.getDate();
    expect(day1 - day0).toBe(2);
  });

  // ── weekly pattern ─────────────────────────────────────────
  it('expands weekly recurrence', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'weekly',
      frequency: 1,
      endType: 'after',
      occurrences: 4,
    });
    expect(result).toHaveLength(4);
    const diff = result[1].date.getTime() - result[0].date.getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
  });

  it('expands bi-weekly recurrence', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'weekly',
      frequency: 2,
      endType: 'after',
      occurrences: 2,
    });
    expect(result).toHaveLength(2);
    const diff = result[1].date.getTime() - result[0].date.getTime();
    expect(diff).toBe(14 * 24 * 60 * 60 * 1000); // 14 days
  });

  // ── monthly pattern ────────────────────────────────────────
  it('expands monthly recurrence', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'monthly',
      frequency: 1,
      endType: 'after',
      occurrences: 3,
    });
    expect(result).toHaveLength(3);
    expect(result[1].date.getMonth()).toBe(baseDate.getMonth() + 1);
  });

  // ── endType: date ──────────────────────────────────────────
  it('stops expanding when past endDate', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'daily',
      frequency: 1,
      endType: 'date',
      endDate: '2024-06-17T23:59:59Z',
    });
    // baseDate = June 15, endDate = June 17, so 3 dates (15, 16, 17) + one iteration past
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  // ── safety valve ───────────────────────────────────────────
  it('stops at 365 iterations to prevent infinite loop', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'daily',
      frequency: 1,
      endType: 'date',
      endDate: '2030-01-01T00:00:00Z', // far future
    });
    expect(result.length).toBeLessThanOrEqual(366); // 365 + 1 (the break happens after count)
  });

  it('creates new Date objects for each entry', () => {
    const result = expandRecurrenceDates(baseDate, {
      pattern: 'daily',
      frequency: 1,
      endType: 'after',
      occurrences: 2,
    });
    expect(result[0].date).not.toBe(result[1].date);
  });
});
