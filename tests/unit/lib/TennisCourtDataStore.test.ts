/**
 * @vitest-environment jsdom
 */

/**
 * TennisCourtDataStore tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TennisCourtDataStore,
  broadcastEvent,
  listenForEvent,
  getDataStore,
} from '../../../src/lib/TennisCourtDataStore.js';

beforeEach(() => {
  localStorage.clear();
});

// ── TennisCourtDataStore ────────────────────────────────────
describe('TennisCourtDataStore', () => {
  it('constructs with empty cache', () => {
    const store = new TennisCourtDataStore();
    expect(store.cache).toBeInstanceOf(Map);
  });

  it('warmCache loads existing localStorage data', () => {
    localStorage.setItem('tennisClubData', JSON.stringify({ test: true }));
    const store = new TennisCourtDataStore();
    expect(store.cache.get('tennisClubData')).toEqual({ test: true });
  });

  it('warmCache ignores invalid JSON', () => {
    localStorage.setItem('tennisClubData', 'not-json');
    const store = new TennisCourtDataStore();
    expect(store.cache.has('tennisClubData')).toBe(false);
  });

  it('get returns cached value', async () => {
    const store = new TennisCourtDataStore();
    store.cache.set('key', { foo: 'bar' });
    const result = await store.get('key');
    expect(result).toEqual({ foo: 'bar' });
    expect(store.metrics.cacheHits).toBe(1);
  });

  it('get reads from localStorage on cache miss', async () => {
    localStorage.setItem('mykey', JSON.stringify({ val: 1 }));
    const store = new TennisCourtDataStore();
    const result = await store.get('mykey');
    expect(result).toEqual({ val: 1 });
    expect(store.metrics.cacheMisses).toBe(1);
  });

  it('get returns null for missing key', async () => {
    const store = new TennisCourtDataStore();
    const result = await store.get('nonexistent');
    expect(result).toBeNull();
  });

  it('get handles invalid JSON in localStorage', async () => {
    localStorage.setItem('badkey', 'not-json');
    const store = new TennisCourtDataStore();
    const result = await store.get('badkey');
    expect(result).toBeNull();
  });

  it('set updates cache and writes critical keys', async () => {
    const store = new TennisCourtDataStore();
    await store.set('tennisClubData', { courts: [] });
    expect(store.cache.get('tennisClubData')).toEqual({ courts: [] });
    expect(JSON.parse(localStorage.getItem('tennisClubData')!)).toEqual({ courts: [] });
  });

  it('set writes when immediate option', async () => {
    const store = new TennisCourtDataStore();
    await store.set('custom', { x: 1 }, { immediate: true });
    expect(JSON.parse(localStorage.getItem('custom')!)).toEqual({ x: 1 });
  });

  it('set dispatches update event', async () => {
    const store = new TennisCourtDataStore();
    const handler = vi.fn();
    window.addEventListener('tennisDataUpdate', handler);
    await store.set('tennisClubData', { updated: true });
    window.removeEventListener('tennisDataUpdate', handler);
    expect(handler).toHaveBeenCalled();
  });

  it('delete removes from cache and localStorage', async () => {
    const store = new TennisCourtDataStore();
    store.cache.set('delme', 'value');
    localStorage.setItem('delme', '"value"');
    await store.delete('delme');
    expect(store.cache.has('delme')).toBe(false);
    expect(localStorage.getItem('delme')).toBeNull();
  });

  it('clear clears cache only by default', () => {
    const store = new TennisCourtDataStore();
    store.cache.set('a', 1);
    store.clear();
    expect(store.cache.size).toBe(0);
  });

  it('clear with clearStorage removes localStorage keys', () => {
    const store = new TennisCourtDataStore();
    localStorage.setItem('tennisClubData', '"x"');
    store.clear(true);
    expect(localStorage.getItem('tennisClubData')).toBeNull();
  });

  it('refresh re-warms cache from localStorage', () => {
    const store = new TennisCourtDataStore();
    localStorage.setItem('tennisClubData', JSON.stringify({ refreshed: true }));
    store.refresh();
    expect(store.cache.get('tennisClubData')).toEqual({ refreshed: true });
  });

  it('getMetrics returns computed metrics', () => {
    const store = new TennisCourtDataStore();
    const metrics = store.getMetrics();
    expect(typeof metrics.avgResponseTime).toBe('number');
    expect(typeof metrics.cacheHitRate).toBe('number');
  });

  it('resetMetrics clears counters', async () => {
    const store = new TennisCourtDataStore();
    await store.get('anything');
    store.resetMetrics();
    expect(store.metrics.totalOperations).toBe(0);
  });
});

// ── Event helpers ───────────────────────────────────────────
describe('broadcastEvent', () => {
  it('dispatches CustomEvent', () => {
    const handler = vi.fn();
    window.addEventListener('test-event', handler);
    broadcastEvent('test-event', { data: 1 });
    window.removeEventListener('test-event', handler);
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail).toEqual({ data: 1 });
  });
});

describe('listenForEvent', () => {
  it('listens and returns cleanup fn', () => {
    const handler = vi.fn();
    const cleanup = listenForEvent('my-event', handler);
    broadcastEvent('my-event', 'hi');
    expect(handler).toHaveBeenCalledTimes(1);
    cleanup();
    broadcastEvent('my-event', 'bye');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ── getDataStore singleton ──────────────────────────────────
describe('getDataStore', () => {
  it('returns a TennisCourtDataStore instance', () => {
    const store = getDataStore();
    expect(store).toBeInstanceOf(TennisCourtDataStore);
  });

  it('returns same instance on second call', () => {
    const a = getDataStore();
    const b = getDataStore();
    expect(a).toBe(b);
  });
});
