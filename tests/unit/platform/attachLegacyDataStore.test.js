/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('attachLegacyDataStore', () => {
  beforeEach(() => {
    // Clear window.Tennis namespace
    delete window.Tennis;
    // Clear localStorage
    localStorage.clear();
    // Reset modules to re-run side effects
    vi.resetModules();
  });

  it('attaches window.Tennis.DataStore namespace', async () => {
    await import('../../../src/platform/attachLegacyDataStore.js');

    expect(window.Tennis).toBeDefined();
    expect(window.Tennis.DataStore).toBeDefined();
  });

  it('DataStore has get method', async () => {
    await import('../../../src/platform/attachLegacyDataStore.js');

    expect(typeof window.Tennis.DataStore.get).toBe('function');
  });

  it('DataStore has set method', async () => {
    await import('../../../src/platform/attachLegacyDataStore.js');

    expect(typeof window.Tennis.DataStore.set).toBe('function');
  });

  it('DataStore has getMetrics method', async () => {
    await import('../../../src/platform/attachLegacyDataStore.js');

    expect(typeof window.Tennis.DataStore.getMetrics).toBe('function');

    // Verify getMetrics returns expected shape
    const metrics = window.Tennis.DataStore.getMetrics();
    expect(metrics).toHaveProperty('cacheHits');
    expect(metrics).toHaveProperty('cacheMisses');
    expect(metrics).toHaveProperty('totalOperations');
  });

  it('DataStore has refresh method (ESM equivalent of clearCache)', async () => {
    await import('../../../src/platform/attachLegacyDataStore.js');

    expect(typeof window.Tennis.DataStore.refresh).toBe('function');
  });

  it('DataStore.get returns cached value', async () => {
    // Pre-populate localStorage
    localStorage.setItem('testKey', JSON.stringify({ foo: 'bar' }));

    await import('../../../src/platform/attachLegacyDataStore.js');

    const result = await window.Tennis.DataStore.get('testKey');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('DataStore.set stores value', async () => {
    await import('../../../src/platform/attachLegacyDataStore.js');

    await window.Tennis.DataStore.set('testKey', { hello: 'world' }, { immediate: true });

    const stored = JSON.parse(localStorage.getItem('testKey'));
    expect(stored).toEqual({ hello: 'world' });
  });

  it('is idempotent - does not overwrite existing DataStore', async () => {
    // Set up an existing DataStore
    const existingDataStore = { get: vi.fn(), set: vi.fn() };
    window.Tennis = {
      DataStore: existingDataStore,
    };

    await import('../../../src/platform/attachLegacyDataStore.js');

    // The existing DataStore should still be there
    expect(window.Tennis.DataStore).toBe(existingDataStore);
  });

  it('returns same singleton instance via getDataStore export', async () => {
    const { getDataStore } = await import('../../../src/platform/attachLegacyDataStore.js');

    const instance1 = getDataStore();
    const instance2 = getDataStore();

    expect(instance1).toBe(instance2);
    expect(instance1).toBe(window.Tennis.DataStore);
  });
});
