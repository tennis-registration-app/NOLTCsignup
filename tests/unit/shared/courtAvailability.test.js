import { describe, it, expect } from 'vitest';
import {
  isOccupiedNow,
  isBlockedNow,
  isActiveInterval,
  isPlayableNow,
  countPlayableCourts,
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
    expect(isOccupiedNow(court, now)).toBe(false);
  });

  it('returns false when court is undefined', () => {
    expect(isOccupiedNow(undefined, now)).toBe(false);
  });

  it('returns true when court has active session', () => {
    const court = {
      session: { scheduledEndAt: '2024-01-15T11:00:00Z' },
    };
    expect(isOccupiedNow(court, now)).toBe(true);
  });

  it('returns false when session is in overtime (past end time)', () => {
    const court = {
      session: { scheduledEndAt: '2024-01-15T09:00:00Z' },
    };
    expect(isOccupiedNow(court, now)).toBe(false);
  });

  it('returns false when court has isOvertime flag set', () => {
    const court = {
      isOvertime: true,
      session: { scheduledEndAt: '2024-01-15T09:00:00Z' },
    };
    expect(isOccupiedNow(court, now)).toBe(false);
  });

  it('handles different end time field names', () => {
    const courtWithEndTime = {
      session: { endTime: '2024-01-15T11:00:00Z' },
    };
    expect(isOccupiedNow(courtWithEndTime, now)).toBe(true);

    const courtWithEndsAt = {
      session: { endsAt: '2024-01-15T11:00:00Z' },
    };
    expect(isOccupiedNow(courtWithEndsAt, now)).toBe(true);
  });
});

describe('isBlockedNow', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns false when no blocks exist', () => {
    expect(isBlockedNow(1, [], now)).toBe(false);
  });

  it('returns false when blocks is null/undefined', () => {
    expect(isBlockedNow(1, null, now)).toBe(false);
    expect(isBlockedNow(1, undefined, now)).toBe(false);
  });

  it('returns true when block is currently active', () => {
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks, now)).toBe(true);
  });

  it('returns false when block has expired', () => {
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T08:00:00Z',
        endsAt: '2024-01-15T09:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks, now)).toBe(false);
  });

  it('returns false when block is for different court', () => {
    const blocks = [
      {
        courtNumber: 2,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    expect(isBlockedNow(1, blocks, now)).toBe(false);
  });

  it('returns true when block has no times (assumes active)', () => {
    const blocks = [{ courtNumber: 1 }];
    expect(isBlockedNow(1, blocks, now)).toBe(true);
  });
});

describe('isPlayableNow', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns true for empty court with no blocks', () => {
    const court = { session: null };
    expect(isPlayableNow(court, 1, [], now)).toBe(true);
  });

  it('returns false for occupied court', () => {
    const court = { session: { scheduledEndAt: '2024-01-15T11:00:00Z' } };
    expect(isPlayableNow(court, 1, [], now)).toBe(false);
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
    expect(isPlayableNow(court, 1, blocks, now)).toBe(false);
  });

  it('returns true for overtime court', () => {
    const court = { session: { scheduledEndAt: '2024-01-15T09:00:00Z' } };
    expect(isPlayableNow(court, 1, [], now)).toBe(true);
  });
});

describe('countPlayableCourts', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns 0 for empty courts array', () => {
    expect(countPlayableCourts([], [], now)).toBe(0);
  });

  it('returns 0 for null courts', () => {
    expect(countPlayableCourts(null, [], now)).toBe(0);
  });

  it('counts available courts correctly', () => {
    const courts = [
      { number: 1, session: null },
      { number: 2, session: { scheduledEndAt: '2024-01-15T11:00:00Z' } },
      { number: 3, session: null },
    ];
    expect(countPlayableCourts(courts, [], now)).toBe(2);
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
    expect(countPlayableCourts(courts, blocks, now)).toBe(1);
  });
});
