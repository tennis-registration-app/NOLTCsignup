import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage to control readJSON for getCourtBlockStatus
vi.mock('../../../src/lib/storage.js', () => ({
  readJSON: vi.fn(() => []),
}));

import { readJSON } from '../../../src/lib/storage.js';

// Type assertion: partial mock for testing — readJSON is vi.fn() via vi.mock above
const readJSONMock = readJSON as unknown as ReturnType<typeof vi.fn>;
import {
  getCourtBlockStatus,
  getUpcomingBlockWarningFromBlocks,
  getUpcomingBlockWarning,
} from '../../../src/lib/court-blocks.js';

describe('getUpcomingBlockWarningFromBlocks', () => {
  // Helper to create a Date offset from base
  const minutesFromNow = (baseDate: any, minutes: any) =>
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
    expect(result!.type).toBe('blocked');
    expect(result!.minutesUntilBlock).toBe(3); // Exact assertion (deterministic)
    expect(typeof result!.startTime).toBe('string');
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
    expect(result!.type).toBe('limited');
    expect(result!.limitedDuration).toBeGreaterThan(0);
    expect(result!.limitedDuration).toBeLessThanOrEqual(60);
    expect(result!.minutesUntilBlock).toBeGreaterThan(5);
    expect(typeof result!.startTime).toBe('string');
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
    expect(result!.type).toBe('limited');
    // Should return the earlier block (20 min), not the later one (45 min)
    expect(result!.startTime).toBe(earlierBlock.startTime);
  });

  it('returns limited with duration=0 for any upcoming block', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 120), // Far future
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 0, blocks, now);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('limited');
    expect(result!.originalDuration).toBe(0);
  });

  it('uses title as reason when available', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 3),
        title: 'Lesson Block',
        reason: 'lesson',
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);
    expect(result!.reason).toBe('Lesson Block');
  });

  it('falls back to reason when no title', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 3),
        title: undefined,
        reason: 'Maintenance',
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);
    expect(result!.reason).toBe('Maintenance');
  });

  it('falls back to Reserved when no title or reason', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, 3),
        title: undefined,
        reason: undefined,
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);
    expect(result!.reason).toBe('Reserved');
  });

  it('returns null when block already ended', () => {
    const blocks = [
      createBlock({
        courtNumber: 1,
        startTime: minutesFromNow(now, -60),
        endTime: minutesFromNow(now, -10),
      }),
    ];
    const result = getUpcomingBlockWarningFromBlocks(1, 60, blocks, now);
    expect(result).toBeNull();
  });
});

// ── getCourtBlockStatus ─────────────────────────────────────
describe('getCourtBlockStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const now = new Date('2025-01-15T10:00:00Z');
  const minutesFromNow = (minutes: any) =>
    new Date(now.getTime() + minutes * 60 * 1000).toISOString();

  it('returns not blocked when no blocks exist', () => {
    readJSONMock.mockReturnValue([]);
    // We can't control `new Date()` inside the function, but we test the shape
    const result = getCourtBlockStatus(1);
    expect(result.isBlocked).toBe(false);
    expect(result.isCurrent).toBe(false);
    expect(result.isWetCourt).toBe(false);
  });

  it('returns not blocked when blocks are for other courts', () => {
    readJSONMock.mockReturnValue([
      {
        courtNumber: 5,
        startTime: new Date(Date.now() - 60000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        isWetCourt: false,
        reason: 'test',
      },
    ]);
    const result = getCourtBlockStatus(1);
    expect(result.isBlocked).toBe(false);
  });

  it('detects active wet court block with priority', () => {
    const nowMs = Date.now();
    readJSONMock.mockReturnValue([
      {
        courtNumber: 1,
        isWetCourt: true,
        startTime: new Date(nowMs - 60000).toISOString(),
        endTime: new Date(nowMs + 3600000).toISOString(),
      },
    ]);
    const result = getCourtBlockStatus(1);
    expect(result.isBlocked).toBe(true);
    expect(result.isCurrent).toBe(true);
    expect(result.isWetCourt).toBe(true);
    expect(result.reason).toBe('WET COURT');
    expect(result.remainingMinutes).toBeGreaterThan(0);
  });

  it('detects active non-wet block', () => {
    const nowMs = Date.now();
    readJSONMock.mockReturnValue([
      {
        courtNumber: 2,
        isWetCourt: false,
        startTime: new Date(nowMs - 60000).toISOString(),
        endTime: new Date(nowMs + 3600000).toISOString(),
        reason: 'Lesson',
        title: 'Tennis Lesson',
        eventDetails: { instructor: 'Coach' },
      },
    ]);
    const result = getCourtBlockStatus(2);
    expect(result.isBlocked).toBe(true);
    expect(result.isCurrent).toBe(true);
    expect(result.isWetCourt).toBe(false);
    expect(result.reason).toBe('Lesson');
    expect(result.title).toBe('Tennis Lesson');
    expect(result.remainingMinutes).toBeGreaterThan(0);
  });

  it('handles readJSON returning null', () => {
    readJSONMock.mockReturnValue(null);
    const result = getCourtBlockStatus(1);
    expect(result.isBlocked).toBe(false);
  });

  it('handles readJSON throwing', () => {
    readJSONMock.mockImplementation(() => {
      throw new Error('corrupted');
    });
    const result = getCourtBlockStatus(1);
    expect(result.isBlocked).toBe(false);
  });
});

// ── getUpcomingBlockWarning ─────────────────────────────────
describe('getUpcomingBlockWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to getUpcomingBlockWarningFromBlocks with readJSON data', () => {
    const nowMs = Date.now();
    readJSONMock.mockReturnValue([
      {
        courtNumber: 1,
        startTime: new Date(nowMs + 3 * 60000).toISOString(),
        endTime: new Date(nowMs + 90 * 60000).toISOString(),
        isWetCourt: false,
        reason: 'Test',
      },
    ]);
    const result = getUpcomingBlockWarning(1, 60);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('blocked');
  });

  it('returns null when readJSON throws', () => {
    readJSONMock.mockImplementation(() => {
      throw new Error('fail');
    });
    const result = getUpcomingBlockWarning(1, 60);
    expect(result).toBeNull();
  });

  it('returns null when no blocks', () => {
    readJSONMock.mockReturnValue([]);
    const result = getUpcomingBlockWarning(1, 60);
    expect(result).toBeNull();
  });
});
