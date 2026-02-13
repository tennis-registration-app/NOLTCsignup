import { describe, it, expect } from 'vitest';
import { computeRegistrationCourtSelection } from '../../../src/shared/courts/overtimeEligibility.js';

/**
 * Tests for canGroupRegisterNow scenarios.
 *
 * These tests verify the logic that determines whether a waitlist group
 * can register now based on court availability, using the canonical
 * computeRegistrationCourtSelection API.
 *
 * The actual canGroupRegisterNow function in WaitingList.jsx uses this
 * same API, so these tests verify the underlying behavior.
 */

// Helper to simulate canGroupRegisterNow logic using the canonical API
function canGroupRegisterNow({
  courts,
  upcomingBlocks = [],
  waitlist,
  idx,
}) {
  const selection = computeRegistrationCourtSelection(courts, upcomingBlocks);

  const group = waitlist[idx];
  if (!group) return false;

  const playerCount = group.players?.length || 0;
  const isDeferred = group.deferred ?? false;

  const available = isDeferred
    ? selection.countFullTimeForGroup(playerCount)
    : selection.countSelectableForGroup(playerCount);

  if (idx === 0) {
    return available > 0;
  } else if (idx === 1) {
    const firstCanPlay = canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: 0 });
    return available >= (firstCanPlay ? 2 : 1);
  } else {
    // Position 3+ logic: if any group ahead can play, return false
    const anyAheadCanPlay = Array.from({ length: idx }, (_, i) => i).some((i) =>
      canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: i })
    );
    if (anyAheadCanPlay) return false;
    return available >= 1;
  }
}

describe('canGroupRegisterNow scenarios', () => {
  // Helper to create a waitlist group
  const makeGroup = (playerCount, deferred = false) => ({
    id: `group-${Math.random()}`,
    players: Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` })),
    deferred,
  });

  describe('Basic availability', () => {
    it('returns true for first group when free court available', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const waitlist = [makeGroup(2)];

      const result = canGroupRegisterNow({ courts, waitlist, idx: 0 });
      expect(result).toBe(true);
    });

    it('returns false when no courts available', () => {
      const courts = [
        { number: 1, isAvailable: false, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: true, isOvertime: false },
      ];
      const waitlist = [makeGroup(2)];

      const result = canGroupRegisterNow({ courts, waitlist, idx: 0 });
      expect(result).toBe(false);
    });
  });

  describe('Deferred groups', () => {
    it('deferred group needs full-time court', () => {
      // Court has block in 30 min - not enough for doubles (95 min)
      const now = new Date();
      const in30Minutes = new Date(now.getTime() + 30 * 60000).toISOString();
      const in120Minutes = new Date(now.getTime() + 120 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in30Minutes, endTime: in120Minutes },
      ];
      const waitlist = [makeGroup(4, true)]; // 4 players = doubles, deferred

      const result = canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: 0 });
      expect(result).toBe(false);
    });

    it('deferred group ignores restricted free courts', () => {
      // Court has block in 60 min - not enough for doubles (95 min)
      const now = new Date();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();
      const in150Minutes = new Date(now.getTime() + 150 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in60Minutes, endTime: in150Minutes },
      ];
      const waitlist = [makeGroup(4, true)]; // deferred doubles

      const result = canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: 0 });
      expect(result).toBe(false);
    });

    it('deferred group sees unrestricted overtime as full-time', () => {
      // Free court has block in 5 min (triggers overtime fallback)
      // Overtime court has no block (full-time)
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in5Minutes, endTime: in60Minutes },
      ];
      const waitlist = [makeGroup(4, true)]; // deferred doubles

      const result = canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: 0 });
      // Overtime court (no block) should be counted as full-time
      expect(result).toBe(true);
    });
  });

  describe('Position logic', () => {
    it('position 2 needs 2 courts when position 1 can play', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const waitlist = [makeGroup(2), makeGroup(2)];

      // First group can play (1 court available)
      const firstCanPlay = canGroupRegisterNow({ courts, waitlist, idx: 0 });
      expect(firstCanPlay).toBe(true);

      // Second group needs 2 courts but only 1 available
      const secondCanPlay = canGroupRegisterNow({ courts, waitlist, idx: 1 });
      expect(secondCanPlay).toBe(false);
    });

    it('position 2 needs 1 court when position 1 cannot play', () => {
      // Court 8 only - first group is doubles (can't use Court 8)
      // Second group is singles (can use Court 8)
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const waitlist = [makeGroup(4), makeGroup(2)]; // doubles, then singles

      // First group (doubles) can't use Court 8
      const firstCanPlay = canGroupRegisterNow({ courts, waitlist, idx: 0 });
      expect(firstCanPlay).toBe(false);

      // Second group (singles) needs only 1 court since first can't play
      const secondCanPlay = canGroupRegisterNow({ courts, waitlist, idx: 1 });
      expect(secondCanPlay).toBe(true);
    });

    it('position 3+ returns false when any group ahead can play', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const waitlist = [makeGroup(2), makeGroup(2), makeGroup(2)];

      // First group can play
      expect(canGroupRegisterNow({ courts, waitlist, idx: 0 })).toBe(true);

      // Third group can't play because first group can
      expect(canGroupRegisterNow({ courts, waitlist, idx: 2 })).toBe(false);
    });

    it('position 3+ returns true when no group ahead can play', () => {
      // Court 8 only, first two groups are doubles
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const waitlist = [makeGroup(4), makeGroup(4), makeGroup(2)]; // doubles, doubles, singles

      // First two groups can't use Court 8
      expect(canGroupRegisterNow({ courts, waitlist, idx: 0 })).toBe(false);
      expect(canGroupRegisterNow({ courts, waitlist, idx: 1 })).toBe(false);

      // Third group (singles) can play since no group ahead can
      expect(canGroupRegisterNow({ courts, waitlist, idx: 2 })).toBe(true);
    });
  });

  describe('20-min threshold', () => {
    it('free court with block in <= 5 min NOT selectable (excluded entirely)', () => {
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in5Minutes, endTime: in60Minutes },
      ];
      const waitlist = [makeGroup(2)];

      // Court with <= 5 min is excluded from selectableCourts entirely
      const result = canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: 0 });
      expect(result).toBe(false);
    });

    it('free court with block in 25 min counted', () => {
      const now = new Date();
      const in25Minutes = new Date(now.getTime() + 25 * 60000).toISOString();
      const in90Minutes = new Date(now.getTime() + 90 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in25Minutes, endTime: in90Minutes },
      ];
      const waitlist = [makeGroup(2)];

      // Court has >= 20 min usable time
      const result = canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: 0 });
      expect(result).toBe(true);
    });

    it('overtime court with no block counted when no usable free', () => {
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 5 min
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true }, // no block
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in5Minutes, endTime: in60Minutes },
      ];
      const waitlist = [makeGroup(2)];

      // Free court not usable, overtime becomes fallback
      const result = canGroupRegisterNow({ courts, upcomingBlocks, waitlist, idx: 0 });
      expect(result).toBe(true);
    });
  });

  describe('Court 8 eligibility', () => {
    it('doubles group cannot use Court 8', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const waitlist = [makeGroup(4)]; // doubles

      const result = canGroupRegisterNow({ courts, waitlist, idx: 0 });
      expect(result).toBe(false);
    });

    it('singles group can use Court 8', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const waitlist = [makeGroup(2)]; // singles

      const result = canGroupRegisterNow({ courts, waitlist, idx: 0 });
      expect(result).toBe(true);
    });
  });

  describe('Tournament exclusion', () => {
    it('tournament court not counted as available', () => {
      const courts = [
        { number: 1, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: true },
      ];
      const waitlist = [makeGroup(2)];

      const result = canGroupRegisterNow({ courts, waitlist, idx: 0 });
      expect(result).toBe(false);
    });
  });
});
