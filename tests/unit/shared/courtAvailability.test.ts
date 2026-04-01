import { describe, it, expect } from 'vitest';
import {
  isOccupiedNow,
  isBlockedNow,
  isWetNow,
  isActiveInterval,
  isPlayableNow,
  countPlayableCourts,
  listPlayableCourts,
} from '../../../src/shared/courts/courtAvailability.js';

describe('isActiveInterval', () => {
  it('returns true when now is within interval', () => {
    const now = '2024-01-15T10:30:00Z';
    const start = '2024-01-15T10:00:00Z';
    const end = '2024-01-15T11:00:00Z';
    expect(isActiveInterval(now, start, end)).toBe(true);
  });

  it('returns false when now is before interval', () => {
    const now = '2024-01-15T09:00:00Z';
    const start = '2024-01-15T10:00:00Z';
    const end = '2024-01-15T11:00:00Z';
    expect(isActiveInterval(now, start, end)).toBe(false);
  });

  it('returns false when now is after interval', () => {
    const now = '2024-01-15T12:00:00Z';
    const start = '2024-01-15T10:00:00Z';
    const end = '2024-01-15T11:00:00Z';
    expect(isActiveInterval(now, start, end)).toBe(false);
  });

  it('returns true when now equals start time', () => {
    const now = '2024-01-15T10:00:00Z';
    const start = '2024-01-15T10:00:00Z';
    const end = '2024-01-15T11:00:00Z';
    expect(isActiveInterval(now, start, end)).toBe(true);
  });

  it('returns false when now equals end time (exclusive)', () => {
    const now = '2024-01-15T11:00:00Z';
    const start = '2024-01-15T10:00:00Z';
    const end = '2024-01-15T11:00:00Z';
    expect(isActiveInterval(now, start, end)).toBe(false);
  });
});

describe('isOccupiedNow', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns false when court has no session', () => {
    const court = { session: null };
    expect(isOccupiedNow(court as any, now)).toBe(false);
  });

  it('returns false when court is undefined', () => {
    expect(isOccupiedNow(undefined as any, now)).toBe(false);
  });

  it('returns true when court has active session', () => {
    const court = {
      session: { scheduledEndAt: '2024-01-15T11:00:00Z' },
    };
    expect(isOccupiedNow(court as any, now)).toBe(true);
  });

  it('returns false when session is in overtime (past end time)', () => {
    const court = {
      session: { scheduledEndAt: '2024-01-15T09:00:00Z' },
    };
    expect(isOccupiedNow(court as any, now)).toBe(false);
  });

  it('returns false when court has isOvertime flag set', () => {
    const court = {
      isOvertime: true,
      session: { scheduledEndAt: '2024-01-15T09:00:00Z' },
    };
    expect(isOccupiedNow(court as any, now)).toBe(false);
  });

  it('handles different end time field names', () => {
    const courtWithEndTime = {
      session: { endTime: '2024-01-15T11:00:00Z' },
    };
    expect(isOccupiedNow(courtWithEndTime as any, now)).toBe(true);

    const courtWithEndsAt = {
      session: { endsAt: '2024-01-15T11:00:00Z' },
    };
    expect(isOccupiedNow(courtWithEndsAt as any, now)).toBe(true);
  });
});

describe('isBlockedNow', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns false when no blocks exist', () => {
    expect(isBlockedNow(1, [], now)).toBe(false);
  });

  it('returns false when blocks is null/undefined', () => {
    expect(isBlockedNow(1, null as any, now)).toBe(false);
    expect(isBlockedNow(1, undefined as any, now)).toBe(false);
  });

  it('returns true when block is currently active', () => {
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks as any, now)).toBe(true);
  });

  it('returns false when block has expired', () => {
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T08:00:00Z',
        endsAt: '2024-01-15T09:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks as any, now)).toBe(false);
  });

  it('returns false when block is for different court', () => {
    const blocks = [
      {
        courtNumber: 2,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks as any, now)).toBe(false);
  });

  it('returns true when block has no times (assumes active)', () => {
    const blocks = [{ courtNumber: 1 }];
    expect(isBlockedNow(1, blocks as any, now)).toBe(true);
  });
});

describe('isPlayableNow', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns true for empty court with no blocks', () => {
    const court = { session: null };
    expect(isPlayableNow(court as any, 1, [], now)).toBe(true);
  });

  it('returns false for occupied court', () => {
    const court = { session: { scheduledEndAt: '2024-01-15T11:00:00Z' } };
    expect(isPlayableNow(court as any, 1, [], now)).toBe(false);
  });

  it('returns false for blocked court', () => {
    const court = { session: null };
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isPlayableNow(court as any, 1, blocks as any, now)).toBe(false);
  });

  it('returns true for overtime court', () => {
    const court = { session: { scheduledEndAt: '2024-01-15T09:00:00Z' } };
    expect(isPlayableNow(court as any, 1, [], now)).toBe(true);
  });
});

describe('countPlayableCourts', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns 0 for empty courts array', () => {
    expect(countPlayableCourts([], [], now)).toBe(0);
  });

  it('returns 0 for null courts', () => {
    expect(countPlayableCourts(null as any, [], now)).toBe(0);
  });

  it('counts available courts correctly', () => {
    const courts = [
      { number: 1, session: null },
      { number: 2, session: { scheduledEndAt: '2024-01-15T11:00:00Z' } },
      { number: 3, session: null },
    ];
    expect(countPlayableCourts(courts as any, [], now)).toBe(2);
  });

  it('excludes blocked courts from count', () => {
    const courts = [{ number: 1, session: null }, { number: 2, session: null }];
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(countPlayableCourts(courts as any, blocks as any, now)).toBe(1);
  });

  it('counts overtime courts as playable', () => {
    const courts = [
      { number: 1, session: { scheduledEndAt: '2024-01-15T09:00:00Z' } }, // overtime
      { number: 2, session: { scheduledEndAt: '2024-01-15T11:00:00Z' } }, // active
    ];
    expect(countPlayableCourts(courts as any, [], now)).toBe(1);
  });

  it('derives courtNumber from court.courtNumber field', () => {
    const courts = [{ courtNumber: 1, session: null }];
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(countPlayableCourts(courts as any, blocks as any, now)).toBe(0);
  });

  it('falls back to index+1 when court has no number fields', () => {
    // Court at index 0 → courtNumber 1
    const courts = [{ session: null }];
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(countPlayableCourts(courts as any, blocks as any, now)).toBe(0);
  });

  it('returns full count when all courts are free', () => {
    const courts = [
      { number: 1, session: null },
      { number: 2, session: null },
      { number: 3, session: null },
    ];
    expect(countPlayableCourts(courts as any, [], now)).toBe(3);
  });

  it('returns 0 when all courts are blocked', () => {
    const courts = [{ number: 1, session: null }, { number: 2, session: null }];
    const blocks = [
      { courtNumber: 1, startsAt: '2024-01-15T09:00:00Z', endsAt: '2024-01-15T11:00:00Z' },
      { courtNumber: 2, startsAt: '2024-01-15T09:00:00Z', endsAt: '2024-01-15T11:00:00Z' },
    ];
    expect(countPlayableCourts(courts as any, blocks as any, now)).toBe(0);
  });
});

// ============================================================
// isOccupiedNow — additional branch coverage
// ============================================================
describe('isOccupiedNow (branch gaps)', () => {
  const now = '2024-01-15T10:00:00Z';

  it('handles ends_at field name (4th fallback)', () => {
    const court = { session: { ends_at: '2024-01-15T11:00:00Z' } };
    expect(isOccupiedNow(court as any, now)).toBe(true);
  });

  it('returns true when session has no end time fields (session exists, no end time)', () => {
    const court = { session: { id: 'sess-1' } };
    expect(isOccupiedNow(court as any, now)).toBe(true);
  });

  it('isOvertime flag takes precedence over future end time', () => {
    const court = {
      isOvertime: true,
      session: { scheduledEndAt: '2024-01-15T11:00:00Z' }, // future = normally active
    };
    expect(isOccupiedNow(court as any, now)).toBe(false);
  });

  it('returns false when court is null', () => {
    expect(isOccupiedNow(null as any, now)).toBe(false);
  });

  it('isOvertime false does not skip end time check', () => {
    const court = {
      isOvertime: false,
      session: { scheduledEndAt: '2024-01-15T09:00:00Z' },
    };
    // isOvertime !== true (strict), so falls through to end time check → overtime
    expect(isOccupiedNow(court as any, now)).toBe(false);
  });
});

// ============================================================
// isBlockedNow — additional branch coverage
// ============================================================
describe('isBlockedNow (branch gaps)', () => {
  const now = '2024-01-15T10:00:00Z';

  it('recognizes startTime/endTime field names', () => {
    const blocks = [
      {
        courtNumber: 1,
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks as any, now)).toBe(true);
  });

  it('recognizes start/end field names', () => {
    const blocks = [
      {
        courtNumber: 1,
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks as any, now)).toBe(true);
  });

  it('multiple blocks, only one active for the court', () => {
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T06:00:00Z',
        endsAt: '2024-01-15T07:00:00Z', // expired
      },
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z', // active
      },
    ];
    expect(isBlockedNow(1, blocks as any, now)).toBe(true);
  });

  it('multiple blocks, none active for the court', () => {
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T06:00:00Z',
        endsAt: '2024-01-15T07:00:00Z',
      },
      {
        courtNumber: 1,
        startsAt: '2024-01-15T12:00:00Z',
        endsAt: '2024-01-15T13:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks as any, now)).toBe(false);
  });
});

// ============================================================
// isWetNow
// ============================================================
describe('isWetNow', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns false when blocks is null', () => {
    expect(isWetNow(1, null as any, now)).toBe(false);
  });

  it('returns false when blocks is empty', () => {
    expect(isWetNow(1, [], now)).toBe(false);
  });

  it('returns true for active wet block on this court', () => {
    const blocks = [
      {
        courtNumber: 1,
        isWetCourt: true,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isWetNow(1, blocks as any, now)).toBe(true);
  });

  it('returns false for wet block on a different court', () => {
    const blocks = [
      {
        courtNumber: 2,
        isWetCourt: true,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isWetNow(1, blocks as any, now)).toBe(false);
  });

  it('returns false for non-wet block on this court', () => {
    const blocks = [
      {
        courtNumber: 1,
        isWetCourt: false,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isWetNow(1, blocks as any, now)).toBe(false);
  });

  it('returns false when wet block has expired', () => {
    const blocks = [
      {
        courtNumber: 1,
        isWetCourt: true,
        startsAt: '2024-01-15T07:00:00Z',
        endsAt: '2024-01-15T08:00:00Z',
      },
    ];
    expect(isWetNow(1, blocks as any, now)).toBe(false);
  });

  it('returns true for wet block with no times (assumes active)', () => {
    const blocks = [{ courtNumber: 1, isWetCourt: true }];
    expect(isWetNow(1, blocks as any, now)).toBe(true);
  });

  it('returns false for block with no isWetCourt flag', () => {
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isWetNow(1, blocks as any, now)).toBe(false);
  });
});

// ============================================================
// isPlayableNow — additional branch coverage
// ============================================================
describe('isPlayableNow (branch gaps)', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns false when both occupied and blocked', () => {
    const court = { session: { scheduledEndAt: '2024-01-15T11:00:00Z' } };
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isPlayableNow(court as any, 1, blocks as any, now)).toBe(false);
  });

  it('returns true for null court (no session)', () => {
    expect(isPlayableNow(null as any, 1, [], now)).toBe(true);
  });

  it('returns true for undefined court (no session)', () => {
    expect(isPlayableNow(undefined as any, 1, [], now)).toBe(true);
  });
});

// ============================================================
// listPlayableCourts
// ============================================================
describe('listPlayableCourts', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns court numbers for playable courts', () => {
    const courts = [
      { number: 1, session: null },
      { number: 2, session: { scheduledEndAt: '2024-01-15T11:00:00Z' } }, // occupied
      { number: 3, session: null },
    ];
    const result = listPlayableCourts(courts as any, [], now);
    expect(result).toContain(1);
    expect(result).toContain(3);
    expect(result).not.toContain(2);
  });

  it('returns empty array when no courts are playable', () => {
    const courts = [
      { number: 1, session: { scheduledEndAt: '2024-01-15T11:00:00Z' } },
    ];
    const result = listPlayableCourts(courts as any, [], now);
    expect(result).toEqual([]);
  });

  it('returns empty array for null courts', () => {
    const result = listPlayableCourts(null as any, [], now);
    expect(result).toEqual([]);
  });

  it('excludes blocked courts', () => {
    const courts = [
      { number: 1, session: null },
      { number: 2, session: null },
    ];
    const blocks = [
      { courtNumber: 1, startsAt: '2024-01-15T09:00:00Z', endsAt: '2024-01-15T11:00:00Z' },
    ];
    const result = listPlayableCourts(courts as any, blocks as any, now);
    expect(result).toEqual([2]);
  });
});
