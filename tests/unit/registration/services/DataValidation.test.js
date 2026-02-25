/**
 * registration/services/DataValidation.js tests
 *
 * Tests all exported validation methods with mocked TENNIS_CONFIG.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@lib', () => ({
  TENNIS_CONFIG: {
    COURTS: { TOTAL_COUNT: 12 },
    PLAYERS: { MAX_PER_GROUP: 4 },
  },
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const { DataValidation } = await import(
  '../../../../src/registration/services/DataValidation.js'
);

// ── isValidCourtNumber ──────────────────────────────────────
describe('DataValidation (services).isValidCourtNumber', () => {
  it('returns true for court 1', () => {
    expect(DataValidation.isValidCourtNumber(1)).toBe(true);
  });

  it('returns true for court 12', () => {
    expect(DataValidation.isValidCourtNumber(12)).toBe(true);
  });

  it('returns false for 0', () => {
    expect(DataValidation.isValidCourtNumber(0)).toBe(false);
  });

  it('returns false for 13', () => {
    expect(DataValidation.isValidCourtNumber(13)).toBe(false);
  });

  it('returns false for float', () => {
    expect(DataValidation.isValidCourtNumber(1.5)).toBe(false);
  });

  it('returns false for string', () => {
    expect(DataValidation.isValidCourtNumber('5')).toBe(false);
  });
});

// ── isValidPlayer ──────────────────────────────────────────
describe('DataValidation (services).isValidPlayer', () => {
  it('valid player with string id', () => {
    expect(DataValidation.isValidPlayer({ id: '123', name: 'John' })).toBe(true);
  });

  it('valid player with numeric id', () => {
    expect(DataValidation.isValidPlayer({ id: 42, name: 'Jane' })).toBe(true);
  });

  it('invalid: missing id', () => {
    expect(DataValidation.isValidPlayer({ name: 'Test' })).toBe(false);
  });

  it('invalid: empty string id', () => {
    expect(DataValidation.isValidPlayer({ id: '', name: 'Test' })).toBe(false);
  });

  it('invalid: missing name', () => {
    expect(DataValidation.isValidPlayer({ id: '1' })).toBe(false);
  });

  it('invalid: whitespace-only name', () => {
    expect(DataValidation.isValidPlayer({ id: '1', name: '  ' })).toBe(false);
  });

  it('invalid: null player throws (no optional chaining)', () => {
    // services version accesses player.id directly — null throws
    expect(() => DataValidation.isValidPlayer(null)).toThrow();
  });
});

// ── isValidGroup ───────────────────────────────────────────
describe('DataValidation (services).isValidGroup', () => {
  it('valid empty group', () => {
    expect(DataValidation.isValidGroup([])).toBe(true);
  });

  it('valid group of 4', () => {
    const group = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
    ];
    expect(DataValidation.isValidGroup(group)).toBe(true);
  });

  it('invalid: 5 players', () => {
    const group = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `P${i}` }));
    expect(DataValidation.isValidGroup(group)).toBe(false);
  });

  it('invalid: not an array', () => {
    expect(DataValidation.isValidGroup(null)).toBe(false);
    expect(DataValidation.isValidGroup('test')).toBe(false);
  });

  it('invalid: contains bad player', () => {
    expect(DataValidation.isValidGroup([{ name: 'no id' }])).toBe(false);
  });
});

// ── isValidDuration ────────────────────────────────────────
describe('DataValidation (services).isValidDuration', () => {
  it('valid: 60', () => expect(DataValidation.isValidDuration(60)).toBe(true));
  it('valid: 240', () => expect(DataValidation.isValidDuration(240)).toBe(true));
  it('invalid: 0', () => expect(DataValidation.isValidDuration(0)).toBe(false));
  it('invalid: 241', () => expect(DataValidation.isValidDuration(241)).toBe(false));
  it('invalid: float', () => expect(DataValidation.isValidDuration(1.5)).toBe(false));
});

// ── isValidDate ────────────────────────────────────────────
describe('DataValidation (services).isValidDate', () => {
  it('valid Date', () => expect(DataValidation.isValidDate(new Date())).toBe(true));
  it('invalid Date', () => expect(DataValidation.isValidDate(new Date('bad'))).toBe(false));
  it('not a Date', () => expect(DataValidation.isValidDate('2024-01-01')).toBe(false));
});

// ── isValidCourtData ───────────────────────────────────────
describe('DataValidation (services).isValidCourtData', () => {
  it('null court is valid', () => {
    expect(DataValidation.isValidCourtData(null)).toBe(true);
  });

  it('valid wasCleared court', () => {
    const court = {
      wasCleared: true,
      players: [{ id: '1', name: 'A' }],
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60000).toISOString(),
    };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('valid domain-format court with session', () => {
    const court = {
      session: {
        group: { players: [{ id: '1', name: 'A' }] },
        startedAt: new Date().toISOString(),
        scheduledEndAt: new Date(Date.now() + 60000).toISOString(),
      },
    };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('valid court with history only', () => {
    const court = { history: [] };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('invalid: non-array history', () => {
    const court = { history: 'not-array' };
    expect(DataValidation.isValidCourtData(court)).toBe(false);
  });

  it('valid regular court', () => {
    const now = Date.now();
    const court = {
      players: [{ id: '1', name: 'A' }],
      startTime: new Date(now).toISOString(),
      endTime: new Date(now + 3600000).toISOString(),
    };
    expect(DataValidation.isValidCourtData(court)).toBe(true);
  });

  it('invalid regular court: endTime before startTime', () => {
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
describe('DataValidation (services).sanitizeStorageData', () => {
  it('returns default structure for empty data', () => {
    const result = DataValidation.sanitizeStorageData({ courts: [], waitingGroups: [] });
    expect(result.courts).toHaveLength(12);
    expect(result.courts.every((c) => c === null)).toBe(true);
    expect(result.waitingGroups).toEqual([]);
    expect(result.recentlyCleared).toEqual([]);
  });

  it('copies valid courts', () => {
    const now = Date.now();
    const court = {
      players: [{ id: '1', name: 'A' }],
      startTime: new Date(now).toISOString(),
      endTime: new Date(now + 3600000).toISOString(),
    };
    const result = DataValidation.sanitizeStorageData({ courts: [court] });
    expect(result.courts[0]).toBe(court);
  });

  it('skips invalid courts', () => {
    const court = { players: 'not-array', startTime: 'bad', endTime: 'bad' };
    const result = DataValidation.sanitizeStorageData({ courts: [court] });
    expect(result.courts[0]).toBeNull();
  });

  it('ignores courts beyond TOTAL_COUNT', () => {
    const courts = Array.from({ length: 15 }, () => null);
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

  it('filters invalid waiting groups', () => {
    const result = DataValidation.sanitizeStorageData({
      courts: [],
      waitingGroups: [null, { players: 'bad' }],
    });
    expect(result.waitingGroups).toHaveLength(0);
  });

  it('copies valid recentlyCleared with future endTime', () => {
    const session = {
      players: [{ id: '1', name: 'A' }],
      originalEndTime: new Date(Date.now() + 3600000).toISOString(),
    };
    const result = DataValidation.sanitizeStorageData({
      courts: [],
      recentlyCleared: [session],
    });
    expect(result.recentlyCleared).toHaveLength(1);
  });

  it('filters recentlyCleared with past endTime', () => {
    const session = {
      players: [{ id: '1', name: 'A' }],
      originalEndTime: new Date(Date.now() - 3600000).toISOString(),
    };
    const result = DataValidation.sanitizeStorageData({
      courts: [],
      recentlyCleared: [session],
    });
    expect(result.recentlyCleared).toHaveLength(0);
  });

  it('handles missing recentlyCleared array', () => {
    const result = DataValidation.sanitizeStorageData({ courts: [] });
    expect(result.recentlyCleared).toEqual([]);
  });
});
