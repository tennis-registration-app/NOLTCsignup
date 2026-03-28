/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { legacyStorage, KEYS } from '../../../src/platform/attachLegacyStorage.js';

describe('attachLegacyStorage', () => {
  describe('KEYS constants', () => {
    test('KEYS has all 6 expected values', () => {
      expect(KEYS.DATA).toBe('tennisClubData');
      expect(KEYS.SETTINGS).toBe('tennisClubSettings');
      expect(KEYS.BLOCKS).toBe('courtBlocks');
      expect(KEYS.HISTORICAL_GAMES).toBe('tennisHistoricalGames');
      expect(KEYS.UPDATE_TICK).toBe('tennisDataUpdateTick');
      expect(KEYS.MEMBER_ID_MAP).toBe('tennisMemberIdMap');
    });

    test('STORAGE alias matches KEYS', () => {
      expect(legacyStorage.STORAGE).toEqual(legacyStorage.KEYS);
      expect(legacyStorage.STORAGE.DATA).toBe(KEYS.DATA);
      expect(legacyStorage.STORAGE.SETTINGS).toBe(KEYS.SETTINGS);
    });
  });

  describe('window.Tennis.Storage', () => {
    test('window.Tennis.Storage is set correctly', () => {
      expect(window.Tennis.Storage).toBe(legacyStorage);
    });
  });

  describe('readJSON/writeJSON', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    test('readJSON returns null for missing key', () => {
      expect(legacyStorage.readJSON('nonexistent')).toBeNull();
    });

    test('readJSON/writeJSON round-trip', () => {
      const testData = { foo: 'bar', count: 42 };
      // Use a non-DATA key to avoid guard logic
      legacyStorage.writeJSON('testKey', testData);
      expect(legacyStorage.readJSON('testKey')).toEqual(testData);
    });

    test('readJSON handles malformed JSON', () => {
      localStorage.setItem('badJson', 'not valid json {{{');
      expect(legacyStorage.readJSON('badJson')).toBeNull();
    });
  });

  describe('getEmptyData', () => {
    test('returns correct shape', () => {
      const empty = legacyStorage.getEmptyData();
      expect(Array.isArray(empty.courts)).toBe(true);
      expect(empty.courts.length).toBe(12);
      expect(Array.isArray(empty.waitingGroups)).toBe(true);
      expect(Array.isArray(empty.recentlyCleared)).toBe(true);
    });
  });

  describe('deepFreeze', () => {
    test('freezes objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const frozen = legacyStorage.deepFreeze(obj);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.b)).toBe(true);
    });

    test('returns primitives unchanged', () => {
      expect(legacyStorage.deepFreeze(42)).toBe(42);
      expect(legacyStorage.deepFreeze('hello')).toBe('hello');
      expect(legacyStorage.deepFreeze(null)).toBeNull();
    });

    test('does not freeze Date objects', () => {
      const date = new Date();
      const result = legacyStorage.deepFreeze(date);
      expect(result).toBe(date);
      // Dates should remain mutable (their internal state)
    });
  });

  describe('listAllKeys', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    test('returns array', () => {
      expect(Array.isArray(legacyStorage.listAllKeys())).toBe(true);
    });

    test('finds tennis-related keys', () => {
      localStorage.setItem('tennisClubData', '{}');
      localStorage.setItem('courtBlocks', '[]');
      localStorage.setItem('unrelatedKey', 'value');
      const keys = legacyStorage.listAllKeys();
      expect(keys).toContain('tennisClubData');
      expect(keys).toContain('courtBlocks');
      expect(keys).not.toContain('unrelatedKey');
    });
  });

  describe('readDataSafe', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    test('returns default structure when empty', () => {
      const data = legacyStorage.readDataSafe();
      expect(Array.isArray(data.courts)).toBe(true);
      expect(Array.isArray(data.waitingGroups)).toBe(true);
      expect(Array.isArray(data.recentlyCleared)).toBe(true);
    });

    test('reads stored data', () => {
      const stored = {
        courts: [{ current: { players: ['Alice'] } }],
        waitingGroups: [{ id: 1 }],
        recentlyCleared: [],
      };
      localStorage.setItem(KEYS.DATA, JSON.stringify(stored));
      const data = legacyStorage.readDataSafe();
      expect(data.courts[0].current.players[0]).toBe('Alice');
      expect(data.waitingGroups[0].id).toBe(1);
    });
  });

  describe('readDataClone', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    test('returns mutable clone', () => {
      const stored = { courts: [{ current: null }], waitingGroups: [], recentlyCleared: [] };
      localStorage.setItem(KEYS.DATA, JSON.stringify(stored));
      const clone = legacyStorage.readDataClone();
      // Should be mutable
      clone.courts.push({ current: null });
      expect(clone.courts.length).toBe(2);
    });
  });

  describe('exports all required functions', () => {
    test('legacyStorage has all expected properties', () => {
      expect(typeof legacyStorage.readJSON).toBe('function');
      expect(typeof legacyStorage.writeJSON).toBe('function');
      expect(typeof legacyStorage.readDataSafe).toBe('function');
      expect(typeof legacyStorage.getEmptyData).toBe('function');
      expect(typeof legacyStorage.deepFreeze).toBe('function');
      expect(typeof legacyStorage.listAllKeys).toBe('function');
      expect(typeof legacyStorage.readDataClone).toBe('function');
      expect(legacyStorage.KEYS).toBeDefined();
      expect(legacyStorage.STORAGE).toBeDefined();
    });
  });
});
