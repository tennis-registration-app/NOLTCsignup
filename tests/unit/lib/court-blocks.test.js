import { describe, it, expect } from 'vitest';
import { getUpcomingBlockWarningFromBlocks } from '../../../src/lib/court-blocks.js';

describe('getUpcomingBlockWarningFromBlocks', () => {
  // Helper to create a Date offset from base
  const minutesFromNow = (baseDate, minutes) =>
    new Date(baseDate.getTime() + minutes * 60 * 1000).toISOString();

  // Base time for all tests (fixed for determinism)
  const now = new Date('2025-01-15T10:00:00Z');

  // Minimal block factory
  const createBlock = (overrides = {}) => ({
    courtNumber: 1,
    startTime: minutesFromNow(now, 30),
    endTime: minutesFromNow(now, 90),
    reason: 'Reserved',
    isWetCourt: false,
    ...overrides,
  });

  it('returns null when no blocks exist', () => {
    const result = getUpcomingBlockWarningFromBlocks(1, 60, [], now);
    expect(result).toBeNull();
  });

  it('returns null when block is on a different court', () => {
    const blocks = [createBlock({ courtNumber: 5 })];
    const result = getUpcomingBlockWarningFromBlocks(3, 60, blocks, now);
    expect(result).toBeNull();
  });

  it('returns null when block is already active', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, -10), // Started 10 min ago
        endTime: minutesFromNow(now, 50),
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);
    expect(result).toBeNull();
  });

  it('returns null when block is a wet court (handled separately)', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 3), // Would trigger 'blocked' if not wet
        isWetCourt: true,
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);
    expect(result).toBeNull();
  });

  it('returns type:blocked when block starts within 5 minutes', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 3), // Exactly 3 minutes from now
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);

    expect(result).not.toBeNull();
    expect(result.type).toBe('blocked');
    expect(result.minutesUntilBlock).toBe(3); // Exact assertion (deterministic)
    expect(typeof result.startTime).toBe('string');
  });

  it('returns type:limited when block starts before session ends but after 5 minutes', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 30), // 30 minutes from now
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);

    expect(result).not.toBeNull();
    expect(result.type).toBe('limited');
    expect(result.limitedDuration).toBeGreaterThan(0);
    expect(result.limitedDuration).toBeLessThanOrEqual(60);
    expect(result.minutesUntilBlock).toBeGreaterThan(5);
    expect(typeof result.startTime).toBe('string');
  });

  it('returns null when block starts after session would end', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 90), // 90 minutes from now, session is 60
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);
    expect(result).toBeNull();
  });

  it('returns earliest upcoming block when multiple blocks exist', () => {
    const laterBlock = createBlock({
      courtNumber: 1,
      startTime: minutesFromNow(now, 45), // 45 minutes from now
      reason: 'Later Block',
    });
    const earlierBlock = createBlock({
      courtNumber: 1,
      startTime: minutesFromNow(now, 20), // 20 minutes from now (earlier)
      reason: 'Earlier Block',
    });
    // Intentionally pass later block first to test sorting
    const blocks = [laterBlock, earlierBlock];

    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);

    expect(result).not.toBeNull();
    expect(result.type).toBe('limited');
    // Should return the earlier block (20 min), not the later one (45 min)
    expect(result.startTime).toBe(earlierBlock.startTime);
  });
});
