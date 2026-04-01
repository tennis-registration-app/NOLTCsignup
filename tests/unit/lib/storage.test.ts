/**
 * storage.js unit tests
 *
 * Tests all exported functions: readJSON, writeJSON, getEmptyData,
 * normalizeData, normalizeDataShapePure, normalizeDataShape,
 * readDataSafe, getHistoricalGames, addHistoricalGame,
 * searchHistoricalGames, waitlistSignature, purgeExpiredPromotions,
 * preservePromotions, deepFreeze, listAllKeys, readDataClone.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock constants
vi.mock('../../../src/lib/constants.js', () => ({
  STORAGE: {
    DATA: 'tennisClubData',
    SETTINGS: 'tennisClubSettings',
    BLOCKS: 'courtBlocks',
    HISTORICAL_GAMES: 'tennisHistoricalGames',
    UPDATE_TICK: 'tennisDataUpdateTick',
    MEMBER_ID_MAP: 'tennisMemberIdMap',
  },
  COURT_COUNT: 12,
  SCHEMA_VERSION: 1,
}));

import {
  readJSON,
  writeJSON,
  getEmptyData,
  normalizeData,
  normalizeDataShapePure,
  normalizeDataShape,
  readDataSafe,
  getHistoricalGames,
  addHistoricalGame,
  searchHistoricalGames,
  waitlistSignature,
  purgeExpiredPromotions,
  preservePromotions,
  deepFreeze,
  listAllKeys,
  readDataClone,
} from '../../../src/lib/storage.js';

// ── localStorage mock ────────────────────────────────────────
let store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = value; }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
  get length() { return Object.keys(store).length; },
};

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

beforeEach(() => {
  store = {} as Record<string, string>;
  vi.clearAllMocks();
});

// ── readJSON ─────────────────────────────────────────────────
describe('readJSON', () => {
  it('returns parsed JSON for valid key', () => {
    store['myKey'] = JSON.stringify({ a: 1 });
    expect(readJSON('myKey')).toEqual({ a: 1 });
  });

  it('returns null for missing key', () => {
    expect(readJSON('missing')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    store['bad'] = 'not json{{{';
    expect(readJSON('bad')).toBeNull();
  });

  it('returns null for empty string', () => {
    store['empty'] = '';
    expect(readJSON('empty')).toBeNull();
  });
});

// ── writeJSON ────────────────────────────────────────────────
describe('writeJSON', () => {
  it('writes serialized JSON to localStorage', () => {
    const result = writeJSON('key1', { x: 2 });
    expect(result).toBe(true);
    expect(store['key1']).toBe('{"x":2}');
  });

  it('returns false when setItem throws', () => {
    mockLocalStorage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(writeJSON('key1', 'val')).toBe(false);
  });
});

// ── getEmptyData ─────────────────────────────────────────────
describe('getEmptyData', () => {
  it('returns correct shape', () => {
    const data = getEmptyData();
    expect(data.__schema).toBe(1);
    expect(data.courts).toHaveLength(12);
    expect(data.waitingGroups).toEqual([]);
    expect(data.recentlyCleared).toEqual([]);
    expect(data.calculatedAvailability).toBeNull();
  });
});

// ── normalizeData ────────────────────────────────────────────
describe('normalizeData', () => {
  it('returns empty data for null', () => {
    const result = normalizeData(null);
    expect(result.courts).toHaveLength(12);
    expect(result.__schema).toBe(1);
  });

  it('returns empty data for non-object', () => {
    expect(normalizeData('string').courts).toHaveLength(12);
  });

  it('preserves valid courts and resizes if wrong length', () => {
    const result = normalizeData({ courts: ['a', 'b'] });
    expect(result.courts).toHaveLength(12);
    expect(result.courts[0]).toBe('a');
    expect(result.courts[1]).toBe('b');
    expect(result.courts[2]).toBeNull();
  });

  it('replaces non-array courts', () => {
    const result = normalizeData({ courts: 'bad' });
    expect(result.courts).toHaveLength(12);
  });

  it('replaces non-array waitingGroups and recentlyCleared', () => {
    const result = normalizeData({ waitingGroups: 'bad', recentlyCleared: 'bad' });
    expect(result.waitingGroups).toEqual([]);
    expect(result.recentlyCleared).toEqual([]);
  });

  it('stamps schema version', () => {
    const result = normalizeData({ __schema: 0 });
    expect(result.__schema).toBe(1);
  });
});

// ── normalizeDataShapePure ───────────────────────────────────
describe('normalizeDataShapePure', () => {
  it('creates default shape for null', () => {
    const result = normalizeDataShapePure(null);
    expect(result.courts).toEqual([]);
    expect(result.waitingGroups).toEqual([]);
    expect(result.recentlyCleared).toEqual([]);
  });

  it('ensures history arrays on courts', () => {
    const result = normalizeDataShapePure({ courts: [{ number: 1 }, null] });
    expect(result.courts[0].history).toEqual([]);
    expect(result.courts[1].history).toEqual([]);
  });

  it('preserves existing history', () => {
    const result = normalizeDataShapePure({ courts: [{ history: ['a'] }] });
    expect(result.courts[0].history).toEqual(['a']);
  });

  it('does not mutate input', () => {
    const input = { courts: [{ number: 1 }], waitingGroups: [] };
    const result = normalizeDataShapePure(input);
    expect(result).not.toBe(input);
  });
});

// ── normalizeDataShape ───────────────────────────────────────
describe('normalizeDataShape', () => {
  it('returns default shape for null data', () => {
    const result = normalizeDataShape(null);
    expect(result.courts).toHaveLength(12);
    expect(result.waitingGroups).toEqual([]);
    expect(result.recentlyCleared).toEqual([]);
  });

  it('slices existing courts', () => {
    const courts = [{ n: 1 }, { n: 2 }];
    const result = normalizeDataShape({ courts });
    expect(result.courts).toEqual(courts);
    expect(result.courts).not.toBe(courts); // new array
  });

  it('uses custom courtsCount', () => {
    const result = normalizeDataShape(null, 6);
    expect(result.courts).toHaveLength(6);
  });
});

// ── readDataSafe ─────────────────────────────────────────────
describe('readDataSafe', () => {
  it('returns defaults when storage is empty', () => {
    const result = readDataSafe();
    expect(result.courts).toHaveLength(12);
    expect(result.waitingGroups).toEqual([]);
    expect(result.recentlyCleared).toEqual([]);
    expect(result.waitlistPromotions).toEqual([]);
  });

  it('reads and normalizes stored data', () => {
    store['tennisClubData'] = JSON.stringify({
      courts: [{ number: 1 }],
      waitingGroups: [{ id: 'wg1' }],
      extraField: 'kept',
    });
    const result = readDataSafe();
    expect(result.courts).toEqual([{ number: 1 }]);
    expect(result.waitingGroups).toEqual([{ id: 'wg1' }]);
    expect(result.extraField).toBe('kept');
  });

  it('handles malformed JSON', () => {
    store['tennisClubData'] = 'not json{{{';
    const result = readDataSafe();
    expect(result.courts).toHaveLength(12);
  });

  it('handles getItem throwing', () => {
    mockLocalStorage.getItem.mockImplementationOnce(() => { throw new Error('access denied'); });
    const result = readDataSafe();
    expect(result.courts).toHaveLength(12);
  });

  it('preserves waitlistPromotions when present', () => {
    store['tennisClubData'] = JSON.stringify({
      courts: [],
      waitlistPromotions: [{ id: 'p1' }],
    });
    const result = readDataSafe();
    expect(result.waitlistPromotions).toEqual([{ id: 'p1' }]);
  });
});

// ── getHistoricalGames ───────────────────────────────────────
describe('getHistoricalGames', () => {
  it('returns empty array when no data', () => {
    expect(getHistoricalGames()).toEqual([]);
  });

  it('returns stored games', () => {
    store['tennisHistoricalGames'] = JSON.stringify([{ id: 'g1' }]);
    expect(getHistoricalGames()).toEqual([{ id: 'g1' }]);
  });
});

// ── addHistoricalGame ────────────────────────────────────────
describe('addHistoricalGame', () => {
  it('adds a game record with generated fields', () => {
    const game = { courtNumber: 3, startTime: '2024-06-15T10:00:00Z' };
    const result = addHistoricalGame(game);
    expect((result as any).courtNumber).toBe(3);
    expect(result.id).toMatch(/^3-/);
    expect(result.dateAdded).toBeTruthy();
    expect(result.date).toBe('2024-06-15');
  });
});

// ── searchHistoricalGames ────────────────────────────────────
describe('searchHistoricalGames', () => {
  beforeEach(() => {
    store['tennisHistoricalGames'] = JSON.stringify([
      { courtNumber: 1, date: '2024-06-15', startTime: '2024-06-15T10:00:00Z', players: [{ name: 'Alice' }], clearReason: 'done' },
      { courtNumber: 2, date: '2024-06-16', startTime: '2024-06-16T14:00:00Z', players: [{ name: 'Bob' }], clearReason: 'overtime' },
      { courtNumber: 1, date: '2024-06-17', startTime: '2024-06-17T09:00:00Z', players: [{ name: 'Charlie' }], clearReason: 'done' },
    ]);
  });

  it('returns all games when no filters', () => {
    expect(searchHistoricalGames()).toHaveLength(3);
  });

  it('filters by courtNumber', () => {
    const result = searchHistoricalGames({ courtNumber: 1 });
    expect(result).toHaveLength(2);
  });

  it('filters by startDate', () => {
    const result = searchHistoricalGames({ startDate: '2024-06-16' });
    expect(result).toHaveLength(2);
  });

  it('filters by endDate', () => {
    const result = searchHistoricalGames({ endDate: '2024-06-16' });
    expect(result).toHaveLength(2);
  });

  it('filters by playerName (case insensitive)', () => {
    const result = searchHistoricalGames({ playerName: 'alice' });
    expect(result).toHaveLength(1);
    expect((result[0] as any).players[0].name).toBe('Alice');
  });

  it('filters by clearReason', () => {
    const result = searchHistoricalGames({ clearReason: 'overtime' });
    expect(result).toHaveLength(1);
  });

  it('sorts most recent first', () => {
    const result = searchHistoricalGames();
    expect(new Date(result[0].startTime as any).getTime()).toBeGreaterThan(
      new Date(result[1].startTime as any).getTime()
    );
  });
});

// ── waitlistSignature ────────────────────────────────────────
describe('waitlistSignature', () => {
  it('generates signature from players', () => {
    const sig = waitlistSignature({ players: [{ name: 'Bob' }, { name: 'Alice' }], guests: 0 });
    expect(sig).toBe('v1|alice,bob|guests:0|size:2');
  });

  it('handles player objects with no name', () => {
    const sig = waitlistSignature({ players: [{ name: null }], guests: 1 });
    expect(sig).toContain('guests:1');
  });

  it('handles null group', () => {
    const sig = waitlistSignature(null);
    expect(sig).toBe('v1||guests:0|size:0');
  });

  it('handles missing players', () => {
    const sig = waitlistSignature({ guests: 2 });
    expect(sig).toBe('v1||guests:2|size:2');
  });

  it('sorts names alphabetically', () => {
    const sig = waitlistSignature({ players: [{ name: 'Zara' }, { name: 'Amy' }] });
    expect(sig).toContain('amy,zara');
  });
});

// ── purgeExpiredPromotions ────────────────────────────────────
describe('purgeExpiredPromotions', () => {
  it('removes expired promotions', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const data = {
      waitlistPromotions: [
        { id: 'p1', expiresAt: '2024-06-15T11:00:00Z' }, // expired
        { id: 'p2', expiresAt: '2024-06-15T13:00:00Z' }, // valid
      ],
    };
    const result = purgeExpiredPromotions(data, now);
    expect(result.waitlistPromotions).toHaveLength(1);
    expect((result.waitlistPromotions[0] as any).id).toBe('p2');
  });

  it('handles null data', () => {
    const result = purgeExpiredPromotions(null);
    expect(result.waitlistPromotions).toEqual([]);
  });

  it('handles invalid expiresAt', () => {
    const result = purgeExpiredPromotions({ waitlistPromotions: [{ expiresAt: 'bad-date' }] });
    expect(result.waitlistPromotions).toEqual([]);
  });

  it('returns new object (non-mutating)', () => {
    const data = { waitlistPromotions: [], other: 'kept' };
    const result = purgeExpiredPromotions(data);
    expect(result).not.toBe(data);
    expect((result as any).other).toBe('kept');
  });
});

// ── preservePromotions ───────────────────────────────────────
describe('preservePromotions', () => {
  it('copies prev promotions when next lacks them', () => {
    const prev = { waitlistPromotions: [{ id: 'p1' }] };
    const next = { courts: [] };
    const result = preservePromotions(prev, next);
    expect(result.waitlistPromotions).toEqual([{ id: 'p1' }]);
  });

  it('keeps next promotions when present', () => {
    const prev = { waitlistPromotions: [{ id: 'p1' }] };
    const next = { waitlistPromotions: [{ id: 'p2' }] };
    const result = preservePromotions(prev, next);
    expect(result.waitlistPromotions).toEqual([{ id: 'p2' }]);
  });

  it('handles null prev', () => {
    const result = preservePromotions(null, { courts: [] });
    expect(result.waitlistPromotions).toEqual([]);
  });

  it('handles null next by preserving prev promotions', () => {
    const result = preservePromotions({ waitlistPromotions: [{ id: 'p1' }] }, null);
    // null next has no own property 'waitlistPromotions', so prev promos are preserved
    expect(result.waitlistPromotions).toEqual([{ id: 'p1' }]);
  });
});

// ── deepFreeze ───────────────────────────────────────────────
describe('deepFreeze', () => {
  it('freezes object and nested objects', () => {
    const obj = deepFreeze({ a: { b: 1 }, c: [2] });
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen((obj as any).a)).toBe(true);
    expect(Object.isFrozen((obj as any).c)).toBe(true);
  });

  it('returns primitives unchanged', () => {
    expect(deepFreeze(null)).toBeNull();
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('str')).toBe('str');
  });

  it('returns Date unchanged', () => {
    const d = new Date();
    expect(deepFreeze(d)).toBe(d);
  });
});

// ── listAllKeys ──────────────────────────────────────────────
describe('listAllKeys', () => {
  it('returns tennis-related keys', () => {
    store = {
      tennisClubData: '1',
      courtBlocks: '2',
      unrelated: '3',
      ballSettings: '4',
      guestLog: '5',
    };
    const keys = listAllKeys();
    expect(keys).toContain('tennisClubData');
    expect(keys).toContain('courtBlocks');
    expect(keys).toContain('ballSettings');
    expect(keys).toContain('guestLog');
    expect(keys).not.toContain('unrelated');
  });

  it('returns empty array when storage throws', () => {
    mockLocalStorage.key.mockImplementation(() => { throw new Error('err'); });
    expect(listAllKeys()).toEqual([]);
  });
});

// ── readDataClone ────────────────────────────────────────────
describe('readDataClone', () => {
  it('returns structured clone of stored data', () => {
    store['tennisClubData'] = JSON.stringify({
      courts: [{ number: 1, history: ['h1'], current: { id: 's1' } }],
      waitingGroups: [{ id: 'wg1' }],
      recentlyCleared: [{ id: 'rc1' }],
    });
    const result = readDataClone();
    expect(result.courts[0].number).toBe(1);
    expect(result.courts[0].history).toEqual(['h1']);
    expect(result.courts[0].current).toEqual({ id: 's1' });
    expect(result.waitingGroups).toEqual([{ id: 'wg1' }]);
  });

  it('returns empty data when storage empty', () => {
    const result = readDataClone();
    expect(result.courts).toHaveLength(12);
    expect(result.waitingGroups).toEqual([]);
    expect(result.recentlyCleared).toEqual([]);
  });

  it('fills in missing court structure', () => {
    store['tennisClubData'] = JSON.stringify({
      courts: [null, { number: 2 }],
    });
    const result = readDataClone();
    expect(result.courts[0]).toEqual({ history: [], current: null });
    expect(result.courts[1].history).toEqual([]);
  });

  it('fixes non-array courts', () => {
    store['tennisClubData'] = JSON.stringify({ courts: 'bad' });
    const result = readDataClone();
    expect(result.courts).toHaveLength(12);
  });
});
