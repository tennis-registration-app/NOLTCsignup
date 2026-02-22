/**
 * courtUtils — pure function tests
 *
 * Tests classForStatus, namesFor, formatTime, computeClock.
 * All functions are pure (no React, no DOM, no side effects).
 * Time assertions use regex patterns to avoid locale/timezone sensitivity.
 */

import { describe, it, expect } from 'vitest';
import {
  classForStatus,
  namesFor,
  formatTime,
  computeClock,
} from '../../../../src/courtboard/utils/courtUtils.js';

// ============================================================
// A) classForStatus
// ============================================================

describe('classForStatus', () => {
  it('returns blue gradient for "occupied" status string', () => {
    expect(classForStatus('occupied')).toBe(
      'bg-gradient-to-b from-blue-300 to-blue-400 border-blue-300'
    );
  });

  it('returns blue gradient for occupied status object', () => {
    expect(classForStatus({ status: 'occupied' })).toBe(
      'bg-gradient-to-b from-blue-300 to-blue-400 border-blue-300'
    );
  });

  it('returns blue-500 for overtime when not selectable', () => {
    expect(classForStatus({ status: 'overtime', selectable: false })).toBe(
      'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-500'
    );
  });

  it('returns emerald-600 for overtime when selectable', () => {
    expect(classForStatus({ status: 'overtime', selectable: true })).toBe(
      'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-600'
    );
  });

  it('returns emerald-600 for "overtime-available"', () => {
    expect(classForStatus('overtime-available')).toBe(
      'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-600'
    );
  });

  it('returns green-600 for "overtimeAvailable" (camelCase variant)', () => {
    expect(classForStatus('overtimeAvailable')).toBe(
      'bg-gradient-to-b from-green-600 to-green-700 border-green-600'
    );
  });

  it('returns gray gradient for "wet"', () => {
    expect(classForStatus('wet')).toBe(
      'bg-gradient-to-b from-gray-300 to-gray-400 border-gray-300'
    );
  });

  it('returns slate gradient for "blocked"', () => {
    expect(classForStatus('blocked')).toBe(
      'bg-gradient-to-b from-slate-300 to-slate-400 border-slate-400'
    );
  });

  it('returns emerald (free) for "free" status', () => {
    expect(classForStatus('free')).toBe(
      'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-400'
    );
  });

  it('returns emerald (free) as default for unknown status', () => {
    expect(classForStatus('unknown-status')).toBe(
      'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-400'
    );
  });

  it('returns emerald (free) for null/undefined', () => {
    expect(classForStatus(null)).toBe(
      'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-400'
    );
    expect(classForStatus(undefined)).toBe(
      'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-400'
    );
  });

  it('returns blue-500 for overtime string (no selectable property)', () => {
    expect(classForStatus('overtime')).toBe(
      'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-500'
    );
  });
});

// ============================================================
// B) namesFor
// ============================================================

describe('namesFor', () => {
  it('returns empty string for null court', () => {
    expect(namesFor(null)).toBe('');
  });

  it('returns empty string for undefined court', () => {
    expect(namesFor(undefined)).toBe('');
  });

  it('returns empty string for court with no session and no history', () => {
    expect(namesFor({})).toBe('');
  });

  it('returns comma-separated names from session.group.players', () => {
    const court = {
      session: {
        group: {
          players: [{ name: 'Alice' }, { name: 'Bob' }],
        },
      },
    };
    expect(namesFor(court)).toBe('Alice, Bob');
  });

  it('returns single name from session.group.players', () => {
    const court = {
      session: {
        group: {
          players: [{ name: 'Alice' }],
        },
      },
    };
    expect(namesFor(court)).toBe('Alice');
  });

  it('filters out players with no name', () => {
    const court = {
      session: {
        group: {
          players: [{ name: 'Alice' }, { name: null }, { name: 'Bob' }, {}],
        },
      },
    };
    expect(namesFor(court)).toBe('Alice, Bob');
  });

  it('returns empty string when all players lack names', () => {
    const court = {
      session: {
        group: {
          players: [{ id: 1 }, { id: 2 }],
        },
      },
    };
    expect(namesFor(court)).toBe('');
  });

  it('falls back to last history entry when no session.group.players', () => {
    const court = {
      history: [
        { players: [{ name: 'Old1' }] },
        { players: [{ name: 'Recent1' }, { name: 'Recent2' }] },
      ],
    };
    expect(namesFor(court)).toBe('Recent1, Recent2');
  });

  it('filters out nameless players in history fallback', () => {
    const court = {
      history: [{ players: [{ name: 'Alice' }, {}, { name: 'Charlie' }] }],
    };
    expect(namesFor(court)).toBe('Alice, Charlie');
  });

  it('returns empty string when history exists but last entry has no players', () => {
    const court = {
      history: [{ players: [{ name: 'Alice' }] }, { noPlayers: true }],
    };
    expect(namesFor(court)).toBe('');
  });

  it('returns empty string for empty history array', () => {
    const court = { history: [] };
    expect(namesFor(court)).toBe('');
  });

  it('prefers session.group.players over history', () => {
    const court = {
      session: { group: { players: [{ name: 'SessionPlayer' }] } },
      history: [{ players: [{ name: 'HistoryPlayer' }] }],
    };
    expect(namesFor(court)).toBe('SessionPlayer');
  });
});

// ============================================================
// C) formatTime
// ============================================================

describe('formatTime', () => {
  it('returns null for null input', () => {
    expect(formatTime(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatTime(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatTime('')).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(formatTime('not-a-date')).toBeNull();
  });

  it('returns time string matching HH:MM pattern for valid Date', () => {
    const d = new Date(2025, 0, 15, 14, 30, 0);
    const result = formatTime(d);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns time string matching HH:MM pattern for ISO string', () => {
    const result = formatTime('2025-06-15T09:45:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns a non-null string for midnight', () => {
    const d = new Date(2025, 5, 1, 0, 0, 0);
    const result = formatTime(d);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns null for 0 (falsy)', () => {
    expect(formatTime(0)).toBeNull();
  });
});

// ============================================================
// D) computeClock
// ============================================================

describe('computeClock', () => {
  // Fixed reference time: 2025-06-15 10:00:00
  const NOW = new Date(2025, 5, 15, 10, 0, 0);

  // --- free ---

  it('returns "Available" for free status', () => {
    const result = computeClock('free', {}, NOW);
    expect(result.primary).toBe('Available');
    expect(result.secondary).toBe('');
  });

  // --- wet ---

  it('returns WET COURT for wet status', () => {
    const result = computeClock('wet', {}, NOW);
    expect(result.primary).toContain('WET COURT');
    expect(result.secondary).toBe('');
  });

  // --- occupied with future end time ---

  it('returns remaining minutes for occupied court with future endTime', () => {
    const endAt = new Date(NOW.getTime() + 45 * 60000); // 45 min from now
    const court = { session: { scheduledEndAt: endAt.toISOString() } };
    const result = computeClock('occupied', court, NOW);
    expect(result.primary).toBe('45 min');
    expect(result.secondary).toMatch(/Until\s+\d{1,2}:\d{2}/);
  });

  it('rounds up remaining minutes (ceil)', () => {
    const endAt = new Date(NOW.getTime() + 30.5 * 60000); // 30.5 min → ceil to 31
    const court = { session: { scheduledEndAt: endAt.toISOString() } };
    const result = computeClock('occupied', court, NOW);
    expect(result.primary).toBe('31 min');
  });

  it('returns 0 min when end time equals now exactly', () => {
    // end === now means end > now is false, so falls through to overtime label
    const court = { session: { scheduledEndAt: NOW.toISOString() } };
    const result = computeClock('occupied', court, NOW);
    // end is NOT > now, so getOvertimeLabel is called; minutesOver = 0 → 'Overtime'
    expect(result.primary).toBe('Overtime');
    expect(result.secondary).toBe('');
  });

  // --- occupied past end time (overtime label) ---

  it('returns "+X min over" for occupied court past end time', () => {
    const endAt = new Date(NOW.getTime() - 10 * 60000); // 10 min ago
    const court = { session: { scheduledEndAt: endAt.toISOString() } };
    const result = computeClock('occupied', court, NOW);
    expect(result.primary).toBe('+10 min over');
    expect(result.secondary).toBe('');
  });

  it('returns "Overtime" for occupied court with no end time', () => {
    const result = computeClock('occupied', {}, NOW);
    expect(result.primary).toBe('Overtime');
    expect(result.secondary).toBe('');
  });

  it('returns "Overtime" for occupied court with null session', () => {
    const result = computeClock('occupied', null, NOW);
    expect(result.primary).toBe('Overtime');
    expect(result.secondary).toBe('');
  });

  // --- overtime status ---

  it('returns overtime label for overtime status with no start time', () => {
    const result = computeClock('overtime', {}, NOW);
    expect(result.primary).toBe('Overtime');
    expect(result.secondary).toBe('');
  });

  it('returns "+X min over" for overtime with end time in past', () => {
    const endAt = new Date(NOW.getTime() - 20 * 60000);
    const court = { session: { scheduledEndAt: endAt.toISOString() } };
    const result = computeClock('overtime', court, NOW);
    expect(result.primary).toBe('+20 min over');
    expect(result.secondary).toBe('');
  });

  it('returns "check status" when playing time exceeds checkStatusMinutes', () => {
    const startAt = new Date(NOW.getTime() - 160 * 60000); // 160 min ago
    const endAt = new Date(NOW.getTime() - 10 * 60000); // ended 10 min ago
    const court = {
      session: {
        startedAt: startAt.toISOString(),
        scheduledEndAt: endAt.toISOString(),
      },
    };
    const result = computeClock('overtime', court, NOW, 150);
    expect(result.primary).toBe('+10 min over');
    expect(result.secondary).toBe('check status');
    expect(result.secondaryColor).toBe('yellow');
  });

  it('does not show "check status" when playing time is under threshold', () => {
    const startAt = new Date(NOW.getTime() - 100 * 60000); // 100 min ago
    const endAt = new Date(NOW.getTime() - 5 * 60000);
    const court = {
      session: {
        startedAt: startAt.toISOString(),
        scheduledEndAt: endAt.toISOString(),
      },
    };
    const result = computeClock('overtime', court, NOW, 150);
    expect(result.primary).toBe('+5 min over');
    expect(result.secondary).toBe('');
    expect(result.secondaryColor).toBeUndefined();
  });

  it('does not show "check status" when checkStatusMinutes is 0', () => {
    const startAt = new Date(NOW.getTime() - 200 * 60000);
    const endAt = new Date(NOW.getTime() - 50 * 60000);
    const court = {
      session: {
        startedAt: startAt.toISOString(),
        scheduledEndAt: endAt.toISOString(),
      },
    };
    const result = computeClock('overtime', court, NOW, 0);
    expect(result.primary).toBe('+50 min over');
    expect(result.secondary).toBe('');
  });

  it('returns "Overtime" for overtime with no endTime but with startedAt (under threshold)', () => {
    const startAt = new Date(NOW.getTime() - 60 * 60000); // 60 min ago
    const court = { session: { startedAt: startAt.toISOString() } };
    const result = computeClock('overtime', court, NOW, 150);
    // endTime is null → getOvertimeLabel returns 'Overtime'
    expect(result.primary).toBe('Overtime');
    expect(result.secondary).toBe('');
  });

  it('returns "check status" for overtime with no endTime but startedAt over threshold', () => {
    const startAt = new Date(NOW.getTime() - 200 * 60000); // 200 min ago
    const court = { session: { startedAt: startAt.toISOString() } };
    const result = computeClock('overtime', court, NOW, 150);
    // endTime is null → getOvertimeLabel returns 'Overtime'
    expect(result.primary).toBe('Overtime');
    expect(result.secondary).toBe('check status');
    expect(result.secondaryColor).toBe('yellow');
  });

  // --- blocked ---

  it('returns "BLOCKED" as default label for blocked court with no reason', () => {
    const result = computeClock('blocked', {}, NOW);
    expect(result.primary).toBe('BLOCKED');
    expect(result.secondary).toBe('');
  });

  it('returns "BLOCKED" for null courtObj', () => {
    const result = computeClock('blocked', null, NOW);
    expect(result.primary).toBe('BLOCKED');
  });

  it('maps "maintenance" reason to "COURT WORK"', () => {
    const result = computeClock('blocked', { reason: 'maintenance' }, NOW);
    expect(result.primary).toBe('COURT WORK');
  });

  it('maps "Court Work" blockedLabel to "COURT WORK"', () => {
    const result = computeClock('blocked', { blockedLabel: 'Court Work' }, NOW);
    expect(result.primary).toBe('COURT WORK');
  });

  it('maps "lesson" reason to "LESSON"', () => {
    const result = computeClock('blocked', { reason: 'lesson' }, NOW);
    expect(result.primary).toBe('LESSON');
  });

  it('maps "clinic" reason to "CLINIC"', () => {
    const result = computeClock('blocked', { reason: 'clinic' }, NOW);
    expect(result.primary).toBe('CLINIC');
  });

  it('maps "league" reason to "LEAGUE"', () => {
    const result = computeClock('blocked', { reason: 'league play' }, NOW);
    expect(result.primary).toBe('LEAGUE');
  });

  it('uppercases unknown reason as-is', () => {
    const result = computeClock('blocked', { reason: 'Tournament' }, NOW);
    expect(result.primary).toBe('TOURNAMENT');
  });

  it('prefers blockedLabel over reason', () => {
    const result = computeClock('blocked', { blockedLabel: 'Lesson', reason: 'other' }, NOW);
    expect(result.primary).toBe('LESSON');
  });

  it('includes "Until" secondary with valid blockedEnd', () => {
    const endAt = new Date(NOW.getTime() + 60 * 60000);
    const court = { reason: 'lesson', blockedEnd: endAt.toISOString() };
    const result = computeClock('blocked', court, NOW);
    expect(result.primary).toBe('LESSON');
    expect(result.secondary).toMatch(/Until\s+\d{1,2}:\d{2}/);
  });

  it('returns empty secondary for blocked with no blockedEnd', () => {
    const result = computeClock('blocked', { reason: 'clinic' }, NOW);
    expect(result.secondary).toBe('');
  });

  it('returns empty secondary for blocked with invalid blockedEnd', () => {
    const result = computeClock('blocked', { reason: 'clinic', blockedEnd: 'not-a-date' }, NOW);
    expect(result.secondary).toBe('');
  });

  // --- unknown / default ---

  it('returns empty primary and secondary for unknown status', () => {
    const result = computeClock('something-else', {}, NOW);
    expect(result.primary).toBe('');
    expect(result.secondary).toBe('');
  });

  it('returns empty primary and secondary for null status', () => {
    const result = computeClock(null, {}, NOW);
    expect(result.primary).toBe('');
    expect(result.secondary).toBe('');
  });
});
