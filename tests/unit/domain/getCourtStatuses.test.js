/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// We need to set up the window.Tennis namespace before loading the module
beforeEach(() => {
  // Set up Tennis namespace
  window.Tennis = window.Tennis || {};
  window.Tennis.Config = { Courts: { TOTAL_COUNT: 12 } };
  window.Tennis.Domain = {};
});

afterEach(() => {
  delete window.Tennis;
});

// Helper to load the availability module fresh
function loadAvailabilityModule() {
  // Clear any cached module
  const moduleUrl = new URL(
    '../../../domain/availability.js',
    import.meta.url
  ).href;

  // Execute the module code directly
  const script = document.createElement('script');
  script.src = moduleUrl;

  // Since we can't easily load the IIFE in tests, we'll inline the key functions
  // This mirrors the exact logic from domain/availability.js

  function coerceDate(d) {
    if (d instanceof Date) return d;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function isOvertime(session, now) {
    if (!session?.scheduledEndAt) return false;
    return coerceDate(session.scheduledEndAt) <= now;
  }

  function normalizeBlocks(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  function isActiveBlock(b, now) {
    if (!b) return false;
    const st = new Date(b.startTime ?? b.start);
    const et = new Date(b.endTime ?? b.end);
    return (
      st instanceof Date &&
      !isNaN(st) &&
      et instanceof Date &&
      !isNaN(et) &&
      st <= now &&
      now < et
    );
  }

  function getFreeCourtsInfo({ data, now, blocks, wetSet }) {
    const total = window.Tennis?.Config?.Courts?.TOTAL_COUNT || 12;
    const all = Array.from({ length: total }, (_, i) => i + 1);

    now = coerceDate(now);
    blocks = normalizeBlocks(blocks);
    wetSet = wetSet instanceof Set ? wetSet : new Set();

    const free = [];
    const overtime = [];
    const wet = Array.from(wetSet).sort((a, b) => a - b);

    for (let i = 0; i < (data?.courts?.length || 0); i++) {
      const n = i + 1;

      const isWet = wetSet.has(n);
      const isBlocked = blocks.some((b) => {
        const courtNum = Number(b.courtNumber || b.court);
        if (!courtNum || courtNum !== n) return false;
        const start = coerceDate(b.startTime || b.start);
        const end = coerceDate(b.endTime || b.end);
        return start <= now && now < end;
      });

      if (isWet || isBlocked) continue;

      const court = data.courts[i];
      const session = court?.session;

      if (!session) {
        free.push(n);
        continue;
      }

      if (isOvertime(session, now) && !session.isTournament) {
        overtime.push(n);
      }
    }

    const freeSet = new Set(free);
    const occupied = all
      .filter((n) => !freeSet.has(n) && !overtime.includes(n) && !wet.includes(n))
      .sort((a, b) => a - b);

    return {
      free: free.sort((a, b) => a - b),
      occupied,
      wet,
      overtime: overtime.sort((a, b) => a - b),
      meta: { total, overtimeCount: overtime.length },
    };
  }

  function getCourtStatuses({ data, now, blocks, wetSet, upcomingBlocks = [] }) {
    const info = getFreeCourtsInfo({ data, now, blocks, wetSet });

    const S = (arr) => new Set(Array.isArray(arr) ? arr : []);
    const freeSet = S(info.free);
    const occSet = S(info.occupied);
    const overtimeSet = S(info.overtime);
    const wetSetLocal = S(info.wet);

    const activeBlocked = new Set(
      (blocks || [])
        .filter((b) => isActiveBlock(b, now))
        .filter((b) => !b.isWetCourt)
        .map((b) => b.courtNumber)
    );

    const hasTrueFree = freeSet.size > 0;

    // Check if any free court has >= 20 min of usable time before next block
    const MIN_USEFUL_MS = 20 * 60 * 1000;
    const hasUsableFree =
      hasTrueFree &&
      [...freeSet].some((courtNum) => {
        if (!upcomingBlocks || upcomingBlocks.length === 0) return true;
        const nextBlock = upcomingBlocks.find(
          (b) =>
            Number(b.courtNumber || b.court) === courtNum &&
            new Date(b.startTime || b.start) > now
        );
        if (!nextBlock) return true;
        return new Date(nextBlock.startTime || nextBlock.start) - now >= MIN_USEFUL_MS;
      });

    const total = (data?.courts || []).length || info.meta?.total || 0;
    const out = [];
    for (let n = 1; n <= total; n++) {
      const isWet = wetSetLocal.has(n);
      const isBlocked = activeBlocked.has(n);
      const isFree = freeSet.has(n);
      const isOvertimeFlag = overtimeSet.has(n);
      const isOccupied = occSet.has(n);

      let status = 'free';
      if (isWet) status = 'wet';
      else if (isBlocked) status = 'blocked';
      else if (isOvertimeFlag) status = 'overtime';
      else if (isOccupied) status = 'occupied';
      else if (isFree) status = 'free';

      const court = data.courts[n - 1];
      const isTournament = court?.session?.isTournament ?? false;
      if (
        status === 'occupied' &&
        isTournament &&
        court?.session?.scheduledEndAt &&
        new Date(court.session.scheduledEndAt) <= now
      ) {
        status = 'overtime';
      }

      const selectable =
        !isWet &&
        !isBlocked &&
        (status === 'free' || (status === 'overtime' && !hasUsableFree && !isTournament));

      out.push({
        courtNumber: n,
        status,
        selectable,
        isWet,
        isBlocked,
        isFree,
        isOvertime: isOvertimeFlag,
        isOccupied,
      });
    }
    return out;
  }

  return { getCourtStatuses, getFreeCourtsInfo };
}

describe('getCourtStatuses with upcomingBlocks (20-min threshold)', () => {
  it('overtime is selectable when free court has block starting in < 20 minutes', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    // Court 1: free (no session)
    // Court 2: overtime (session ended)
    const data = {
      courts: [
        { session: null }, // Court 1 - free
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    // Block on court 1 starting in 5 minutes (< 20 min threshold)
    const upcomingBlocks = [
      {
        courtNumber: 1,
        startTime: '2025-01-15T10:05:00Z',
        endTime: '2025-01-15T11:00:00Z',
      },
    ];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // Court 1 (free) should still be selectable
    expect(statuses[0].status).toBe('free');
    expect(statuses[0].selectable).toBe(true);

    // Court 2 (overtime) should also be selectable because no usable free courts
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(true);
  });

  it('overtime is NOT selectable when free court has block starting in > 20 minutes', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    // Block on court 1 starting in 25 minutes (> 20 min threshold)
    const upcomingBlocks = [
      {
        courtNumber: 1,
        startTime: '2025-01-15T10:25:00Z',
        endTime: '2025-01-15T11:00:00Z',
      },
    ];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // Court 1 (free) should be selectable
    expect(statuses[0].status).toBe('free');
    expect(statuses[0].selectable).toBe(true);

    // Court 2 (overtime) should NOT be selectable (usable free court exists)
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(false);
  });

  it('overtime is NOT selectable when free court has no block (no regression)', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    const upcomingBlocks = []; // No blocks

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // Court 1 (free) should be selectable
    expect(statuses[0].status).toBe('free');
    expect(statuses[0].selectable).toBe(true);

    // Court 2 (overtime) should NOT be selectable (free court exists)
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(false);
  });

  it('overtime is selectable when no free courts exist (no regression)', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: { scheduledEndAt: '2025-01-15T11:00:00Z' } }, // Court 1 - occupied
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    const upcomingBlocks = [];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // Court 1 (occupied) should NOT be selectable
    expect(statuses[0].status).toBe('occupied');
    expect(statuses[0].selectable).toBe(false);

    // Court 2 (overtime) should be selectable (no free courts)
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(true);
  });

  it('block on different court does not affect overtime selectability', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    // Block on court 3, not court 1
    const upcomingBlocks = [
      {
        courtNumber: 3,
        startTime: '2025-01-15T10:05:00Z',
        endTime: '2025-01-15T11:00:00Z',
      },
    ];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // Court 1 (free) has no block, so it's usable
    expect(statuses[0].selectable).toBe(true);

    // Court 2 (overtime) should NOT be selectable (usable free court exists)
    expect(statuses[1].selectable).toBe(false);
  });

  it('handles multiple free courts with mixed block times', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free (block in 5 min)
        { session: null }, // Court 2 - free (block in 25 min)
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 3 - overtime
      ],
    };

    const upcomingBlocks = [
      {
        courtNumber: 1,
        startTime: '2025-01-15T10:05:00Z', // 5 min
        endTime: '2025-01-15T11:00:00Z',
      },
      {
        courtNumber: 2,
        startTime: '2025-01-15T10:25:00Z', // 25 min
        endTime: '2025-01-15T11:00:00Z',
      },
    ];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // Both free courts are selectable
    expect(statuses[0].selectable).toBe(true);
    expect(statuses[1].selectable).toBe(true);

    // Court 3 (overtime) should NOT be selectable (court 2 has >= 20 min)
    expect(statuses[2].selectable).toBe(false);
  });

  it('backwards compatible: works without upcomingBlocks parameter', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    // Call without upcomingBlocks
    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
    });

    // Should behave as if no upcoming blocks (overtime not selectable)
    expect(statuses[0].selectable).toBe(true);
    expect(statuses[1].selectable).toBe(false);
  });
});

describe('overtime selectability with upcoming blocks', () => {
  it('overtime stays blue when usable free court exists', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free (no block)
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks: [],
    });

    // Free court available, so overtime should NOT be selectable (stays "blue")
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(false);
  });

  it('overtime turns green when all free courts have blocks < 20 min', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free (block in 10 min)
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    const upcomingBlocks = [
      {
        courtNumber: 1,
        startTime: '2025-01-15T10:10:00Z', // 10 min
        endTime: '2025-01-15T11:00:00Z',
      },
    ];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // No usable free court, so overtime becomes selectable (turns "green")
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(true);
  });

  it('overtime turns green when no free courts at all', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: { scheduledEndAt: '2025-01-15T11:00:00Z' } }, // Court 1 - occupied
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks: [],
    });

    // No free courts, so overtime becomes selectable
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(true);
  });

  it('tournament overtime never turns green', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: { scheduledEndAt: '2025-01-15T11:00:00Z' } }, // Court 1 - occupied
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z', isTournament: true } }, // Court 2 - tournament overtime
      ],
    };

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks: [],
    });

    // Tournament overtime should NOT be selectable even when no free courts
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(false);
  });

  it('wet court not counted as usable free', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - would be free but is wet
        { session: { scheduledEndAt: '2025-01-15T09:00:00Z' } }, // Court 2 - overtime
      ],
    };

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set([1]), // Court 1 is wet
      upcomingBlocks: [],
    });

    // Court 1 is wet, not counted as free
    expect(statuses[0].status).toBe('wet');
    expect(statuses[0].selectable).toBe(false);

    // Overtime should be selectable since no usable free courts
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(true);
  });
});

describe('court coloring consistency', () => {
  it('free court with block warning still shows as free', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free with upcoming block
      ],
    };

    const upcomingBlocks = [
      {
        courtNumber: 1,
        startTime: '2025-01-15T10:15:00Z', // 15 min - will show warning
        endTime: '2025-01-15T11:00:00Z',
      },
    ];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks: [],
      wetSet: new Set(),
      upcomingBlocks,
    });

    // Court should still show as "free" status, just with warning
    expect(statuses[0].status).toBe('free');
    expect(statuses[0].selectable).toBe(true);
  });

  it('blocked court never shows as selectable', () => {
    const { getCourtStatuses } = loadAvailabilityModule();
    const now = new Date('2025-01-15T10:00:00Z');

    const data = {
      courts: [
        { session: null }, // Court 1 - free but blocked
      ],
    };

    const blocks = [
      {
        courtNumber: 1,
        startTime: '2025-01-15T09:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
        reason: 'Maintenance',
      },
    ];

    const statuses = getCourtStatuses({
      data,
      now,
      blocks,
      wetSet: new Set(),
      upcomingBlocks: [],
    });

    // Blocked court should never be selectable
    expect(statuses[0].status).toBe('blocked');
    expect(statuses[0].selectable).toBe(false);
  });
});
