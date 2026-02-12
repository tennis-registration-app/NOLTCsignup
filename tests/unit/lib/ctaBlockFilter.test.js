import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isCourtEligibleForGroup } from '../../../src/lib/types/domain.js';

/**
 * Tests for CTA block filtering logic extracted from useRegistrationDerived.
 *
 * This tests the core logic that determines whether an available court
 * should trigger a CTA (Call To Action / "You're Up") notification.
 *
 * Key rule: Courts with blocks starting in < 20 minutes should NOT
 * trigger CTA because there isn't enough useful play time.
 */

// Extract the filtering logic from useRegistrationDerived for testability
function computeCtaState({ courts, availableCourts, upcomingBlocks, waitlist, now }) {
  const MIN_USEFUL_MINUTES = 20;

  // Normalize waitlist (simplified for test)
  const normalizedWaitlist = (waitlist || []).map((entry) => ({
    id: entry.id,
    position: entry.position,
    groupType: entry.group?.type,
    joinedAt: entry.joinedAt,
    minutesWaiting: entry.minutesWaiting,
    names: (entry.group?.players || []).map((p) => p.displayName || p.name || 'Unknown'),
    players: entry.group?.players || [],
    deferred: entry.deferred ?? false,
  }));

  // Split available courts by type (free vs overtime)
  const freeCourts = availableCourts.filter((courtNum) => {
    const court = courts.find((c) => c?.number === courtNum) || courts[courtNum - 1];
    return court && !court.isOvertime;
  });
  const overtimeCourts = availableCourts.filter((courtNum) => {
    const court = courts.find((c) => c?.number === courtNum) || courts[courtNum - 1];
    return court?.isOvertime;
  });

  // Mirror CourtRoute: prefer free courts, fallback to overtime only if no free
  const effectiveAvailableCourts = freeCourts.length > 0 ? freeCourts : overtimeCourts;

  // Filter out courts with < 20 min before upcoming block
  const usableAvailableCourts = effectiveAvailableCourts.filter((courtNum) => {
    if (upcomingBlocks === null || upcomingBlocks === undefined) {
      return false; // Block data not loaded — be conservative
    }
    if (upcomingBlocks.length === 0) return true; // Loaded, no blocks
    const nextBlock = upcomingBlocks.find(
      (b) => Number(b.courtNumber) === courtNum && new Date(b.startTime) > now
    );
    if (!nextBlock) return true;
    const minutesUntilBlock = (new Date(nextBlock.startTime) - now) / 60000;
    return minutesUntilBlock >= MIN_USEFUL_MINUTES;
  });

  const firstGroup = normalizedWaitlist[0] || null;
  const firstGroupPlayerCount = firstGroup?.players?.length || 0;

  // Check eligibility for first group
  const eligibleForFirst = usableAvailableCourts.filter((courtNum) =>
    isCourtEligibleForGroup(courtNum, firstGroupPlayerCount)
  ).length;

  // Deferred groups use different logic, but for non-deferred:
  const firstIsDeferred = firstGroup?.deferred ?? false;
  const effectiveFirst = firstIsDeferred ? 0 : eligibleForFirst; // Simplified for test
  const live1 =
    effectiveFirst >= 1 && firstGroup !== null && !(firstIsDeferred && effectiveFirst === 0);

  return {
    usableAvailableCourts,
    live1,
    firstGroup,
  };
}

describe('CTA Block Filter Logic', () => {
  let realDate;

  beforeEach(() => {
    // Store real Date
    realDate = global.Date;
  });

  afterEach(() => {
    // Restore real Date
    global.Date = realDate;
    vi.useRealTimers();
  });

  it('CTA should NOT fire when available court has block starting in < 20 minutes', () => {
    // Setup: Current time
    const now = new Date('2025-01-15T10:00:00Z');

    // Court 12: available (empty, not overtime)
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    // Available courts list includes Court 12
    const availableCourts = [12];

    // Block for Court 12 starting in 8 minutes (< 20 min threshold)
    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: '2025-01-15T10:08:00Z', // 8 minutes from now
        endTime: '2025-01-15T11:00:00Z',
        reason: 'Lesson',
      },
    ];

    // 1 waitlist group: non-deferred, 2 players (doubles-eligible)
    const waitlist = [
      {
        id: 'wl-1',
        position: 1,
        deferred: false,
        group: {
          type: 'doubles',
          players: [
            { memberId: '1', displayName: 'Player One', isGuest: false },
            { memberId: '2', displayName: 'Player Two', isGuest: false },
          ],
        },
        joinedAt: '2025-01-15T09:50:00Z',
        minutesWaiting: 10,
      },
    ];

    const result = computeCtaState({
      courts,
      availableCourts,
      upcomingBlocks,
      waitlist,
      now,
    });

    // Court 12 should be filtered out because block starts in 8 min (< 20)
    expect(result.usableAvailableCourts).toEqual([]);

    // live1 should be false - no CTA should fire
    expect(result.live1).toBe(false);
  });

  it('CTA should fire when available court has block starting in > 20 minutes', () => {
    // Setup: Current time
    const now = new Date('2025-01-15T10:00:00Z');

    // Court 12: available (empty, not overtime)
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    // Available courts list includes Court 12
    const availableCourts = [12];

    // Block for Court 12 starting in 25 minutes (> 20 min threshold)
    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: '2025-01-15T10:25:00Z', // 25 minutes from now
        endTime: '2025-01-15T11:00:00Z',
        reason: 'Lesson',
      },
    ];

    // 1 waitlist group: non-deferred, 2 players (doubles-eligible)
    const waitlist = [
      {
        id: 'wl-1',
        position: 1,
        deferred: false,
        group: {
          type: 'doubles',
          players: [
            { memberId: '1', displayName: 'Player One', isGuest: false },
            { memberId: '2', displayName: 'Player Two', isGuest: false },
          ],
        },
        joinedAt: '2025-01-15T09:50:00Z',
        minutesWaiting: 10,
      },
    ];

    const result = computeCtaState({
      courts,
      availableCourts,
      upcomingBlocks,
      waitlist,
      now,
    });

    // Court 12 should be included because block starts in 25 min (>= 20)
    expect(result.usableAvailableCourts).toEqual([12]);

    // live1 should be true - CTA should fire
    expect(result.live1).toBe(true);
  });

  it('CTA should fire when court has no upcoming block', () => {
    const now = new Date('2025-01-15T10:00:00Z');

    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    const availableCourts = [12];
    const upcomingBlocks = []; // No blocks

    const waitlist = [
      {
        id: 'wl-1',
        position: 1,
        deferred: false,
        group: {
          type: 'doubles',
          players: [
            { memberId: '1', displayName: 'Player One', isGuest: false },
            { memberId: '2', displayName: 'Player Two', isGuest: false },
          ],
        },
        joinedAt: '2025-01-15T09:50:00Z',
        minutesWaiting: 10,
      },
    ];

    const result = computeCtaState({
      courts,
      availableCourts,
      upcomingBlocks,
      waitlist,
      now,
    });

    expect(result.usableAvailableCourts).toEqual([12]);
    expect(result.live1).toBe(true);
  });

  it('CTA edge case: block starting in exactly 20 minutes should allow CTA', () => {
    const now = new Date('2025-01-15T10:00:00Z');

    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    const availableCourts = [12];

    // Block starts in exactly 20 minutes
    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: '2025-01-15T10:20:00Z', // Exactly 20 minutes
        endTime: '2025-01-15T11:00:00Z',
        reason: 'Lesson',
      },
    ];

    const waitlist = [
      {
        id: 'wl-1',
        position: 1,
        deferred: false,
        group: {
          type: 'doubles',
          players: [
            { memberId: '1', displayName: 'Player One', isGuest: false },
            { memberId: '2', displayName: 'Player Two', isGuest: false },
          ],
        },
        joinedAt: '2025-01-15T09:50:00Z',
        minutesWaiting: 10,
      },
    ];

    const result = computeCtaState({
      courts,
      availableCourts,
      upcomingBlocks,
      waitlist,
      now,
    });

    // >= 20 minutes, so court should be usable
    expect(result.usableAvailableCourts).toEqual([12]);
    expect(result.live1).toBe(true);
  });

  it('CTA edge case: block starting in 19 minutes should NOT allow CTA', () => {
    const now = new Date('2025-01-15T10:00:00Z');

    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    const availableCourts = [12];

    // Block starts in 19 minutes
    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: '2025-01-15T10:19:00Z', // 19 minutes
        endTime: '2025-01-15T11:00:00Z',
        reason: 'Lesson',
      },
    ];

    const waitlist = [
      {
        id: 'wl-1',
        position: 1,
        deferred: false,
        group: {
          type: 'doubles',
          players: [
            { memberId: '1', displayName: 'Player One', isGuest: false },
            { memberId: '2', displayName: 'Player Two', isGuest: false },
          ],
        },
        joinedAt: '2025-01-15T09:50:00Z',
        minutesWaiting: 10,
      },
    ];

    const result = computeCtaState({
      courts,
      availableCourts,
      upcomingBlocks,
      waitlist,
      now,
    });

    // < 20 minutes, so court should NOT be usable
    expect(result.usableAvailableCourts).toEqual([]);
    expect(result.live1).toBe(false);
  });

  it('CTA should NOT fire when upcomingBlocks is null (data not loaded yet)', () => {
    const now = new Date('2025-01-15T10:00:00Z');

    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    const availableCourts = [12];
    const upcomingBlocks = null; // Not loaded yet

    const waitlist = [
      {
        id: 'wl-1',
        position: 1,
        deferred: false,
        group: {
          type: 'doubles',
          players: [
            { memberId: '1', displayName: 'Player One', isGuest: false },
            { memberId: '2', displayName: 'Player Two', isGuest: false },
          ],
        },
        joinedAt: '2025-01-15T09:50:00Z',
        minutesWaiting: 10,
      },
    ];

    const result = computeCtaState({
      courts,
      availableCourts,
      upcomingBlocks,
      waitlist,
      now,
    });

    // Block data not loaded — be conservative, no courts usable
    expect(result.usableAvailableCourts).toEqual([]);
    expect(result.live1).toBe(false);
  });

  it('CTA should NOT fire when upcomingBlocks is undefined (data not loaded yet)', () => {
    const now = new Date('2025-01-15T10:00:00Z');

    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    const availableCourts = [12];
    const upcomingBlocks = undefined; // Not loaded yet

    const waitlist = [
      {
        id: 'wl-1',
        position: 1,
        deferred: false,
        group: {
          type: 'doubles',
          players: [
            { memberId: '1', displayName: 'Player One', isGuest: false },
            { memberId: '2', displayName: 'Player Two', isGuest: false },
          ],
        },
        joinedAt: '2025-01-15T09:50:00Z',
        minutesWaiting: 10,
      },
    ];

    const result = computeCtaState({
      courts,
      availableCourts,
      upcomingBlocks,
      waitlist,
      now,
    });

    // Block data not loaded — be conservative, no courts usable
    expect(result.usableAvailableCourts).toEqual([]);
    expect(result.live1).toBe(false);
  });
});
