/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE } from '../../../src/lib/constants.js';

describe('attachLegacyBlocks', () => {
  beforeEach(() => {
    // Clear window.Tennis namespace
    delete window.Tennis;
    // Clear localStorage
    localStorage.clear();
    // Reset modules to re-run side effects
    vi.resetModules();
  });

  it('attaches window.Tennis.BlocksService namespace', async () => {
    await import('../../../src/platform/attachLegacyBlocks.js');

    expect(window.Tennis).toBeDefined();
    expect(window.Tennis.BlocksService).toBeDefined();
    expect(typeof window.Tennis.BlocksService.saveBlocks).toBe('function');
  });

  it('saveBlocks persists blocks to localStorage', async () => {
    const { saveBlocks } = await import('../../../src/platform/attachLegacyBlocks.js');

    const blocks = [
      { id: 1, courtNumber: 1, startTime: '09:00', endTime: '10:00' },
      { id: 2, courtNumber: 2, startTime: '10:00', endTime: '11:00' },
    ];

    const result = await saveBlocks(blocks);

    expect(result).toEqual({ success: true });
    const stored = JSON.parse(localStorage.getItem(STORAGE.BLOCKS));
    expect(stored).toEqual(blocks);
  });

  it('saveBlocks emits BLOCKS_UPDATED event', async () => {
    const { saveBlocks } = await import('../../../src/platform/attachLegacyBlocks.js');

    const eventHandler = vi.fn();
    window.addEventListener('BLOCKS_UPDATED', eventHandler);

    const blocks = [{ id: 1, courtNumber: 1 }];
    await saveBlocks(blocks);

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler.mock.calls[0][0].detail).toEqual({
      key: STORAGE.BLOCKS,
      blocks,
    });

    window.removeEventListener('BLOCKS_UPDATED', eventHandler);
  });

  it('saveBlocks emits tennisDataUpdate event', async () => {
    const { saveBlocks } = await import('../../../src/platform/attachLegacyBlocks.js');

    const eventHandler = vi.fn();
    window.addEventListener('tennisDataUpdate', eventHandler);

    const blocks = [{ id: 1, courtNumber: 1 }];
    await saveBlocks(blocks);

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler.mock.calls[0][0].detail).toEqual({
      key: STORAGE.BLOCKS,
      data: blocks,
    });

    window.removeEventListener('tennisDataUpdate', eventHandler);
  });

  it('saveBlocks emits DATA_UPDATED event', async () => {
    const { saveBlocks } = await import('../../../src/platform/attachLegacyBlocks.js');

    const eventHandler = vi.fn();
    window.addEventListener('DATA_UPDATED', eventHandler);

    await saveBlocks([]);

    expect(eventHandler).toHaveBeenCalledTimes(1);

    window.removeEventListener('DATA_UPDATED', eventHandler);
  });

  it('saveBlocks normalizes non-array input to empty array', async () => {
    const { saveBlocks } = await import('../../../src/platform/attachLegacyBlocks.js');

    await saveBlocks(null);
    expect(JSON.parse(localStorage.getItem(STORAGE.BLOCKS))).toEqual([]);

    await saveBlocks(undefined);
    expect(JSON.parse(localStorage.getItem(STORAGE.BLOCKS))).toEqual([]);

    await saveBlocks('invalid');
    expect(JSON.parse(localStorage.getItem(STORAGE.BLOCKS))).toEqual([]);
  });

  it('is idempotent - does not overwrite existing saveBlocks', async () => {
    // Set up an existing saveBlocks function
    const existingSaveBlocks = vi.fn();
    window.Tennis = {
      BlocksService: {
        saveBlocks: existingSaveBlocks,
      },
    };

    await import('../../../src/platform/attachLegacyBlocks.js');

    // The existing function should still be there
    expect(window.Tennis.BlocksService.saveBlocks).toBe(existingSaveBlocks);
  });
});
