import { describe, it, expect } from 'vitest';
import {
  getSessionMinutesRemaining,
  isSessionOvertime,
  getCourtPlayerNames,
  getAvailableCourts,
  findCourtByNumber,
} from '../../../src/lib/domain/courtHelpers.js';

describe('getSessionMinutesRemaining', () => {
  it('returns 0 for null session', () => {
    expect(getSessionMinutesRemaining(null, '2024-01-15T10:00:00Z')).toBe(0);
  });

  it('returns 0 for session without scheduledEndAt', () => {
    const session = { startedAt: '2024-01-15T09:00:00Z' };
    expect(getSessionMinutesRemaining(session, '2024-01-15T10:00:00Z')).toBe(0);
  });

  it('returns 0 when serverNow is null', () => {
    const session = { scheduledEndAt: '2024-01-15T11:00:00Z' };
    expect(getSessionMinutesRemaining(session, null)).toBe(0);
  });

  it('returns 0 when session end time is in the past', () => {
    const session = { scheduledEndAt: '2024-01-15T09:00:00Z' };
    expect(getSessionMinutesRemaining(session, '2024-01-15T10:00:00Z')).toBe(0);
  });

  it('returns positive minutes when session end is in future', () => {
    const session = { scheduledEndAt: '2024-01-15T11:00:00Z' };
    const result = getSessionMinutesRemaining(session, '2024-01-15T10:00:00Z');
    expect(result).toBe(60);
  });

  it('rounds up partial minutes', () => {
    const session = { scheduledEndAt: '2024-01-15T10:30:30Z' };
    const result = getSessionMinutesRemaining(session, '2024-01-15T10:00:00Z');
    expect(result).toBe(31); // 30.5 minutes rounds up to 31
  });
});

describe('isSessionOvertime', () => {
  it('returns false for null session', () => {
    expect(isSessionOvertime(null, '2024-01-15T10:00:00Z')).toBe(false);
  });

  it('returns false when no scheduledEndAt exists', () => {
    const session = { startedAt: '2024-01-15T09:00:00Z' };
    expect(isSessionOvertime(session, '2024-01-15T10:00:00Z')).toBe(false);
  });

  it('returns false when serverNow is null', () => {
    const session = { scheduledEndAt: '2024-01-15T09:00:00Z' };
    expect(isSessionOvertime(session, null)).toBe(false);
  });

  it('returns false when current time is before end time', () => {
    const session = { scheduledEndAt: '2024-01-15T11:00:00Z' };
    expect(isSessionOvertime(session, '2024-01-15T10:00:00Z')).toBe(false);
  });

  it('returns true when current time is after end time', () => {
    const session = { scheduledEndAt: '2024-01-15T09:00:00Z' };
    expect(isSessionOvertime(session, '2024-01-15T10:00:00Z')).toBe(true);
  });

  it('returns false when session already ended (actualEndAt set)', () => {
    const session = {
      scheduledEndAt: '2024-01-15T09:00:00Z',
      actualEndAt: '2024-01-15T09:30:00Z',
    };
    expect(isSessionOvertime(session, '2024-01-15T10:00:00Z')).toBe(false);
  });
});

describe('getCourtPlayerNames', () => {
  it('returns empty array for null court', () => {
    expect(getCourtPlayerNames(null)).toEqual([]);
  });

  it('returns empty array for court without session', () => {
    const court = { number: 1 };
    expect(getCourtPlayerNames(court)).toEqual([]);
  });

  it('returns empty array for session without group', () => {
    const court = { session: {} };
    expect(getCourtPlayerNames(court)).toEqual([]);
  });

  it('returns player display names', () => {
    const court = {
      session: {
        group: {
          players: [{ displayName: 'John Doe' }, { displayName: 'Jane Smith' }],
        },
      },
    };
    expect(getCourtPlayerNames(court)).toEqual(['John Doe', 'Jane Smith']);
  });
});

describe('getAvailableCourts', () => {
  it('returns empty array for non-array input', () => {
    expect(getAvailableCourts(null)).toEqual([]);
    expect(getAvailableCourts(undefined)).toEqual([]);
  });

  it('filters to only available courts', () => {
    const courts = [
      { number: 1, isAvailable: true },
      { number: 2, isAvailable: false },
      { number: 3, isAvailable: true },
    ];
    const result = getAvailableCourts(courts);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.number)).toEqual([1, 3]);
  });
});

describe('findCourtByNumber', () => {
  it('returns undefined for non-array input', () => {
    expect(findCourtByNumber(null, 1)).toBeUndefined();
  });

  it('finds court by number', () => {
    const courts = [{ number: 1 }, { number: 2 }, { number: 3 }];
    const result = findCourtByNumber(courts, 2);
    expect(result).toEqual({ number: 2 });
  });

  it('returns undefined when court not found', () => {
    const courts = [{ number: 1 }, { number: 2 }];
    expect(findCourtByNumber(courts, 5)).toBeUndefined();
  });
});
