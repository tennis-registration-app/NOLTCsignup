/**
 * courtStatusUtils Unit Tests
 *
 * Tests the 4 pure functions extracted from CourtStatusGrid.
 * All functions are stateless — no mocks needed.
 */
import { describe, it, expect } from 'vitest';
import {
  getCourtStatus,
  getStatusColor,
  formatTimeRemaining,
  getPlayerNames,
} from '../../../../src/admin/courts/courtStatusUtils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the deps bag for getCourtStatus with sensible defaults. */
function makeDeps(overrides = {}) {
  const now = new Date('2025-06-15T14:00:00Z');
  return {
    wetCourts: new Set(),
    courtBlocks: [],
    selectedDate: now,
    currentTime: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getCourtStatus — priority cascade
// ---------------------------------------------------------------------------

describe('getCourtStatus', () => {
  it('returns wet when block.reason contains "wet"', () => {
    const court = {
      block: { id: 'b1', reason: 'WET COURT - Rain' },
    };
    const result = getCourtStatus(court, 1, makeDeps());
    expect(result.status).toBe('wet');
    expect(result.info.type).toBe('wet');
  });

  it('returns wet when wetCourts Set has courtNumber', () => {
    const deps = makeDeps({ wetCourts: new Set([3]) });
    const result = getCourtStatus(null, 3, deps);
    expect(result.status).toBe('wet');
  });

  it('returns blocked when courtBlocks has matching active block on today', () => {
    // Use real today so the code takes the "today" branch (time-active check)
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const blockStart = new Date(now);
    blockStart.setHours(13, 0, 0, 0);
    const blockEnd = new Date(now);
    blockEnd.setHours(15, 0, 0, 0);

    const block = {
      courtNumber: 2,
      isWetCourt: false,
      startTime: blockStart.toISOString(),
      endTime: blockEnd.toISOString(),
      id: 'block-1',
      reason: 'Tournament',
    };
    const deps = makeDeps({ courtBlocks: [block], currentTime: now, selectedDate: now });
    const result = getCourtStatus(null, 2, deps);
    expect(result.status).toBe('blocked');
    expect(result.info.reason).toBe('Tournament');
    expect(result.info.type).toBe('block');
  });

  it('returns blocked for future date (any block on that date)', () => {
    const today = new Date('2025-06-15T14:00:00Z');
    const futureDate = new Date('2025-06-20T10:00:00Z');
    const block = {
      courtNumber: 1,
      isWetCourt: false,
      startTime: '2025-06-20T08:00:00Z',
      endTime: '2025-06-20T12:00:00Z',
      id: 'block-2',
      reason: 'Maintenance',
    };
    const deps = makeDeps({
      courtBlocks: [block],
      currentTime: today,
      selectedDate: futureDate,
    });
    const result = getCourtStatus(null, 1, deps);
    expect(result.status).toBe('blocked');
  });

  it('does NOT return blocked for expired block on today', () => {
    // selectedDate must match real "today" so the code takes the today branch
    // which filters to only currently-active blocks
    const realToday = new Date();
    const now = new Date(realToday);
    now.setHours(14, 0, 0, 0);

    const expiredStart = new Date(realToday);
    expiredStart.setHours(10, 0, 0, 0);
    const expiredEnd = new Date(realToday);
    expiredEnd.setHours(12, 0, 0, 0); // ended 2 hours ago

    const expiredBlock = {
      courtNumber: 1,
      isWetCourt: false,
      startTime: expiredStart.toISOString(),
      endTime: expiredEnd.toISOString(),
      id: 'block-3',
      reason: 'Lesson',
    };
    const deps = makeDeps({ courtBlocks: [expiredBlock], currentTime: now, selectedDate: now });
    const result = getCourtStatus(null, 1, deps);
    expect(result.status).toBe('available');
  });

  it('returns occupied for court with legacy players format', () => {
    const now = new Date('2025-06-15T14:00:00Z');
    const court = {
      players: [{ displayName: 'Alice' }],
      startTime: '2025-06-15T13:00:00Z',
      endTime: '2025-06-15T15:00:00Z',
      sessionId: 'sess-1',
      duration: 120,
    };
    const result = getCourtStatus(court, 1, makeDeps({ currentTime: now }));
    expect(result.status).toBe('occupied');
    expect(result.info.type).toBe('game');
    expect(result.info.players).toEqual([{ displayName: 'Alice' }]);
  });

  it('returns occupied for court with domain session.group.players format', () => {
    const now = new Date('2025-06-15T14:00:00Z');
    const court = {
      session: {
        id: 'sess-2',
        group: { players: [{ displayName: 'Bob' }] },
        startedAt: '2025-06-15T13:00:00Z',
        scheduledEndAt: '2025-06-15T15:00:00Z',
        duration: 120,
      },
    };
    const result = getCourtStatus(court, 2, makeDeps({ currentTime: now }));
    expect(result.status).toBe('occupied');
    expect(result.info.sessionId).toBe('sess-2');
  });

  it('returns overtime when occupied AND currentTime > endTime', () => {
    const now = new Date('2025-06-15T16:00:00Z'); // 1 hour past end
    const court = {
      players: [{ displayName: 'Alice' }],
      startTime: '2025-06-15T13:00:00Z',
      endTime: '2025-06-15T15:00:00Z',
    };
    const result = getCourtStatus(court, 1, makeDeps({ currentTime: now }));
    expect(result.status).toBe('overtime');
  });

  it('returns overtime for domain format when currentTime > scheduledEndAt', () => {
    const now = new Date('2025-06-15T16:00:00Z');
    const court = {
      session: {
        id: 'sess-3',
        group: { players: [{ displayName: 'Charlie' }] },
        startedAt: '2025-06-15T13:00:00Z',
        scheduledEndAt: '2025-06-15T15:00:00Z',
      },
    };
    const result = getCourtStatus(court, 1, makeDeps({ currentTime: now }));
    expect(result.status).toBe('overtime');
  });

  it('returns available for empty court with no blocks', () => {
    const result = getCourtStatus(null, 5, makeDeps());
    expect(result.status).toBe('available');
    expect(result.info).toBeNull();
  });

  it('returns available for court with empty players array', () => {
    const court = { players: [] };
    const result = getCourtStatus(court, 1, makeDeps());
    expect(result.status).toBe('available');
  });

  it('priority: wet wins over occupied court', () => {
    const court = {
      block: { id: 'b1', reason: 'Wet conditions' },
      players: [{ displayName: 'Alice' }],
      startTime: '2025-06-15T13:00:00Z',
      endTime: '2025-06-15T15:00:00Z',
    };
    const result = getCourtStatus(court, 1, makeDeps());
    expect(result.status).toBe('wet');
  });

  it('priority: blocked wins over occupied court', () => {
    // Use real today for the today-branch time-active check
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const start = new Date(now);
    start.setHours(13, 0, 0, 0);
    const end = new Date(now);
    end.setHours(15, 0, 0, 0);

    const court = {
      players: [{ displayName: 'Alice' }],
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
    const block = {
      courtNumber: 1,
      isWetCourt: false,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      id: 'block-4',
      reason: 'Event',
    };
    const deps = makeDeps({ courtBlocks: [block], currentTime: now, selectedDate: now });
    const result = getCourtStatus(court, 1, deps);
    expect(result.status).toBe('blocked');
  });

  it('ignores blocks for different court numbers', () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const start = new Date(now);
    start.setHours(13, 0, 0, 0);
    const end = new Date(now);
    end.setHours(15, 0, 0, 0);

    const block = {
      courtNumber: 2, // block is for court 2
      isWetCourt: false,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      id: 'block-5',
      reason: 'Lesson',
    };
    const deps = makeDeps({ courtBlocks: [block], currentTime: now, selectedDate: now });
    const result = getCourtStatus(null, 1, deps); // checking court 1
    expect(result.status).toBe('available');
  });

  it('ignores wet court blocks in the courtBlocks search', () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const start = new Date(now);
    start.setHours(13, 0, 0, 0);
    const end = new Date(now);
    end.setHours(15, 0, 0, 0);

    const wetBlock = {
      courtNumber: 1,
      isWetCourt: true,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      id: 'wet-1',
      reason: 'WET COURT',
    };
    // Court has no wet block.reason, and not in wetCourts set
    const deps = makeDeps({ courtBlocks: [wetBlock], currentTime: now, selectedDate: now });
    const result = getCourtStatus(null, 1, deps);
    // The isWetCourt block should be filtered out by the courtBlocks search
    expect(result.status).toBe('available');
  });
});

// ---------------------------------------------------------------------------
// getStatusColor — all 6 branches
// ---------------------------------------------------------------------------

describe('getStatusColor', () => {
  it.each([
    ['available', 'bg-green-100 border-green-300'],
    ['occupied', 'bg-blue-100 border-blue-300'],
    ['overtime', 'bg-gray-100 border-gray-300'],
    ['blocked', 'bg-amber-50 border-amber-300'],
    ['wet', 'bg-gray-200 border-gray-400'],
  ])('maps "%s" to correct tailwind classes', (status, expected) => {
    expect(getStatusColor(status)).toBe(expected);
  });

  it('returns default for unknown status', () => {
    expect(getStatusColor('mystery')).toBe('bg-gray-100 border-gray-300');
  });

  it('returns default for undefined', () => {
    expect(getStatusColor(undefined)).toBe('bg-gray-100 border-gray-300');
  });
});

// ---------------------------------------------------------------------------
// formatTimeRemaining
// ---------------------------------------------------------------------------

describe('formatTimeRemaining', () => {
  it('30 minutes left → "30m left"', () => {
    const now = new Date('2025-06-15T14:00:00Z');
    const end = new Date('2025-06-15T14:30:00Z');
    expect(formatTimeRemaining(end, now)).toBe('30m left');
  });

  it('90 minutes left → "1h 30m left"', () => {
    const now = new Date('2025-06-15T14:00:00Z');
    const end = new Date('2025-06-15T15:30:00Z');
    expect(formatTimeRemaining(end, now)).toBe('1h 30m left');
  });

  it('exactly 60 minutes left → "1h 0m left"', () => {
    const now = new Date('2025-06-15T14:00:00Z');
    const end = new Date('2025-06-15T15:00:00Z');
    expect(formatTimeRemaining(end, now)).toBe('1h 0m left');
  });

  it('5 minutes over → "5m over"', () => {
    const now = new Date('2025-06-15T14:05:00Z');
    const end = new Date('2025-06-15T14:00:00Z');
    expect(formatTimeRemaining(end, now)).toBe('5m over');
  });

  it('75 minutes over → "1h 15m over"', () => {
    const now = new Date('2025-06-15T15:15:00Z');
    const end = new Date('2025-06-15T14:00:00Z');
    expect(formatTimeRemaining(end, now)).toBe('1h 15m over');
  });

  it('exactly 60 minutes over → "1h over"', () => {
    const now = new Date('2025-06-15T15:00:00Z');
    const end = new Date('2025-06-15T14:00:00Z');
    expect(formatTimeRemaining(end, now)).toBe('1h over');
  });

  it('exactly 0 → "0m left"', () => {
    const now = new Date('2025-06-15T14:00:00Z');
    expect(formatTimeRemaining(now, now)).toBe('0m left');
  });

  it('accepts string endTime', () => {
    const now = new Date('2025-06-15T14:00:00Z');
    expect(formatTimeRemaining('2025-06-15T14:45:00Z', now)).toBe('45m left');
  });
});

// ---------------------------------------------------------------------------
// getPlayerNames
// ---------------------------------------------------------------------------

describe('getPlayerNames', () => {
  it('returns "No players" for null', () => {
    expect(getPlayerNames(null)).toBe('No players');
  });

  it('returns "No players" for undefined', () => {
    expect(getPlayerNames(undefined)).toBe('No players');
  });

  it('returns "No players" for empty array', () => {
    expect(getPlayerNames([])).toBe('No players');
  });

  it('single player with displayName → last name', () => {
    expect(getPlayerNames([{ displayName: 'John Smith' }])).toBe('Smith');
  });

  it('two players → "LastA & LastB"', () => {
    const players = [{ displayName: 'John Smith' }, { displayName: 'Jane Jones' }];
    expect(getPlayerNames(players)).toBe('Smith & Jones');
  });

  it('four players → all last names joined', () => {
    const players = [
      { displayName: 'Alice Adams' },
      { displayName: 'Bob Baker' },
      { displayName: 'Carol Chen' },
      { displayName: 'Dave Davis' },
    ];
    expect(getPlayerNames(players)).toBe('Adams & Baker & Chen & Davis');
  });

  it('falls back from displayName → name', () => {
    expect(getPlayerNames([{ name: 'Mike Miller' }])).toBe('Miller');
  });

  it('falls back from name → playerName', () => {
    expect(getPlayerNames([{ playerName: 'Pat Parker' }])).toBe('Parker');
  });

  it('falls back to "Unknown" when no name fields', () => {
    expect(getPlayerNames([{}])).toBe('Unknown');
  });

  it('single-word name → uses that word', () => {
    expect(getPlayerNames([{ displayName: 'Madonna' }])).toBe('Madonna');
  });
});
