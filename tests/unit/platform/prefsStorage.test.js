// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPref,
  setPref,
  removePref,
  clearPrefs,
  getCache,
  setCache,
  removeCache,
  clearCache,
  clearAll,
  migrateOldKeys,
} from '../../../src/platform/prefsStorage.js';

describe('prefsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('UI Preferences (PREF_KEYS)', () => {
    it('stores and retrieves preference with correct prefix', () => {
      setPref('deviceId', 'test-device-123');
      expect(getPref('deviceId')).toBe('test-device-123');
      expect(localStorage.getItem('noltc_pref_deviceId')).toBe('"test-device-123"');
    });

    it('returns null for unset preference', () => {
      expect(getPref('deviceId')).toBeNull();
    });

    it('throws for disallowed preference key', () => {
      expect(() => getPref('notAllowed')).toThrow('not an allowed preference key');
      expect(() => setPref('notAllowed', 'x')).toThrow('not an allowed preference key');
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem('noltc_pref_deviceId', 'not-valid-json{');
      expect(getPref('deviceId')).toBeNull();
    });

    it('removes preference', () => {
      setPref('deviceId', 'test');
      removePref('deviceId');
      expect(getPref('deviceId')).toBeNull();
    });

    it('clears all preferences', () => {
      setPref('deviceId', 'test');
      setPref('useApi', true);
      clearPrefs();
      expect(getPref('deviceId')).toBeNull();
      expect(getPref('useApi')).toBeNull();
    });

    it('stores and retrieves boolean useApi correctly', () => {
      setPref('useApi', true);
      expect(getPref('useApi')).toBe(true);
      expect(typeof getPref('useApi')).toBe('boolean');

      setPref('useApi', false);
      expect(getPref('useApi')).toBe(false);
      expect(typeof getPref('useApi')).toBe('boolean');
    });

    it('allows all documented pref keys', () => {
      expect(() => setPref('deviceId', 'abc')).not.toThrow();
      expect(() => setPref('useApi', true)).not.toThrow();
    });
  });

  describe('Session Cache (CACHE_KEYS)', () => {
    it('stores and retrieves cache with correct prefix', () => {
      setCache('guestCharges', { amount: 10 });
      expect(getCache('guestCharges')).toEqual({ amount: 10 });
      expect(localStorage.getItem('noltc_cache_guestCharges')).toBe('{"amount":10}');
    });

    it('returns null for unset cache', () => {
      expect(getCache('guestCharges')).toBeNull();
    });

    it('throws for disallowed cache key', () => {
      expect(() => getCache('notAllowed')).toThrow('not an allowed cache key');
      expect(() => setCache('notAllowed', {})).toThrow('not an allowed cache key');
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem('noltc_cache_guestCharges', '{broken');
      expect(getCache('guestCharges')).toBeNull();
    });

    it('clears all cache', () => {
      setCache('guestCharges', { a: 1 });
      setCache('ballPurchases', { b: 2 });
      clearCache();
      expect(getCache('guestCharges')).toBeNull();
      expect(getCache('ballPurchases')).toBeNull();
    });

    it('stores structured object for ballPurchases', () => {
      const purchases = [
        { id: 1, amount: 5, date: '2024-01-15' },
        { id: 2, amount: 3, date: '2024-01-16' },
      ];
      setCache('ballPurchases', purchases);
      expect(getCache('ballPurchases')).toEqual(purchases);
    });

    it('allows all documented cache keys', () => {
      expect(() => setCache('guestCharges', {})).not.toThrow();
      expect(() => setCache('ballPurchases', {})).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('clears both prefs and cache', () => {
      setPref('deviceId', 'test');
      setCache('guestCharges', {});
      clearAll();
      expect(getPref('deviceId')).toBeNull();
      expect(getCache('guestCharges')).toBeNull();
    });
  });

  describe('migrateOldKeys', () => {
    it('is idempotent - safe to call multiple times', () => {
      migrateOldKeys();
      migrateOldKeys();
      // Should not throw
    });

    it('migrates deviceId from old key to new prefixed key', () => {
      localStorage.setItem('deviceId', '"old-device-id"');
      migrateOldKeys();
      expect(getPref('deviceId')).toBe('old-device-id');
      expect(localStorage.getItem('deviceId')).toBeNull();
    });

    it('migrates NOLTC_USE_API string "true" to boolean true', () => {
      localStorage.setItem('NOLTC_USE_API', 'true');
      migrateOldKeys();
      expect(getPref('useApi')).toBe(true);
      expect(typeof getPref('useApi')).toBe('boolean');
      expect(localStorage.getItem('NOLTC_USE_API')).toBeNull();
    });

    it('migrates NOLTC_USE_API string "false" to boolean false', () => {
      localStorage.setItem('NOLTC_USE_API', 'false');
      migrateOldKeys();
      expect(getPref('useApi')).toBe(false);
      expect(typeof getPref('useApi')).toBe('boolean');
    });

    it('migrates tennisGuestCharges to guestCharges', () => {
      const charges = JSON.stringify({ total: 100, items: [] });
      localStorage.setItem('tennisGuestCharges', charges);
      migrateOldKeys();
      expect(getCache('guestCharges')).toEqual({ total: 100, items: [] });
      expect(localStorage.getItem('tennisGuestCharges')).toBeNull();
    });

    it('migrates tennisBallPurchases to ballPurchases', () => {
      const purchases = JSON.stringify([{ id: 1, qty: 5 }]);
      localStorage.setItem('tennisBallPurchases', purchases);
      migrateOldKeys();
      expect(getCache('ballPurchases')).toEqual([{ id: 1, qty: 5 }]);
      expect(localStorage.getItem('tennisBallPurchases')).toBeNull();
    });

    it('does not overwrite existing new key if already set', () => {
      // Set both old and new keys
      localStorage.setItem('deviceId', '"old-value"');
      localStorage.setItem('noltc_pref_deviceId', '"new-value"');

      migrateOldKeys();

      // New value should be preserved
      expect(getPref('deviceId')).toBe('new-value');
      // Old key should still be removed
      expect(localStorage.getItem('deviceId')).toBeNull();
    });
  });
});
