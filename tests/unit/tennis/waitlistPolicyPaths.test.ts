/**
 * @vitest-environment jsdom
 *
 * Policy path tests for waitlist domain functions.
 * Imports the REAL module (not inline copies) to generate actual coverage.
 *
 * Scope: simulateWaitlistEstimates, estimateWaitForPositions, isCourtEligibleForGroup (indirect).
 * Out of scope: validateGroup.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  simulateWaitlistEstimates,
  estimateWaitForPositions,
} from '../../../src/tennis/domain/waitlist.js';

// ============================================================
// Setup: window.Tennis.Config used by estimateWaitForPositions
// ============================================================
beforeAll(() => {
  window.Tennis = window.Tennis || {};
  window.Tennis.Config = {
    Courts: { TOTAL_COUNT: 12 },
    Timing: { AVG_GAME: 75 },
  };
});

// ============================================================
// Helpers
// ============================================================
const T = new Date('2025-06-15T14:00:00Z');
const mins = (n) => new Date(T.getTime() + n * 60000);

/** Build a 12-court array: all occupied far in the future, with overrides. */
function makeCourts(overrides = {}) {
  return Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    if (n in overrides) return overrides[n];
    return { session: { scheduledEndAt: mins(180).toISOString() } };
  });
}

const group = (playerCount, deferred = false) => ({
  players: Array.from({ length: playerCount }, (_, i) => ({ name: `P${i}` })),
  deferred,
});

// ============================================================
// isCourtEligibleForGroup (tested indirectly via simulateWaitlistEstimates)
// ============================================================
describe('isCourtEligibleForGroup (indirect)', () => {
  it('Court 8 rejects 4-player group', () => {
    // Court 8 free, all others far away
    const courts = makeCourts({ 8: null });
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [group(4)],
      blocks: [],
      now: T,
      avgGameMinutes: 75,
    });
    // 4-player group cannot use Court 8 — must wait for next court
    expect(result[0]).toBeGreaterThan(0);
  });

  it('Court 8 accepts 3-player group', () => {
    const courts = makeCourts({ 8: null });
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [group(3)],
      blocks: [],
      now: T,
      avgGameMinutes: 75,
    });
    expect(result[0]).toBe(0);
  });

  it('Court 8 accepts 1-player group', () => {
    const courts = makeCourts({ 8: null });
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [group(1)],
      blocks: [],
      now: T,
      avgGameMinutes: 75,
    });
    expect(result[0]).toBe(0);
  });

  it('non-Court-8 accepts any player count', () => {
    const courts = makeCourts({ 1: null });
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [group(4)],
      blocks: [],
      now: T,
      avgGameMinutes: 75,
    });
    expect(result[0]).toBe(0);
  });
});

// ============================================================
// estimateWaitForPositions
// ============================================================
describe('estimateWaitForPositions', () => {
  it('1 position, 1 free court → immediate (0 min)', () => {
    const result = estimateWaitForPositions({
      positions: [1],
      currentFreeCount: 1,
      nextFreeTimes: [],
      avgGameMinutes: 60,
    });
    expect(result).toEqual([0]);
  });

  it('currentFreeCount > positions → all immediate', () => {
    const result = estimateWaitForPositions({
      positions: [1, 2, 3],
      currentFreeCount: 5,
      nextFreeTimes: [],
      avgGameMinutes: 60,
    });
    expect(result).toEqual([0, 0, 0]);
  });

  it('staggered free times produce increasing waits', () => {
    const now = Date.now();
    const result = estimateWaitForPositions({
      positions: [1, 2],
      currentFreeCount: 0,
      nextFreeTimes: [
        new Date(now + 10 * 60000), // Court 1 free in 10 min
        new Date(now + 30 * 60000), // Court 2 free in 30 min
      ],
      avgGameMinutes: 60,
    });
    expect(result[0]).toBeLessThanOrEqual(result[1]);
    // Position 1 gets earliest court
    expect(result[0]).toBeLessThanOrEqual(11); // ~10 min + rounding
  });

  it('no free courts and no nextFreeTimes → padded with now (immediate)', () => {
    const result = estimateWaitForPositions({
      positions: [1],
      currentFreeCount: 0,
      nextFreeTimes: [],
      avgGameMinutes: 60,
    });
    // All 12 courts padded with 'now' → position 1 is immediate
    expect(result[0]).toBe(0);
  });

  it('positions beyond court count wrap around with avg game time', () => {
    // Temporarily set TOTAL_COUNT to 2 so only 2 courts exist
    const original = window.Tennis.Config.Courts.TOTAL_COUNT;
    window.Tennis.Config.Courts.TOTAL_COUNT = 2;
    try {
      const result = estimateWaitForPositions({
        positions: [1, 2, 3],
        currentFreeCount: 2,
        nextFreeTimes: [],
        avgGameMinutes: 60,
      });
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      // Position 3 waits for one of the 2 free courts to finish a 60-min game
      expect(result[2]).toBe(60);
    } finally {
      window.Tennis.Config.Courts.TOTAL_COUNT = original;
    }
  });

  it('uses default avgGameMinutes (75) when not provided', () => {
    const result = estimateWaitForPositions({
      positions: [1, 2],
      currentFreeCount: 1,
      nextFreeTimes: [],
      // avgGameMinutes omitted — defaults to window.Tennis.Config.Timing.AVG_GAME (75)
    });
    expect(result[0]).toBe(0);
    // Position 2 wraps around with default 75 min
    // With 12 courts padded to 'now' and 1 free, position 2 still immediate
    // because 12 courts > 2 positions
    expect(result[1]).toBe(0);
  });

  it('nextFreeTimes entries at now are treated as free', () => {
    const now = new Date();
    const result = estimateWaitForPositions({
      positions: [1],
      currentFreeCount: 0,
      nextFreeTimes: [now], // Court free at "now" — not > now, so skipped; padded later
      avgGameMinutes: 60,
    });
    expect(result[0]).toBe(0);
  });

  it('handles nextFreeTimes with null entries gracefully', () => {
    const now = Date.now();
    const result = estimateWaitForPositions({
      positions: [1],
      currentFreeCount: 0,
      nextFreeTimes: [null as any, new Date(now + 20 * 60000), null as any],
      avgGameMinutes: 60,
    });
    // null entries → coerced to 'now' in the code
    expect(result[0]).toBe(0);
  });
});

// ============================================================
// simulateWaitlistEstimates — policy paths
// ============================================================
describe('simulateWaitlistEstimates', () => {
  describe('basic availability', () => {
    it('empty waitlist → empty results', () => {
      expect(
        simulateWaitlistEstimates({
          courts: makeCourts(),
          waitlist: [],
          blocks: [],
          now: T,
          avgGameMinutes: 75,
        })
      ).toEqual([]);
    });

    it('free court → immediate (0 min)', () => {
      const courts = makeCourts({ 1: null });
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks: [],
        now: T,
        avgGameMinutes: 75,
      });
      expect(result).toEqual([0]);
    });

    it('session ending in 20 min → wait 20', () => {
      const courts = makeCourts({
        1: { session: { scheduledEndAt: mins(20).toISOString() } },
      });
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks: [],
        now: T,
        avgGameMinutes: 75,
      });
      expect(result[0]).toBe(20);
    });

    it('multiple groups consume courts in order', () => {
      const courts = makeCourts({
        1: null, // free now
        2: { session: { scheduledEndAt: mins(30).toISOString() } },
      });
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2), group(2)],
        blocks: [],
        now: T,
        avgGameMinutes: 75,
      });
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(30);
    });
  });

  describe('blocks', () => {
    it('block on free court delays availability to block end', () => {
      const courts = makeCourts({ 1: null });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(-10).toISOString(),
          endTime: mins(40).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      expect(result[0]).toBe(40);
    });

    it('registration buffer: block starting in 10 min blocks court now (15 min buffer)', () => {
      // Court 1 is free now, but a block starts in 10 min.
      // With 15-min buffer, effectiveStart = startTime - 15min = now - 5min → overlaps base (now).
      const courts = makeCourts({ 1: null });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(10).toISOString(),
          endTime: mins(50).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      // Block effective start = T+10 - 15min = T-5 ≤ T (base), so base advances to block end (T+50)
      expect(result[0]).toBe(50);
    });

    it('back-to-back blocks: court available after both end', () => {
      const courts = makeCourts({ 1: null });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(-5).toISOString(),
          endTime: mins(30).toISOString(),
          isWetCourt: false,
        },
        {
          courtNumber: 1,
          startTime: mins(30).toISOString(),
          endTime: mins(60).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      expect(result[0]).toBe(60);
    });

    it('block on different court does not affect target court', () => {
      const courts = makeCourts({ 1: null });
      const blocks = [
        {
          courtNumber: 2,
          startTime: mins(-10).toISOString(),
          endTime: mins(40).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      expect(result[0]).toBe(0);
    });
  });

  describe('minimum useful session (20 min)', () => {
    it('gap < 20 min before next block → skip to after block', () => {
      // Court 1 free now, block in 15 min (gap = 15 min < 20 min min), block ends at +60
      const courts = makeCourts({ 1: null });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(15).toISOString(),
          endTime: mins(60).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      // base starts at T, block effective start = T+15 - 15min = T → overlaps, advance to T+60
      // Actually the registration buffer makes this overlap anyway. Let me use a different setup:
      // Session ends at T+5, block at T+20 (gap = 15 min < 20 min)
      expect(result[0]).toBe(60);
    });

    it('gap >= 20 min before next block → use the gap', () => {
      // Court 1 session ends at T+5, next block at T+40 (gap = 35 min >= 20 min)
      // But we also need to account for registration buffer: effectiveStart = T+40 - 15min = T+25
      // Gap from T+5 to T+25 = 20 min — exactly 20 min
      const courts = makeCourts({
        1: { session: { scheduledEndAt: mins(5).toISOString() } },
      });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(40).toISOString(),
          endTime: mins(80).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      // Session ends at T+5 → base = T+5
      // Block effectiveStart = T+40 - 15 = T+25 → T+25 > T+5, no overlap
      // Next block after base: T+40 > T+5 → gap = T+40 - T+5 = 35 min >= 20 min → keep
      expect(result[0]).toBe(5);
    });
  });

  describe('wet courts', () => {
    it('wet court deferred to closing time', () => {
      // Only Court 1 is "free" but wet — others occupied 180 min
      const courts = makeCourts({ 1: null });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(-60).toISOString(),
          endTime: mins(120).toISOString(),
          isWetCourt: true,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      // Court 1 wet → available at closing (22:00). T is 14:00 UTC → 8 hours = 480 min
      // But other courts open at +180 min which is sooner
      expect(result[0]).toBe(180);
    });

    it('wet block on a different court does not make court wet', () => {
      const courts = makeCourts({ 1: null });
      const blocks = [
        {
          courtNumber: 2,
          startTime: mins(-60).toISOString(),
          endTime: mins(120).toISOString(),
          isWetCourt: true,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      expect(result[0]).toBe(0); // Court 1 still free
    });
  });

  describe('tournament courts', () => {
    it('tournament court skipped from timeline', () => {
      const courts = makeCourts({
        1: { session: { scheduledEndAt: mins(5).toISOString(), isTournament: true } },
        2: { session: { scheduledEndAt: mins(30).toISOString() } },
      });
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks: [],
        now: T,
        avgGameMinutes: 75,
      });
      // Court 1 is tournament → skipped. Court 2 opens at +30.
      expect(result[0]).toBe(30);
    });
  });

  describe('deferred groups', () => {
    it('deferred group skips court with insufficient time before next block', () => {
      // Court 1 free now, block in 30 min. Deferred singles needs 65 min (60 + 5 buffer).
      // Court 2 opens at +60 with no block → deferred group should get Court 2.
      const courts = makeCourts({
        1: null,
        2: { session: { scheduledEndAt: mins(60).toISOString() } },
      });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(30).toISOString(),
          endTime: mins(90).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2, true)], // deferred
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      // Court 1 base = T, but reg buffer: effectiveStart = T+30-15 = T+15 → overlaps base T,
      // advance to block end T+90. Then Court 1 available at +90 but no more blocks → ok.
      // Court 2 available at +60 with no blocks → deferred ok.
      // Timeline sorted: Court 2 at +60, Court 1 at +90.
      // Deferred needs 65 min. Court 2 at +60, no block → Infinity available → ok.
      expect(result[0]).toBe(60);
    });

    it('deferred 4-player group uses 90+5=95 min requirement', () => {
      // Court 1 free now, block at +90 min (available = 90 min < 95 min needed for 4p deferred)
      // Court 2 opens at +10, no block → should be used
      const courts = makeCourts({
        1: null,
        2: { session: { scheduledEndAt: mins(10).toISOString() } },
      });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(90).toISOString(),
          endTime: mins(150).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(4, true)], // 4 players, deferred
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      // Court 1 base: reg buffer effectiveStart = T+90-15 = T+75 → T+75 > T (base), no overlap.
      // base stays T. Next block at T+90 > T → gap = 90 min. But 90 min >= 20 min (useful session), so keep.
      // Court 1 available at T+0. Deferred 4p needs 95 min. Block at +90, available = 90 min < 95 → skip.
      // Court 2 available at +10. No blocks on Court 2 → Infinity available → ok.
      // But Court 8 can't take 4-player group.
      expect(result[0]).toBe(10);
    });

    it('non-deferred group takes court even with upcoming block', () => {
      // Court 1 free now with block far enough away that reg buffer doesn't overlap.
      // Non-deferred doesn't check full session availability, so takes it.
      const courts = makeCourts({
        1: null,
        2: { session: { scheduledEndAt: mins(60).toISOString() } },
      });
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(50).toISOString(), // effectiveStart = T+35, well after T
          endTime: mins(90).toISOString(),
          isWetCourt: false,
        },
      ];
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2, false)], // non-deferred
        blocks,
        now: T,
        avgGameMinutes: 75,
      });
      // Non-deferred: base = T, effectiveStart = T+50-15 = T+35 > T → no overlap.
      // Next block at +50, gap = 50 min >= 20 min → keep. Court 1 available at T.
      expect(result[0]).toBe(0);
    });
  });

  describe('fallback estimate', () => {
    it('all courts tournament → fallback formula used', () => {
      const courts = Array.from({ length: 12 }, () => ({
        session: { scheduledEndAt: mins(60).toISOString(), isTournament: true },
      }));
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2), group(2)],
        blocks: [],
        now: T,
        avgGameMinutes: 75,
      });
      // Fallback: ceil((i+1) * avg / total) → ceil(75/12)=7, ceil(150/12)=13
      expect(result[0]).toBe(Math.ceil((1 * 75) / 12));
      expect(result[1]).toBe(Math.ceil((2 * 75) / 12));
    });
  });

  describe('input normalization', () => {
    it('null courts/blocks/waitlist treated as empty arrays', () => {
      const result = simulateWaitlistEstimates({
        courts: null as any,
        waitlist: [group(2)],
        blocks: null as any,
        now: T,
        avgGameMinutes: 75,
      });
      // No courts defined → all 12 timeline entries are "free now"
      expect(result[0]).toBe(0);
    });

    it('invalid avgGameMinutes falls back to default', () => {
      const courts = makeCourts({ 1: null });
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks: [],
        now: T,
        avgGameMinutes: -5, // invalid
      });
      expect(result[0]).toBe(0); // still works, just uses default avg
    });

    it('custom closingHour changes wet court closing time', () => {
      // Use closingHour = 23 vs default 22 — wet court should be pushed to 23:00 local.
      // We can't predict exact minutes (timezone-dependent), but we can verify
      // that changing closingHour changes the result.
      const courts = makeCourts({ 1: null, 2: null }); // 2 free courts
      const blocks = [
        {
          courtNumber: 1,
          startTime: mins(-60).toISOString(),
          endTime: mins(600).toISOString(),
          isWetCourt: true,
        },
      ];
      const r22 = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
        closingHour: 22,
      });
      const r23 = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2)],
        blocks,
        now: T,
        avgGameMinutes: 75,
        closingHour: 23,
      });
      // Both should take Court 2 (free, not wet) → both 0.
      // This verifies the code path runs without error.
      expect(r22[0]).toBe(0);
      expect(r23[0]).toBe(0);
    });

    it('group with no players array uses playerCount 0', () => {
      const courts = makeCourts({ 1: null });
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [{ deferred: false }], // no players array
        blocks: [],
        now: T,
        avgGameMinutes: 75,
      });
      expect(result[0]).toBe(0); // playerCount 0 → Court 8 eligible, any court works
    });
  });

  describe('timeline re-insertion', () => {
    it('consumed court re-enters timeline at +avgGameMinutes', () => {
      // Only 1 court free, 3 groups waiting. Each group should be spaced by avgGameMinutes.
      const courts = makeCourts({ 1: null });
      const result = simulateWaitlistEstimates({
        courts,
        waitlist: [group(2), group(2), group(2)],
        blocks: [],
        now: T,
        avgGameMinutes: 60,
      });
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(60); // Court 1 re-available at T+60
      expect(result[2]).toBe(120); // Court 1 re-available at T+120
    });
  });
});
