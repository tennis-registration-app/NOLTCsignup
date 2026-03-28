import { describe, it, expect } from 'vitest';
import { DataValidation } from '../../../src/lib/DataValidation.js';

describe('DataValidation.isValidPlayer', () => {
  it('returns true for valid player with id and name', () => {
    const player = { id: '123', name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(true);
  });

  it('returns true for player with numeric id', () => {
    const player = { id: 123, name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(true);
  });

  it('returns true for player with UUID id', () => {
    const player = { id: '4f3a4213-4c17-44e1-aeea-1ac0276bcfa2', name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(true);
  });

  it('returns false when id is missing', () => {
    const player = { name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });

  it('returns false when name is missing', () => {
    const player = { id: '123' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });

  it('returns false when name is empty string', () => {
    const player = { id: '123', name: '   ' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });

  it('returns falsy for null/undefined player', () => {
    expect(DataValidation.isValidPlayer(null)).toBeFalsy();
    expect(DataValidation.isValidPlayer(undefined)).toBeFalsy();
  });

  it('returns false when id is empty string', () => {
    const player = { id: '', name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });
});

describe('DataValidation.isValidGroup', () => {
  it('returns true for empty group (allowed for blocked courts)', () => {
    expect(DataValidation.isValidGroup([])).toBe(true);
  });

  it('returns true for group with 1 player', () => {
    const group = [{ id: '1', name: 'Player A' }];
    expect(DataValidation.isValidGroup(group)).toBe(true);
  });

  it('returns true for group with 4 players', () => {
    const group = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
    ];
    expect(DataValidation.isValidGroup(group)).toBe(true);
  });

  it('returns false for group with more than 4 players', () => {
    const group = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
      { id: '5', name: 'E' },
    ];
    expect(DataValidation.isValidGroup(group)).toBe(false);
  });

  it('returns false for non-array input', () => {
    expect(DataValidation.isValidGroup(null)).toBe(false);
    expect(DataValidation.isValidGroup(undefined)).toBe(false);
    expect(DataValidation.isValidGroup('not an array')).toBe(false);
  });

  it('returns false if any player is invalid', () => {
    const group = [
      { id: '1', name: 'Valid' },
      { name: 'Missing ID' }, // invalid
    ];
    expect(DataValidation.isValidGroup(group)).toBe(false);
  });
});

describe('DataValidation.isValidCourtNumber', () => {
  it('returns true for valid court numbers (1-12)', () => {
    expect(DataValidation.isValidCourtNumber(1)).toBe(true);
    expect(DataValidation.isValidCourtNumber(6)).toBe(true);
    expect(DataValidation.isValidCourtNumber(12)).toBe(true);
  });

  it('returns false for court number 0', () => {
    expect(DataValidation.isValidCourtNumber(0)).toBe(false);
  });

  it('returns false for negative court numbers', () => {
    expect(DataValidation.isValidCourtNumber(-1)).toBe(false);
  });

  it('returns false for court numbers > 12', () => {
    expect(DataValidation.isValidCourtNumber(13)).toBe(false);
  });

  it('returns false for non-integer values', () => {
    expect(DataValidation.isValidCourtNumber(1.5)).toBe(false);
    expect(DataValidation.isValidCourtNumber('1')).toBe(false);
  });
});

describe('DataValidation.isValidDuration', () => {
  it('returns true for valid durations', () => {
    expect(DataValidation.isValidDuration(30)).toBe(true);
    expect(DataValidation.isValidDuration(60)).toBe(true);
    expect(DataValidation.isValidDuration(120)).toBe(true);
  });

  it('returns false for 0 duration', () => {
    expect(DataValidation.isValidDuration(0)).toBe(false);
  });

  it('returns false for negative duration', () => {
    expect(DataValidation.isValidDuration(-30)).toBe(false);
  });

  it('returns false for duration over 240 minutes', () => {
    expect(DataValidation.isValidDuration(241)).toBe(false);
  });
});

describe('DataValidation.isValidDate', () => {
  it('returns true for valid Date objects', () => {
    expect(DataValidation.isValidDate(new Date())).toBe(true);
    expect(DataValidation.isValidDate(new Date('2024-01-15T10:00:00Z'))).toBe(true);
  });

  it('returns false for invalid Date objects', () => {
    expect(DataValidation.isValidDate(new Date('invalid'))).toBe(false);
  });

  it('returns false for non-Date values', () => {
    expect(DataValidation.isValidDate('2024-01-15')).toBe(false);
    expect(DataValidation.isValidDate(1705312800000)).toBe(false);
    expect(DataValidation.isValidDate(null)).toBe(false);
  });
});

// ── isValidCourtData ───────────────────────────────────────
describe('DataValidation.isValidCourtData', () => {
  it('returns true for null court', () => {
    expect(DataValidation.isValidCourtData(null)).toBe(true);
  });

  it('returns true for undefined court', () => {
    expect(DataValidation.isValidCourtData(undefined)).toBe(true);
  });

  it('validates wasCleared court with valid data', () => {
    const now = Date.now();
    const court = {
      wasCleared: true,
      players: [{ id: '1', name: 'A' }],
      startTime: new Date(now).toISOString(),
      endTime: new Date(now + 60000).toISOString(),
    };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('rejects wasCleared court with invalid players', () => {
    const court = {
      wasCleared: true,
      players: 'bad',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
    };
    expect(DataValidation.isValidCourtData(court)).toBe(false);
  });

  it('validates domain-format court with session', () => {
    const court = {
      session: {
        group: { players: [] },
        startedAt: new Date().toISOString(),
        scheduledEndAt: new Date(Date.now() + 60000).toISOString(),
      },
    };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('validates court with null session but history array', () => {
    const court = { session: null, history: [] };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('rejects court with non-array history', () => {
    const court = { history: 'not-array' };
    expect(DataValidation.isValidCourtData(court)).toBe(false);
  });

  it('validates regular court with correct times', () => {
    const now = Date.now();
    const court = {
      players: [{ id: '1', name: 'A' }],
      startTime: new Date(now).toISOString(),
      endTime: new Date(now + 3600000).toISOString(),
    };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('rejects regular court with endTime <= startTime', () => {
    const now = Date.now();
    const court = {
      players: [{ id: '1', name: 'A' }],
      startTime: new Date(now + 3600000).toISOString(),
      endTime: new Date(now).toISOString(),
    };
    expect(DataValidation.isValidCourtData(court)).toBe(false);
  });
});

// ── sanitizeStorageData ────────────────────────────────────
describe('DataValidation.sanitizeStorageData', () => {
  it('returns default structure with 12 null courts', () => {
    const result = DataValidation.sanitizeStorageData({ courts: [] });
    expect(result.courts).toHaveLength(12);
    expect(result.courts.every((c) => c === null)).toBe(true);
    expect(result.waitingGroups).toEqual([]);
    expect(result.recentlyCleared).toEqual([]);
  });

  it('copies valid courts to correct indices', () => {
    const now = Date.now();
    const court = {
      players: [{ id: '1', name: 'A' }],
      startTime: new Date(now).toISOString(),
      endTime: new Date(now + 3600000).toISOString(),
    };
    const result = DataValidation.sanitizeStorageData({ courts: [null, court] });
    expect(result.courts[0]).toBeNull();
    expect(result.courts[1]).toBe(court);
  });

  it('skips courts at index >= TOTAL_COUNT', () => {
    const courts = Array(15).fill(null);
    const result = DataValidation.sanitizeStorageData({ courts });
    expect(result.courts).toHaveLength(12);
  });

  it('copies valid waiting groups', () => {
    const group = {
      players: [{ id: '1', name: 'A' }],
      timestamp: new Date().toISOString(),
    };
    const result = DataValidation.sanitizeStorageData({ courts: [], waitingGroups: [group] });
    expect(result.waitingGroups).toHaveLength(1);
  });

  it('filters out invalid waiting groups', () => {
    const result = DataValidation.sanitizeStorageData({
      courts: [],
      waitingGroups: [null, { players: 'bad' }],
    });
    expect(result.waitingGroups).toHaveLength(0);
  });

  it('filters recentlyCleared with expired endTime', () => {
    const session = {
      players: [{ id: '1', name: 'A' }],
      originalEndTime: new Date(Date.now() - 3600000).toISOString(),
    };
    const result = DataValidation.sanitizeStorageData({ courts: [], recentlyCleared: [session] });
    expect(result.recentlyCleared).toHaveLength(0);
  });

  it('keeps recentlyCleared with future endTime', () => {
    const session = {
      players: [{ id: '1', name: 'A' }],
      originalEndTime: new Date(Date.now() + 3600000).toISOString(),
    };
    const result = DataValidation.sanitizeStorageData({ courts: [], recentlyCleared: [session] });
    expect(result.recentlyCleared).toHaveLength(1);
  });

  it('handles missing recentlyCleared', () => {
    const result = DataValidation.sanitizeStorageData({ courts: [] });
    expect(result.recentlyCleared).toEqual([]);
  });
});
