/**
 * reservedBlockUtils — pure function tests
 *
 * Tests normalizeBlock and selectReservedSafe.
 * All functions are pure (no DOM, no window, no side effects).
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBlock,
  selectReservedSafe,
} from '../../../../src/courtboard/utils/reservedBlockUtils.js';

// Fixed reference: 2025-06-15 10:00:00 local
const NOW = new Date(2025, 5, 15, 10, 0, 0);

// Helper to create a block at fixed offsets from NOW
function makeBlock(opts = {}) {
  const startOffset = opts.startMinutes ?? -30;
  const endOffset = opts.endMinutes ?? 60;
  return {
    startTime: new Date(NOW.getTime() + startOffset * 60000).toISOString(),
    endTime: new Date(NOW.getTime() + endOffset * 60000).toISOString(),
    courtNumber: opts.courtNumber ?? 1,
    courts: opts.courts,
    reason: opts.reason,
    templateName: opts.templateName,
    // Allow alternate field names
    ...(opts.start !== undefined ? { start: opts.start, startTime: undefined } : {}),
    ...(opts.end !== undefined ? { end: opts.end, endTime: undefined } : {}),
  };
}

// ============================================================
// A) normalizeBlock
// ============================================================

describe('normalizeBlock', () => {
  it('returns null for null input', () => {
    expect(normalizeBlock(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeBlock(undefined)).toBeNull();
  });

  it('normalizes block with startTime/endTime fields', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courtNumber: 3,
      reason: 'Lesson',
    };
    const result = normalizeBlock(block);
    expect(result).not.toBeNull();
    expect(result!.courts).toEqual([3]);
    expect(result!.start).toEqual(new Date('2025-06-15T09:00:00Z'));
    expect(result!.end).toEqual(new Date('2025-06-15T11:00:00Z'));
    expect(result!.reason).toBe('Lesson');
  });

  it('normalizes block with start/end fields (alternate names)', () => {
    const block = {
      start: '2025-06-15T09:00:00Z',
      end: '2025-06-15T11:00:00Z',
      courtNumber: 2,
      reason: 'Clinic',
    };
    const result = normalizeBlock(block);
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date('2025-06-15T09:00:00Z'));
    expect(result!.end).toEqual(new Date('2025-06-15T11:00:00Z'));
    expect(result!.reason).toBe('Clinic');
  });

  it('prefers startTime over start when both present', () => {
    const block = {
      startTime: '2025-06-15T08:00:00Z',
      start: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courtNumber: 1,
    };
    const result = normalizeBlock(block);
    expect(result!.start).toEqual(new Date('2025-06-15T08:00:00Z'));
  });

  it('uses courts array when provided', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courts: [1, 2, 3],
      courtNumber: 5,
    };
    const result = normalizeBlock(block);
    expect(result!.courts).toEqual([1, 2, 3]);
  });

  it('falls back to courtNumber as single-element array', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courtNumber: 7,
    };
    const result = normalizeBlock(block);
    expect(result!.courts).toEqual([7]);
  });

  it('returns null when no courts and no courtNumber', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
    };
    const result = normalizeBlock(block);
    expect(result).toBeNull();
  });

  it('returns null when courtNumber is 0 (falsy) and no courts array', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courtNumber: 0,
    };
    const result = normalizeBlock(block);
    expect(result).toBeNull();
  });

  it('uses templateName as reason fallback', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courtNumber: 1,
      templateName: 'League Play',
    };
    const result = normalizeBlock(block);
    expect(result!.reason).toBe('League Play');
  });

  it('defaults reason to "Reserved" when no reason or templateName', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courtNumber: 1,
    };
    const result = normalizeBlock(block);
    expect(result!.reason).toBe('Reserved');
  });

  it('prefers reason over templateName', () => {
    const block = {
      startTime: '2025-06-15T09:00:00Z',
      endTime: '2025-06-15T11:00:00Z',
      courtNumber: 1,
      reason: 'Maintenance',
      templateName: 'League Play',
    };
    const result = normalizeBlock(block);
    expect(result!.reason).toBe('Maintenance');
  });
});

// ============================================================
// B) selectReservedSafe
// ============================================================

describe('selectReservedSafe', () => {
  it('returns empty array for null blocks', () => {
    expect(selectReservedSafe(null, NOW)).toEqual([]);
  });

  it('returns empty array for undefined blocks', () => {
    expect(selectReservedSafe(undefined, NOW)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(selectReservedSafe([], NOW)).toEqual([]);
  });

  it('returns active block (now between start and end)', () => {
    const block = makeBlock({ startMinutes: -30, endMinutes: 60, courtNumber: 1, reason: 'Lesson' });
    const result = selectReservedSafe([block], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('Lesson');
    expect(result[0].courts).toEqual([1]);
  });

  it('filters out expired blocks (end before now)', () => {
    const block = makeBlock({ startMinutes: -120, endMinutes: -30, courtNumber: 1 });
    const result = selectReservedSafe([block], NOW);
    expect(result).toEqual([]);
  });

  it('includes future blocks (start after now, end before endOfToday)', () => {
    const block = makeBlock({ startMinutes: 60, endMinutes: 180, courtNumber: 1, reason: 'Clinic' });
    const result = selectReservedSafe([block], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('Clinic');
  });

  it('filters out blocks starting after today', () => {
    // Block starting tomorrow
    const tomorrow = new Date(NOW);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 0, 0, 0);
    const block = {
      startTime: tomorrow.toISOString(),
      endTime: tomorrowEnd.toISOString(),
      courtNumber: 1,
    };
    const result = selectReservedSafe([block], NOW);
    expect(result).toEqual([]);
  });

  it('clamps block end to endOfToday for multi-day blocks', () => {
    // Block that ends tomorrow
    const tomorrow = new Date(NOW);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const block = {
      startTime: new Date(NOW.getTime() + 60 * 60000).toISOString(),
      endTime: tomorrow.toISOString(),
      courtNumber: 1,
      reason: 'Tournament',
    };
    const result = selectReservedSafe([block], NOW);
    expect(result).toHaveLength(1);
    // End should be clamped to 23:59:59.999 today
    const endOfToday = new Date(NOW);
    endOfToday.setHours(23, 59, 59, 999);
    expect(result[0].end.getTime()).toBe(endOfToday.getTime());
  });

  it('filters mixed active and expired blocks', () => {
    const expired = makeBlock({ startMinutes: -120, endMinutes: -30, courtNumber: 1, reason: 'Old' });
    const active = makeBlock({ startMinutes: -30, endMinutes: 60, courtNumber: 2, reason: 'Active' });
    const future = makeBlock({ startMinutes: 120, endMinutes: 240, courtNumber: 3, reason: 'Future' });
    const result = selectReservedSafe([expired, active, future], NOW);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.reason)).toEqual(['Active', 'Future']);
  });

  it('sorts by start time', () => {
    const later = makeBlock({ startMinutes: 120, endMinutes: 240, courtNumber: 1, reason: 'Later' });
    const sooner = makeBlock({ startMinutes: 30, endMinutes: 90, courtNumber: 2, reason: 'Sooner' });
    const result = selectReservedSafe([later, sooner], NOW);
    expect(result).toHaveLength(2);
    expect(result[0].reason).toBe('Sooner');
    expect(result[1].reason).toBe('Later');
  });

  it('groups blocks with same reason, start, and end into one entry', () => {
    const startTime = new Date(NOW.getTime() + 60 * 60000).toISOString();
    const endTime = new Date(NOW.getTime() + 120 * 60000).toISOString();
    const block1 = { startTime, endTime, courtNumber: 1, reason: 'Lesson' };
    const block2 = { startTime, endTime, courtNumber: 2, reason: 'Lesson' };
    const block3 = { startTime, endTime, courtNumber: 3, reason: 'Lesson' };
    const result = selectReservedSafe([block1, block2, block3], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].courts).toEqual([1, 2, 3]);
    expect(result[0].reason).toBe('Lesson');
  });

  it('does not group blocks with different reasons', () => {
    const startTime = new Date(NOW.getTime() + 60 * 60000).toISOString();
    const endTime = new Date(NOW.getTime() + 120 * 60000).toISOString();
    const block1 = { startTime, endTime, courtNumber: 1, reason: 'Lesson' };
    const block2 = { startTime, endTime, courtNumber: 2, reason: 'Clinic' };
    const result = selectReservedSafe([block1, block2], NOW);
    expect(result).toHaveLength(2);
  });

  it('does not group blocks with different start times', () => {
    const endTime = new Date(NOW.getTime() + 120 * 60000).toISOString();
    const block1 = {
      startTime: new Date(NOW.getTime() + 30 * 60000).toISOString(),
      endTime,
      courtNumber: 1,
      reason: 'Lesson',
    };
    const block2 = {
      startTime: new Date(NOW.getTime() + 60 * 60000).toISOString(),
      endTime,
      courtNumber: 2,
      reason: 'Lesson',
    };
    const result = selectReservedSafe([block1, block2], NOW);
    expect(result).toHaveLength(2);
  });

  it('sorts courts within a grouped entry', () => {
    const startTime = new Date(NOW.getTime() + 60 * 60000).toISOString();
    const endTime = new Date(NOW.getTime() + 120 * 60000).toISOString();
    const block1 = { startTime, endTime, courtNumber: 5, reason: 'Lesson' };
    const block2 = { startTime, endTime, courtNumber: 2, reason: 'Lesson' };
    const block3 = { startTime, endTime, courtNumber: 8, reason: 'Lesson' };
    const result = selectReservedSafe([block1, block2, block3], NOW);
    expect(result[0].courts).toEqual([2, 5, 8]);
  });

  it('skips null blocks in the input array', () => {
    const active = makeBlock({ startMinutes: -30, endMinutes: 60, courtNumber: 1, reason: 'Lesson' });
    const result = selectReservedSafe([null as any, active, undefined as any, null as any], NOW);
    expect(result).toHaveLength(1);
  });

  it('skips blocks with no court info (normalizeBlock returns null)', () => {
    const noCourt = {
      startTime: new Date(NOW.getTime() + 60 * 60000).toISOString(),
      endTime: new Date(NOW.getTime() + 120 * 60000).toISOString(),
      // no courts, no courtNumber
    };
    const valid = makeBlock({ startMinutes: 30, endMinutes: 90, courtNumber: 1, reason: 'Valid' });
    const result = selectReservedSafe([noCourt, valid], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('Valid');
  });

  it('returns key property with reason|startMs|endMs format', () => {
    const block = makeBlock({ startMinutes: 60, endMinutes: 120, courtNumber: 1, reason: 'Lesson' });
    const result = selectReservedSafe([block], NOW);
    expect(result[0].key).toMatch(/^Lesson\|\d+\|\d+$/);
  });

  it('handles blocks using courts array instead of courtNumber', () => {
    const block = {
      startTime: new Date(NOW.getTime() + 60 * 60000).toISOString(),
      endTime: new Date(NOW.getTime() + 120 * 60000).toISOString(),
      courts: [1, 3, 5],
      reason: 'League',
    };
    const result = selectReservedSafe([block], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].courts).toEqual([1, 3, 5]);
  });

  it('includes block that ends exactly at now + 1ms (end > now)', () => {
    // Block ends 1 minute from now — should be included
    const block = makeBlock({ startMinutes: -60, endMinutes: 1, courtNumber: 1, reason: 'Ending' });
    const result = selectReservedSafe([block], NOW);
    expect(result).toHaveLength(1);
  });

  it('defaults reason to "Reserved" for blocks with no reason/templateName', () => {
    const block = {
      startTime: new Date(NOW.getTime() + 60 * 60000).toISOString(),
      endTime: new Date(NOW.getTime() + 120 * 60000).toISOString(),
      courtNumber: 1,
    };
    const result = selectReservedSafe([block], NOW);
    expect(result[0].reason).toBe('Reserved');
  });

  it('deduplicates courts in a grouped entry', () => {
    const startTime = new Date(NOW.getTime() + 60 * 60000).toISOString();
    const endTime = new Date(NOW.getTime() + 120 * 60000).toISOString();
    // Same court number in two blocks with same key
    const block1 = { startTime, endTime, courtNumber: 1, reason: 'Lesson' };
    const block2 = { startTime, endTime, courtNumber: 1, reason: 'Lesson' };
    const result = selectReservedSafe([block1, block2], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].courts).toEqual([1]);
  });
});
