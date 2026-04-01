/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  availability,
  hasSoonBlockConflict,
  getSelectableCourts,
  getSelectableCourtsStrict,
  getSelectableCourtsForAssignment,
  canAssignToCourt,
  shouldAllowWaitlistJoin,
  getFreeCourts,
  getFreeCourtsInfo,
  getNextFreeTimes,
  getCourtStatuses,
} from '../../../src/tennis/domain/availability.js';

describe('availability ESM port', () => {
  beforeEach(() => {
    // Reset window.Tennis for clean test state
    delete window.Tennis;
    // Re-import to re-attach
    window.Tennis = window.Tennis || {};
    window.Tennis.Domain = window.Tennis.Domain || {};
    window.Tennis.Domain.availability = availability;
    window.Tennis.Domain.Availability = availability;
  });

  it('both window casings exist and are same reference', () => {
    expect(window.Tennis.Domain.availability).toBe(window.Tennis.Domain.Availability);
  });

  it('API has exactly 10 expected keys', () => {
    const keys = Object.keys(availability).sort();
    expect(keys).toEqual([
      'canAssignToCourt',
      'getCourtStatuses',
      'getFreeCourts',
      'getFreeCourtsInfo',
      'getNextFreeTimes',
      'getSelectableCourts',
      'getSelectableCourtsForAssignment',
      'getSelectableCourtsStrict',
      'hasSoonBlockConflict',
      'shouldAllowWaitlistJoin',
    ]);
  });

  it('isOvertime detects past-end session', () => {
    const now = new Date('2026-01-01T13:00:00');
    const statuses = availability.getCourtStatuses({
      data: {
        courts: [
          {
            number: 1,
            session: {
              scheduledEndAt: '2026-01-01T12:00:00',
              group: { players: [{ name: 'Test' }] },
            },
          },
        ],
      },
      now,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(statuses[0]?.status).toBe('overtime');
  });

  it('shouldAllowWaitlistJoin with empty courts', () => {
    const result = availability.shouldAllowWaitlistJoin({
      data: { courts: Array(12).fill(null) },
      now: new Date(),
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result).toBe(false);
  });

  describe('getFreeCourts', () => {
    it('returns free courts when no sessions', () => {
      const result = availability.getFreeCourts({
        data: { courts: [null, null, null] },
        now: new Date(),
        blocks: [],
        wetSet: new Set<number>(),
      });
      expect(result).toEqual([1, 2, 3]);
    });

    it('excludes wet courts', () => {
      const result = availability.getFreeCourts({
        data: { courts: [null, null, null] },
        now: new Date(),
        blocks: [],
        wetSet: new Set([2]),
      });
      expect(result).toEqual([1, 3]);
    });

    it('excludes occupied courts', () => {
      const result = availability.getFreeCourts({
        data: {
          courts: [null, { session: { scheduledEndAt: '2099-01-01T12:00:00' } }, null],
        },
        now: new Date(),
        blocks: [],
        wetSet: new Set<number>(),
      });
      expect(result).toEqual([1, 3]);
    });

    it('excludes blocked courts', () => {
      const now = new Date('2026-01-01T10:00:00');
      const result = availability.getFreeCourts({
        data: { courts: [null, null, null] },
        now,
        blocks: [
          {
            courtNumber: 2,
            startTime: '2026-01-01T09:00:00',
            endTime: '2026-01-01T11:00:00',
          },
        ],
        wetSet: new Set<number>(),
      });
      expect(result).toEqual([1, 3]);
    });
  });

  describe('getFreeCourtsInfo', () => {
    it('classifies courts correctly', () => {
      // Mock Tennis.Config for this test
      window.Tennis = window.Tennis || {};
      window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };

      const now = new Date('2026-01-01T13:00:00');
      const result = availability.getFreeCourtsInfo({
        data: {
          courts: [
            null, // free
            { session: { scheduledEndAt: '2026-01-01T12:00:00' } }, // overtime
            { session: { scheduledEndAt: '2026-01-01T14:00:00' } }, // occupied
          ],
        },
        now,
        blocks: [],
        wetSet: new Set<number>(),
      });

      expect(result.free).toEqual([1]);
      expect(result.overtime).toEqual([2]);
      expect(result.occupied).toEqual([3]);
    });
  });

  describe('hasSoonBlockConflict', () => {
    it('detects block conflict within required time', () => {
      const now = new Date('2026-01-01T10:00:00');
      const result = availability.hasSoonBlockConflict({
        courtNumber: 1,
        now,
        blocks: [
          {
            courtNumber: 1,
            startTime: '2026-01-01T10:30:00',
            endTime: '2026-01-01T11:30:00',
          },
        ],
        requiredMinutes: 60,
      });
      expect(result).toBe(true);
    });

    it('returns false when no conflict', () => {
      const now = new Date('2026-01-01T10:00:00');
      const result = availability.hasSoonBlockConflict({
        courtNumber: 1,
        now,
        blocks: [
          {
            courtNumber: 1,
            startTime: '2026-01-01T12:00:00',
            endTime: '2026-01-01T13:00:00',
          },
        ],
        requiredMinutes: 60,
      });
      expect(result).toBe(false);
    });
  });

  describe('getSelectableCourtsStrict', () => {
    it('returns free courts when available', () => {
      window.Tennis = window.Tennis || {};
      window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };

      const result = availability.getSelectableCourtsStrict({
        data: { courts: [null, null, null] },
        now: new Date(),
        blocks: [],
        wetSet: new Set<number>(),
      });
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns overtime courts when no free', () => {
      window.Tennis = window.Tennis || {};
      window.Tennis.Config = { Courts: { TOTAL_COUNT: 2 } };

      const now = new Date('2026-01-01T13:00:00');
      const result = availability.getSelectableCourtsStrict({
        data: {
          courts: [
            { session: { scheduledEndAt: '2026-01-01T12:00:00' } }, // overtime
            { session: { scheduledEndAt: '2026-01-01T14:00:00' } }, // occupied
          ],
        },
        now,
        blocks: [],
        wetSet: new Set<number>(),
      });
      expect(result).toEqual([1]);
    });
  });
});

// ============================================================
// Shared fixtures for extended tests
// ============================================================
const T = new Date('2026-06-15T14:00:00Z');
const mins = (n) => new Date(T.getTime() + n * 60000).toISOString();

/** Build a 3-court data fixture. Override individual courts by index (1-based). */
function makeData(courtOverrides = {}) {
  const courts = [null, null, null];
  for (const [num, court] of Object.entries(courtOverrides)) {
    courts[Number(num) - 1] = court;
  }
  return { courts };
}

function block(courtNumber, startOffset, endOffset, extra = {}) {
  return {
    courtNumber,
    startTime: mins(startOffset),
    endTime: mins(endOffset),
    ...extra,
  };
}

function occupiedCourt(endOffset, extra = {}) {
  return { session: { scheduledEndAt: mins(endOffset), ...extra } };
}

function overtimeCourt(endOffset = -60, extra = {}) {
  return { session: { scheduledEndAt: mins(endOffset), ...extra } };
}

// ============================================================
// A) hasSoonBlockConflict — extended
// ============================================================
describe('hasSoonBlockConflict (extended)', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('block starts in 30 min, requiredMinutes=60 → conflict', () => {
    expect(
      hasSoonBlockConflict({
        courtNumber: 1,
        now: T,
        blocks: [block(1, 30, 90)],
        requiredMinutes: 60,
      })
    ).toBe(true);
  });

  it('block starts in 90 min, requiredMinutes=60 → no conflict', () => {
    expect(
      hasSoonBlockConflict({
        courtNumber: 1,
        now: T,
        blocks: [block(1, 90, 150)],
        requiredMinutes: 60,
      })
    ).toBe(false);
  });

  it('no blocks for this court → no conflict', () => {
    expect(
      hasSoonBlockConflict({
        courtNumber: 1,
        now: T,
        blocks: [block(2, 10, 60)],
        requiredMinutes: 60,
      })
    ).toBe(false);
  });

  it('empty blocks array → no conflict', () => {
    expect(
      hasSoonBlockConflict({
        courtNumber: 1,
        now: T,
        blocks: [],
        requiredMinutes: 60,
      })
    ).toBe(false);
  });

  it('block already active (started before now, ends after now) → conflict', () => {
    expect(
      hasSoonBlockConflict({
        courtNumber: 1,
        now: T,
        blocks: [block(1, -30, 30)],
        requiredMinutes: 60,
      })
    ).toBe(true);
  });

  it('block starts exactly at requiredMinutes boundary → no conflict', () => {
    // requiredEndTime = T + 60min. Block starts at T+60, so blockStart < requiredEndTime is false.
    expect(
      hasSoonBlockConflict({
        courtNumber: 1,
        now: T,
        blocks: [block(1, 60, 120)],
        requiredMinutes: 60,
      })
    ).toBe(false);
  });

  it('block ends exactly at now → no conflict (blockEnd > now is false)', () => {
    expect(
      hasSoonBlockConflict({
        courtNumber: 1,
        now: T,
        blocks: [block(1, -60, 0)],
        requiredMinutes: 60,
      })
    ).toBe(false);
  });

  // Validation guard branches
  it('throws for invalid courtNumber (0)', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: 0, now: T, blocks: [], requiredMinutes: 60 })
    ).toThrow('Invalid court number');
  });

  it('throws for negative courtNumber', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: -1, now: T, blocks: [], requiredMinutes: 60 })
    ).toThrow('Invalid court number');
  });

  it('throws for non-number courtNumber', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: 'a', now: T, blocks: [], requiredMinutes: 60 })
    ).toThrow('Invalid court number');
  });

  it('throws for null now', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: 1, now: null, blocks: [], requiredMinutes: 60 })
    ).toThrow('Invalid current time');
  });

  it('throws for non-Date now', () => {
    expect(() =>
      hasSoonBlockConflict({
        courtNumber: 1,
        now: '2026-01-01',
        blocks: [],
        requiredMinutes: 60,
      })
    ).toThrow('Invalid current time');
  });

  it('throws for non-array blocks', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: 1, now: T, blocks: 'bad', requiredMinutes: 60 })
    ).toThrow('Blocks must be an array');
  });

  it('throws for zero requiredMinutes', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: 1, now: T, blocks: [], requiredMinutes: 0 })
    ).toThrow('Required minutes must be a positive number');
  });

  it('throws for negative requiredMinutes', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: 1, now: T, blocks: [], requiredMinutes: -10 })
    ).toThrow('Required minutes must be a positive number');
  });

  it('throws for non-number requiredMinutes', () => {
    expect(() =>
      hasSoonBlockConflict({ courtNumber: 1, now: T, blocks: [], requiredMinutes: 'long' })
    ).toThrow('Required minutes must be a positive number');
  });
});

// ============================================================
// B) getSelectableCourts — composition logic
// ============================================================
describe('getSelectableCourts (extended)', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('returns free courts (not occupied, blocked, or wet)', () => {
    const result = getSelectableCourts({
      data: makeData({ 2: occupiedCourt(120) } as any),
      now: T,
      blocks: [block(3, -30, 30)],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([1]);
  });

  it('all blocked → falls through to overtime → empty if no overtime', () => {
    const result = getSelectableCourts({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30), block(2, -30, 30), block(3, -30, 30)],
      wetSet: new Set<number>(),
    } as any);
    expect(result).toEqual([]);
  });

  it('wet courts excluded', () => {
    const result = getSelectableCourts({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set([1, 3]),
    } as any);
    expect(result).toEqual([2]);
  });

  it('falls back to overtime courts when no free courts exist', () => {
    const result = getSelectableCourts({
      data: makeData({
        1: occupiedCourt(120),
        2: overtimeCourt(-60),
        3: occupiedCourt(120),
      } as any),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([2]);
  });

  it('prefers free courts over overtime (does not include overtime when free exists)', () => {
    const result = getSelectableCourts({
      data: makeData({
        1: null,
        2: overtimeCourt(-60),
        3: occupiedCourt(120),
      } as any),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([1]);
  });

  it('active block with isWetCourt flag is not double-filtered', () => {
    // Block on court 1 that is a wet-court block — should not filter court 1
    // from free list (wet handling is via wetSet, not block filtering)
    const result = getSelectableCourts({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30, { isWetCourt: true } as any)],
      wetSet: new Set<number>(),
    });
    // Court 1 is still free because isWetCourt blocks are skipped in activeBlocked filter
    // But getFreeCourtsInfo still marks it as blocked via its own block check
    // Actually: getFreeCourtsInfo checks isBlockActiveNow independently
    // isBlockActiveNow matches the block, so court 1 is NOT free in info.
    // But activeBlocked skips isWetCourt blocks, so the filter doesn't remove it.
    // Since info.free won't include court 1 (it's blocked in info), court 1 is absent.
    expect(result).toEqual([2, 3]);
  });
});

// ============================================================
// C) getSelectableCourtsStrict vs getSelectableCourts
// ============================================================
describe('getSelectableCourtsStrict vs getSelectableCourts', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('strict does not filter by active blocks (simpler path)', () => {
    // getSelectableCourtsStrict uses getFreeCourtsInfo directly
    // getSelectableCourts additionally filters via isBlockActiveNow
    // With a non-wet active block:
    const params = {
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30)],
      wetSet: new Set<number>(),
    };

    const strict = getSelectableCourtsStrict(params as any);
    const nonStrict = getSelectableCourts(params as any);

    // Both should exclude court 1 (blocked in getFreeCourtsInfo)
    // Strict: [2, 3]
    // NonStrict: free=[2,3], activeBlocked has court 1 → free.filter → [2,3]
    expect(strict).toEqual([2, 3]);
    expect(nonStrict).toEqual([2, 3]);
  });

  it('strict falls back to overtime; non-strict also falls back to overtime', () => {
    const params = {
      data: makeData({
        1: occupiedCourt(120),
        2: overtimeCourt(-60),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    };

    const strict = getSelectableCourtsStrict(params as any);
    const nonStrict = getSelectableCourts(params as any);

    expect(strict).toEqual([2]);
    expect(nonStrict).toEqual([2]);
  });

  it('strict returns empty when all courts occupied (no overtime)', () => {
    const result = getSelectableCourtsStrict({
      data: makeData({
        1: occupiedCourt(120),
        2: occupiedCourt(120),
        3: occupiedCourt(120),
      } as any),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([]);
  });
});

// ============================================================
// D) canAssignToCourt
// ============================================================
describe('canAssignToCourt', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  const params = () => ({
    data: makeData({ 2: occupiedCourt(120) }),
    now: T,
    blocks: [block(3, -30, 30)],
    wetSet: new Set<number>(),
  });

  it('court is free and unblocked → true', () => {
    expect(canAssignToCourt(1, params() as any)).toBe(true);
  });

  it('court is occupied → false', () => {
    expect(canAssignToCourt(2, params() as any)).toBe(false);
  });

  it('court is blocked → false', () => {
    expect(canAssignToCourt(3, params() as any)).toBe(false);
  });

  it('court is wet → false', () => {
    expect(canAssignToCourt(1, { ...params(), wetSet: new Set([1]) } as any)).toBe(false);
  });

  it('court number not in data range → false', () => {
    expect(canAssignToCourt(99, params() as any)).toBe(false);
  });

  it('overtime court is not assignable (assignment requires truly free)', () => {
    expect(
      canAssignToCourt(1, {
        data: makeData({
          1: overtimeCourt(-60),
          2: occupiedCourt(120),
          3: occupiedCourt(120),
        }),
        now: T,
        blocks: [],
        wetSet: new Set<number>(),
      })
    ).toBe(false);
  });
});

// ============================================================
// E) shouldAllowWaitlistJoin
// ============================================================
describe('shouldAllowWaitlistJoin (extended)', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('all courts occupied → allow join (true)', () => {
    const result = shouldAllowWaitlistJoin({
      data: makeData({
        1: occupiedCourt(120),
        2: occupiedCourt(120),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result).toBe(true);
  });

  it('some courts free → do not allow (false)', () => {
    const result = shouldAllowWaitlistJoin({
      data: makeData({
        1: null,
        2: occupiedCourt(120),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result).toBe(false);
  });

  it('all courts blocked → allow join (true)', () => {
    const result = shouldAllowWaitlistJoin({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30), block(2, -30, 30), block(3, -30, 30)],
      wetSet: new Set<number>(),
    });
    expect(result).toBe(true);
  });

  it('overtime courts exist but no free → do not allow (overtime is selectable)', () => {
    const result = shouldAllowWaitlistJoin({
      data: makeData({
        1: overtimeCourt(-60),
        2: occupiedCourt(120),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    // getSelectableCourtsStrict returns [1] (overtime fallback) → not empty → false
    expect(result).toBe(false);
  });

  it('all wet → allow join (true)', () => {
    const result = shouldAllowWaitlistJoin({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set([1, 2, 3]),
    });
    expect(result).toBe(true);
  });
});

// ============================================================
// F) getSelectableCourtsForAssignment
// ============================================================
describe('getSelectableCourtsForAssignment', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('returns only truly free courts (excludes overtime)', () => {
    const result = getSelectableCourtsForAssignment({
      data: makeData({
        1: null,
        2: overtimeCourt(-60),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    // getSelectableCourts returns [1] (free preferred), filter by trulyFree [1] → [1]
    expect(result).toEqual([1]);
  });

  it('returns empty when only overtime courts are selectable', () => {
    const result = getSelectableCourtsForAssignment({
      data: makeData({
        1: overtimeCourt(-60),
        2: occupiedCourt(120),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    // getSelectableCourts returns [1] (overtime fallback), trulyFree = [] → intersection = []
    expect(result).toEqual([]);
  });

  it('excludes blocked courts', () => {
    const result = getSelectableCourtsForAssignment({
      data: makeData(),
      now: T,
      blocks: [block(2, -30, 30)],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([1, 3]);
  });

  it('excludes wet courts', () => {
    const result = getSelectableCourtsForAssignment({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set([2]),
    });
    expect(result).toEqual([1, 3]);
  });
});

// ============================================================
// G) getFreeCourts — branch gaps
// ============================================================
describe('getFreeCourts (branch gaps)', () => {
  it('throws for invalid data', () => {
    expect(() => getFreeCourts({ data: null, now: T, blocks: [], wetSet: new Set<number>() })).toThrow(
      'Invalid data'
    );
  });

  it('throws for missing courts array', () => {
    expect(() => getFreeCourts({ data: {}, now: T, blocks: [], wetSet: new Set<number>() })).toThrow(
      'Invalid data'
    );
  });

  it('coerces string now to Date', () => {
    const result = getFreeCourts({
      data: { courts: [null] },
      now: '2026-06-15T14:00:00Z',
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([1]);
  });

  it('handles non-array blocks gracefully (normalizes to [])', () => {
    const result = getFreeCourts({
      data: { courts: [null] },
      now: T,
      blocks: null,
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([1]);
  });

  it('handles non-Set wetSet gracefully', () => {
    const result = getFreeCourts({
      data: { courts: [null, null] },
      now: T,
      blocks: [],
      wetSet: 'invalid',
    });
    expect(result).toEqual([1, 2]);
  });

  it('block with court field (not courtNumber) is matched', () => {
    const result = getFreeCourts({
      data: { courts: [null, null] },
      now: T,
      blocks: [{ court: 1, startTime: mins(-30), endTime: mins(30) }],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([2]);
  });

  it('block with start/end fields (not startTime/endTime) is matched', () => {
    const result = getFreeCourts({
      data: { courts: [null, null] },
      now: T,
      blocks: [{ courtNumber: 1, start: mins(-30), end: mins(30) }],
      wetSet: new Set<number>(),
    });
    expect(result).toEqual([2]);
  });
});

// ============================================================
// H) getFreeCourtsInfo — branch gaps
// ============================================================
describe('getFreeCourtsInfo (branch gaps)', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('tournament overtime is excluded from overtime list', () => {
    const result = getFreeCourtsInfo({
      data: makeData({
        1: overtimeCourt(-60, { isTournament: true }),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    // isTournament → excluded from overtime by `!session.isTournament` check
    expect(result.overtime).toEqual([]);
    // classified as occupied instead
    expect(result.occupied).toContain(1);
  });

  it('wet courts appear in wet array and are excluded from free', () => {
    const result = getFreeCourtsInfo({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set([2]),
    });
    expect(result.wet).toEqual([2]);
    expect(result.free).not.toContain(2);
  });

  it('blocked court is excluded from free/overtime classification', () => {
    const result = getFreeCourtsInfo({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30)],
      wetSet: new Set<number>(),
    });
    expect(result.free).not.toContain(1);
    // blocked courts end up in occupied (catch-all)
    expect(result.occupied).toContain(1);
  });

  it('handles null/undefined data.courts gracefully', () => {
    const result = getFreeCourtsInfo({
      data: { courts: null },
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    // All 3 courts are in "occupied" because loop runs 0 times, nothing added to free/overtime
    expect(result.free).toEqual([]);
    expect(result.occupied).toEqual([1, 2, 3]);
  });

  it('meta contains total and overtimeCount', () => {
    const result = getFreeCourtsInfo({
      data: makeData({ 1: overtimeCourt(-60) }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result.meta.total).toBe(3);
    expect(result.meta.overtimeCount).toBe(1);
  });

  it('block with court field (not courtNumber) is matched', () => {
    const result = getFreeCourtsInfo({
      data: makeData(),
      now: T,
      blocks: [{ court: 2, startTime: mins(-30), endTime: mins(30) }],
      wetSet: new Set<number>(),
    });
    expect(result.free).not.toContain(2);
  });
});

// ============================================================
// I) getNextFreeTimes — branch gaps
// ============================================================
describe('getNextFreeTimes (extended)', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('free court returns now', () => {
    const result = getNextFreeTimes({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result[0].getTime()).toBe(T.getTime());
  });

  it('occupied court returns session end time', () => {
    const endTime = mins(120);
    const result = getNextFreeTimes({
      data: makeData({ 1: occupiedCourt(120) }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(result[0].toISOString()).toBe(endTime);
  });

  it('wet court returns closing time (10pm local)', () => {
    const result = getNextFreeTimes({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set([1]),
    });
    expect(result[0].getHours()).toBe(22);
    expect(result[0].getMinutes()).toBe(0);
  });

  it('advances through stacked blocks', () => {
    // Block 1: T+0 to T+30, Block 2: T+30 to T+90 (adjacent)
    const result = getNextFreeTimes({
      data: makeData(),
      now: T,
      blocks: [block(1, -15, 30), block(1, 30, 90)],
      wetSet: new Set<number>(),
    });
    // base starts at T, first block effective start = T-15-15min = T-30min ≤ T < T+30 → advance to T+30
    // second block effective start = T+30-15min = T+15 ≤ T+30 < T+90 → advance to T+90
    expect(result[0].toISOString()).toBe(mins(90));
  });

  it('registration buffer makes blocks start 15 min earlier', () => {
    // Block starts at T+10, effective start = T+10-15 = T-5 ≤ T → conflict
    const result = getNextFreeTimes({
      data: makeData(),
      now: T,
      blocks: [block(1, 10, 60)],
      wetSet: new Set<number>(),
    });
    // Should advance past block end (T+60)
    expect(result[0].toISOString()).toBe(mins(60));
  });

  it('block starting after buffer does not affect free time', () => {
    // Block starts at T+30, effective start = T+30-15 = T+15 > T → no overlap at T
    const result = getNextFreeTimes({
      data: makeData(),
      now: T,
      blocks: [block(1, 30, 90)],
      wetSet: new Set<number>(),
    });
    expect(result[0].getTime()).toBe(T.getTime());
  });

  it('null blocks handled gracefully', () => {
    const result = getNextFreeTimes({
      data: makeData(),
      now: T,
      blocks: null,
      wetSet: new Set<number>(),
    });
    expect(result[0].getTime()).toBe(T.getTime());
  });

  it('non-Set wetSet handled gracefully', () => {
    const result = getNextFreeTimes({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: 'invalid',
    });
    // wet normalization: non-Set → new Set(), so no courts wet
    expect(result[0].getTime()).toBe(T.getTime());
  });
});

// ============================================================
// J) getCourtStatuses — branch gaps
// ============================================================
describe('getCourtStatuses (extended)', () => {
  beforeEach(() => {
    window.Tennis = window.Tennis || {};
    window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };
  });

  it('wet court has status=wet and selectable=false', () => {
    const statuses = getCourtStatuses({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set([1]),
    });
    expect(statuses[0].status).toBe('wet');
    expect(statuses[0].selectable).toBe(false);
    expect(statuses[0].isWet).toBe(true);
  });

  it('blocked court has status=blocked with label and end time', () => {
    const statuses = getCourtStatuses({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30, { title: 'Maintenance', label: 'Maint' })],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].status).toBe('blocked');
    expect(statuses[0].selectable).toBe(false);
    expect(statuses[0].blockedLabel).toBe('Maint');
    expect(statuses[0].blockedEnd).toBe(mins(30));
  });

  it('blocked court extracts title when label is absent', () => {
    const statuses = getCourtStatuses({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30, { title: 'Tournament' })],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].blockedLabel).toBe('Tournament');
  });

  it('blocked court falls back to reason when title/label absent', () => {
    const statuses = getCourtStatuses({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30, { reason: 'Resurfacing' })],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].blockedLabel).toBe('Resurfacing');
  });

  it('blocked court falls back to "Blocked" when no label fields', () => {
    const statuses = getCourtStatuses({
      data: makeData(),
      now: T,
      blocks: [block(1, -30, 30)],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].blockedLabel).toBe('Blocked');
  });

  it('occupied court has status=occupied and selectable=false', () => {
    const statuses = getCourtStatuses({
      data: makeData({ 1: occupiedCourt(120) }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].status).toBe('occupied');
    expect(statuses[0].selectable).toBe(false);
  });

  it('free court has selectable=true and selectableReason=free', () => {
    const statuses = getCourtStatuses({
      data: makeData(),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].selectable).toBe(true);
    expect(statuses[0].selectableReason).toBe('free');
  });

  it('overtime court selectable only when no usable free courts', () => {
    const statuses = getCourtStatuses({
      data: makeData({
        1: overtimeCourt(-60),
        2: occupiedCourt(120),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].status).toBe('overtime');
    expect(statuses[0].selectable).toBe(true);
    expect(statuses[0].selectableReason).toBe('overtime_fallback');
  });

  it('overtime court NOT selectable when free courts exist', () => {
    const statuses = getCourtStatuses({
      data: makeData({
        1: null,
        2: overtimeCourt(-60),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    // Court 2 is overtime but court 1 is free
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(false);
  });

  it('tournament court past end shows as overtime but NOT selectable', () => {
    const statuses = getCourtStatuses({
      data: makeData({
        1: overtimeCourt(-60, { isTournament: true }),
        2: occupiedCourt(120),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].status).toBe('overtime');
    expect(statuses[0].selectable).toBe(false); // tournament overtime never selectable
  });

  it('upcomingBlocks with < 20 min usable time affects overtime fallback', () => {
    // Court 1 is free but has upcoming block in 10 min (< 20 min useful)
    // Court 2 is overtime, court 3 is occupied
    const statuses = getCourtStatuses({
      data: makeData({
        1: null,
        2: overtimeCourt(-60),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
      upcomingBlocks: [block(1, 10, 90)],
    });
    // Court 1 free but < 20 min usable → hasUsableFree = false
    // Court 2 overtime → selectable since !hasUsableFree
    expect(statuses[0].status).toBe('free');
    expect(statuses[0].selectable).toBe(true); // still selectable (it IS free)
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(true); // overtime allowed since no usable free
  });

  it('upcomingBlocks with >= 20 min usable time keeps overtime non-selectable', () => {
    const statuses = getCourtStatuses({
      data: makeData({
        1: null,
        2: overtimeCourt(-60),
        3: occupiedCourt(120),
      }),
      now: T,
      blocks: [],
      wetSet: new Set<number>(),
      upcomingBlocks: [block(1, 30, 90)],
    });
    // Court 1 free, 30 min until block (>= 20) → hasUsableFree = true
    expect(statuses[1].status).toBe('overtime');
    expect(statuses[1].selectable).toBe(false); // usable free exists
  });

  it('blocked court uses end field as fallback for blockedEnd', () => {
    const statuses = getCourtStatuses({
      data: makeData(),
      now: T,
      blocks: [
        {
          courtNumber: 1,
          start: mins(-30),
          end: mins(30),
          startTime: mins(-30),
          endTime: mins(30),
          type: 'event',
        },
      ],
      wetSet: new Set<number>(),
    });
    expect(statuses[0].status).toBe('blocked');
    expect(statuses[0].blockedLabel).toBe('event');
  });
});
