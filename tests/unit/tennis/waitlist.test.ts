/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Set Tennis Config BEFORE import so the module picks it up
window.Tennis = window.Tennis || {};
(window.Tennis as any).Config = {
  Courts: { TOTAL_COUNT: 12 },
  Timing: { AVG_GAME: 75 },
};

// Import the module - it will attach to (window.Tennis as any).Domain
import {
  validateGroup,
  estimateWaitMinutes,
  simulateWaitlistEstimates,
} from '../../../src/tennis/domain/waitlist.js';

describe('tennis/domain/waitlist', () => {
  let W: any;

  beforeAll(() => {
    W = window.Tennis?.Domain?.waitlist;
  });

  it('attaches to (window.Tennis as any).Domain.waitlist', () => {
    expect(W).toBeDefined();
  });

  it('attaches uppercase alias (window.Tennis as any).Domain.Waitlist', () => {
    expect((window.Tennis as any).Domain.Waitlist).toBeDefined();
    expect((window.Tennis as any).Domain.Waitlist).toBe((window.Tennis as any).Domain.waitlist);
  });

  describe('estimateWaitForPositions', () => {
    it('returns array of estimates for given positions', () => {
      const result = W.estimateWaitForPositions({
        positions: [1, 2],
        currentFreeCount: 0,
        nextFreeTimes: [new Date(Date.now() + 30 * 60000)],
        avgGameMinutes: 60,
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('returns 0 when currentFreeCount >= position', () => {
      const result = W.estimateWaitForPositions({
        positions: [1],
        currentFreeCount: 2,
        nextFreeTimes: [],
        avgGameMinutes: 60,
      });
      expect(result[0]).toBe(0);
    });
  });

  describe('estimateWaitMinutes', () => {
    it('returns 0 when court is available', () => {
      const result = W.estimateWaitMinutes({
        position: 1,
        courts: [null], // null = free court
        now: new Date(),
        avgGame: 60,
      });
      expect(result).toBe(0);
    });

    it('returns wait time based on court end times', () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 30 * 60000); // 30 min from now
      const result = W.estimateWaitMinutes({
        position: 1,
        courts: [{ endTime: endTime.toISOString() }],
        now,
        avgGame: 60,
      });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(30);
    });
  });

  describe('validateGroup', () => {
    it('returns invalid for non-array group', () => {
      const result = W.validateGroup({});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Group must be an array');
    });

    it('returns invalid for empty group', () => {
      const result = W.validateGroup([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Group cannot be empty');
    });

    it('returns valid for group with valid players', () => {
      const result = W.validateGroup([
        { name: 'Test Player' },
        { name: 'Another Player' },
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('signature', () => {
    it('exists and produces v1 format', () => {
      expect(typeof W.signature).toBe('function');
      const result = W.signature({
        players: [{ name: 'Alice' }, { name: 'Bob' }],
        guests: 1,
      });
      expect(result).toMatch(/^v1\|/);
      expect(result).toContain('alice,bob');
      expect(result).toContain('guests:1');
    });
  });
});

// ── validateGroup (direct import, more branches) ──────────────
describe('validateGroup — branch coverage', () => {
  it('rejects group with > 4 players', () => {
    const group = Array.from({ length: 5 }, (_, i) => ({ name: `P${i}` }));
    const result = validateGroup(group);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('more than 4');
  });

  it('rejects player without name', () => {
    const result = validateGroup([{ id: '1' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid name');
  });

  it('rejects player with empty name', () => {
    const result = validateGroup([{ name: '  ' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid name');
  });

  it('rejects null player', () => {
    const result = validateGroup([null]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid');
  });

  it('rejects non-object player', () => {
    const result = validateGroup(['string']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid');
  });

  it('detects duplicate players by id', () => {
    const result = validateGroup([
      { id: '1', name: 'Alice' },
      { id: '1', name: 'Alice Copy' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Duplicate');
  });

  it('detects duplicate players by name when no id', () => {
    const result = validateGroup([
      { name: 'Alice' },
      { name: 'alice' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Duplicate');
  });

  it('allows similar names with different ids', () => {
    const result = validateGroup([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Alice' },
    ]);
    expect(result.valid).toBe(true);
  });
});

// ── estimateWaitMinutes (direct import, more branches) ──────
describe('estimateWaitMinutes — branch coverage', () => {
  it('throws for non-number position', () => {
    expect(() =>
      estimateWaitMinutes({ position: 'a', courts: [], now: new Date(), avgGame: 60 } as any)
    ).toThrow('positive number');
  });

  it('throws for position < 1', () => {
    expect(() =>
      estimateWaitMinutes({ position: 0, courts: [], now: new Date(), avgGame: 60 })
    ).toThrow('positive number');
  });

  it('throws for non-array courts', () => {
    expect(() =>
      estimateWaitMinutes({ position: 1, courts: 'bad', now: new Date(), avgGame: 60 } as any)
    ).toThrow('array');
  });

  it('throws for invalid current time', () => {
    expect(() =>
      estimateWaitMinutes({ position: 1, courts: [], now: 'bad', avgGame: 60 } as any)
    ).toThrow('time');
  });

  it('throws for non-positive avgGame', () => {
    expect(() =>
      estimateWaitMinutes({ position: 1, courts: [], now: new Date(), avgGame: 0 })
    ).toThrow('positive number');
  });

  it('returns 0 when position 1 and a null court exists (free)', () => {
    const result = estimateWaitMinutes({
      position: 1,
      courts: [null, { endTime: new Date(Date.now() + 60000).toISOString() }],
      now: new Date(),
      avgGame: 60,
    });
    expect(result).toBe(0);
  });

  it('returns 0 when position 1 and court endTime is in past (overtime)', () => {
    const now = new Date();
    const result = estimateWaitMinutes({
      position: 1,
      courts: [{ endTime: new Date(now.getTime() - 60000).toISOString() }],
      now,
      avgGame: 60,
    });
    expect(result).toBe(0);
  });

  it('returns shortest wait for position 1 with multiple occupied courts', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const result = estimateWaitMinutes({
      position: 1,
      courts: [
        { endTime: new Date('2025-01-15T10:45:00Z').toISOString() },
        { endTime: new Date('2025-01-15T10:20:00Z').toISOString() },
      ],
      now,
      avgGame: 60,
    });
    expect(result).toBe(20); // Shortest wait
  });

  it('uses court.current.endTime structure', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const result = estimateWaitMinutes({
      position: 1,
      courts: [{ current: { endTime: new Date('2025-01-15T10:15:00Z').toISOString() } }],
      now,
      avgGame: 60,
    });
    expect(result).toBe(15);
  });

  it('estimates for position > 1 with occupied courts', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const result = estimateWaitMinutes({
      position: 3,
      courts: [
        { endTime: new Date('2025-01-15T10:30:00Z').toISOString() },
        { endTime: new Date('2025-01-15T10:45:00Z').toISOString() },
      ],
      now,
      avgGame: 60,
    });
    expect(result).toBeGreaterThan(0);
  });

  it('estimates for position > 1 with no occupied courts', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const result = estimateWaitMinutes({
      position: 2,
      courts: [
        { endTime: new Date('2025-01-15T09:00:00Z').toISOString() }, // Past
      ],
      now,
      avgGame: 60,
    });
    // Court endTime is in past, so averageCurrentWait = 0
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ── simulateWaitlistEstimates ───────────────────────────────
describe('simulateWaitlistEstimates', () => {
  const now = new Date('2025-01-15T10:00:00Z');

  it('returns empty array for empty waitlist', () => {
    const result = simulateWaitlistEstimates({ courts: [], waitlist: [], blocks: [], now });
    expect(result).toEqual([]);
  });

  it('returns 0 for position 1 when court is free', () => {
    const result = simulateWaitlistEstimates({
      courts: [null], // free court
      waitlist: [{ players: [{ name: 'A' }] }],
      blocks: [],
      now,
      avgGameMinutes: 60,
    });
    expect(result[0]).toBe(0);
  });

  it('estimates wait when all courts have active sessions', () => {
    // Fill all 12 courts with sessions ending at 10:30
    const courts = Array(12).fill(null).map(() => ({
      session: { scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() },
    }));
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [{ players: [{ name: 'A' }] }],
      blocks: [],
      now,
      avgGameMinutes: 60,
    });
    expect(result[0]).toBe(30);
  });

  it('handles multiple waitlist entries', () => {
    // Fill all 12 courts
    const courts = Array(12).fill(null).map(() => ({
      session: { scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() },
    }));
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [
        { players: [{ name: 'A' }] },
        { players: [{ name: 'B' }] },
      ],
      blocks: [],
      now,
      avgGameMinutes: 60,
    });
    expect(result).toHaveLength(2);
    // Both groups get assigned at 10:30 (all courts free then)
    expect(result[0]).toBe(30);
    expect(result[1]).toBe(30);
  });

  it('skips wet courts', () => {
    // All 12 courts occupied, court 1 is also wet
    const courts = Array(12).fill(null).map(() => ({
      session: { scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() },
    }));
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [{ players: [{ name: 'A' }] }],
      blocks: [
        {
          courtNumber: 1,
          isWetCourt: true,
          startTime: new Date('2025-01-15T09:00:00Z').toISOString(),
          endTime: new Date('2025-01-15T11:00:00Z').toISOString(),
        },
      ],
      now,
      avgGameMinutes: 60,
      closingHour: 22,
    });
    // Court 1 is wet → pushed to closing. Other 11 courts available at 10:30.
    // First group gets one of the non-wet courts at 10:30
    expect(result[0]).toBe(30);
  });

  it('skips tournament courts', () => {
    const result = simulateWaitlistEstimates({
      courts: [
        { session: { isTournament: true, scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() } },
        null, // free court (index 1, courtNumber=2)
      ],
      waitlist: [{ players: [{ name: 'A' }] }],
      blocks: [],
      now,
      avgGameMinutes: 60,
    });
    // Court 1 (tournament) is skipped, court 2 is free
    expect(result[0]).toBe(0);
  });

  it('advances past overlapping blocks with registration buffer', () => {
    // All 12 courts occupied, each with a block on their court
    const courts = Array(12).fill(null).map(() => ({
      session: { scheduledEndAt: new Date('2025-01-15T14:00:00Z').toISOString() },
    }));
    // Court 1 is free (no session) but has a block
    courts[0] = null as any;
    // All other courts occupied far in future, so only court 1 matters early
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [{ players: [{ name: 'A' }] }],
      blocks: [
        {
          courtNumber: 1,
          isWetCourt: false,
          startTime: new Date('2025-01-15T10:10:00Z').toISOString(),
          endTime: new Date('2025-01-15T10:40:00Z').toISOString(),
        },
      ],
      now,
      avgGameMinutes: 60,
    });
    // Court 1: block at 10:10, effective start with 15-min buffer = 9:55 <= now
    // So court 1 is pushed to block end at 10:40 → first waitlist entry waits 0 (court 1 free) or 40 (after block)
    // Actually court 1 is free (null), base = now. Block effective start 9:55 <= now, so advance to 10:40.
    // Result is 40 minutes.
    expect(result[0]).toBe(40);
  });

  it('skips court for deferred group if insufficient time', () => {
    // All 12 courts blocked so only court 1 is "free" but has a block limiting time
    const courts = Array(12).fill(null).map(() => ({
      session: { scheduledEndAt: new Date('2025-01-15T14:00:00Z').toISOString() },
    }));
    courts[0] = null as any; // Court 1 free

    // Block all other courts far in the future so they're not available
    const blocks = [];
    for (let i = 2; i <= 12; i++) {
      blocks.push({
        courtNumber: i,
        isWetCourt: false,
        startTime: new Date('2025-01-15T14:00:00Z').toISOString(),
        endTime: new Date('2025-01-15T16:00:00Z').toISOString(),
      });
    }
    // Court 1 has a block starting in 30 min
    blocks.push({
      courtNumber: 1,
      isWetCourt: false,
      startTime: new Date('2025-01-15T10:30:00Z').toISOString(),
      endTime: new Date('2025-01-15T11:30:00Z').toISOString(),
    });

    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [{ players: [{ name: 'A' }], deferred: true }],
      blocks,
      now,
      avgGameMinutes: 60,
    });
    // Court 1 has 30 min but deferred needs 65 min → not enough → must wait for other courts
    expect(result[0]).toBeGreaterThan(0);
  });

  it('handles null courts/waitlist/blocks gracefully', () => {
    const result = simulateWaitlistEstimates({
      courts: null as any,
      waitlist: null as any,
      blocks: null as any,
      now,
    });
    expect(result).toEqual([]);
  });

  it('uses doubles duration for 4-player group', () => {
    // All 12 courts occupied
    const courts = Array(12).fill(null).map(() => ({
      session: { scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() } ,
    }));
    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [
        { players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] },
      ],
      blocks: [],
      now,
      avgGameMinutes: 60,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(30);
  });

  it('Court 8 rejects groups of 4+ players', () => {
    // Set up so only court 8 is available (index 7 = courtNumber 8)
    // We need 12 courts total, all occupied except court 8
    const courts = Array(12).fill(null).map((_, i) => {
      if (i === 7) return null; // Court 8 is free
      return { session: { scheduledEndAt: new Date('2025-01-15T12:00:00Z').toISOString() } };
    });

    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [
        { players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] },
      ],
      blocks: [],
      now,
      avgGameMinutes: 60,
    });
    // Court 8 not eligible for 4 players, must wait for other courts
    expect(result[0]).toBeGreaterThan(0);
  });

  it('advances past short usable gaps (< 20 min)', () => {
    // All 12 courts occupied far out, court 1 free but with blocks
    const courts = Array(12).fill(null).map(() => ({
      session: { scheduledEndAt: new Date('2025-01-15T14:00:00Z').toISOString() },
    }));
    courts[0] = null as any; // Court 1 free

    const result = simulateWaitlistEstimates({
      courts,
      waitlist: [{ players: [{ name: 'A' }] }],
      blocks: [
        {
          courtNumber: 1,
          isWetCourt: false,
          // 15-min buffer effective start = 9:50 <= now, so advances to end at 10:15
          startTime: new Date('2025-01-15T10:05:00Z').toISOString(),
          endTime: new Date('2025-01-15T10:15:00Z').toISOString(),
        },
        {
          courtNumber: 1,
          isWetCourt: false,
          startTime: new Date('2025-01-15T10:25:00Z').toISOString(),
          endTime: new Date('2025-01-15T10:50:00Z').toISOString(),
        },
      ],
      now,
      avgGameMinutes: 60,
    });
    // After block1, base = 10:15. Gap until block2 (10:25) = 10 min < 20 min useful.
    // Advance to block2 end = 10:50. Result = 50 min.
    expect(result[0]).toBe(50);
  });
});
