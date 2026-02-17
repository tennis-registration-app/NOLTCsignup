import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeRegistrationCourtSelection } from '../../../src/shared/courts/overtimeEligibility.js';

/**
 * Tests for CTA block filtering logic using the canonical computeRegistrationCourtSelection API.
 *
 * This tests the core logic that determines whether an available court
 * should trigger a CTA (Call To Action / "You're Up") notification.
 *
 * Key rule: Courts with blocks starting in < 20 minutes should NOT
 * trigger CTA because there isn't enough useful play time.
 */

// Helper to compute CTA state using the canonical API
function computeCtaState({ courts, upcomingBlocks, waitlist }) {
  // Handle null/undefined upcomingBlocks conservatively
  if (upcomingBlocks === null || upcomingBlocks === undefined) {
    return {
      usableAvailableCourts: [],
      live1: false,
      firstGroup: waitlist?.[0] || null,
    };
  }

  const selection = computeRegistrationCourtSelection(courts, upcomingBlocks);

  // Get usable courts (those with >= 20 min before block)
  const usableAvailableCourts = selection.selectableCourts
    .filter((sc) => sc.isUsable)
    .map((sc) => sc.number);

  // Normalize first group
  const firstEntry = waitlist?.[0] || null;
  const firstGroup = firstEntry
    ? {
        id: firstEntry.id,
        position: firstEntry.position,
        players: firstEntry.group?.players || [],
        deferred: firstEntry.deferred ?? false,
      }
    : null;

  const firstGroupPlayerCount = firstGroup?.players?.length || 0;
  const firstIsDeferred = firstGroup?.deferred ?? false;

  // Use canonical API for eligibility
  const eligibleCount = firstIsDeferred
    ? selection.countFullTimeForGroup(firstGroupPlayerCount)
    : selection.countSelectableForGroup(firstGroupPlayerCount);

  // For non-deferred, check if usable courts exist for this group
  // Filter usable courts by eligibility (e.g., Court 8 singles-only)
  const usableEligible = selection
    .getSelectableForGroup(firstGroupPlayerCount)
    .filter((sc) => sc.isUsable);

  const live1 = firstGroup !== null && !firstIsDeferred && usableEligible.length >= 1;

  return {
    usableAvailableCourts,
    live1,
    firstGroup,
  };
}

describe('CTA Block Filter Logic', () => {
  beforeEach(() => {
    // Freeze time so all relative-time calculations are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CTA should NOT fire when available court has block starting in < 20 minutes', () => {
    // Court 12: available (empty, not overtime)
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    // Block for Court 12 starting in 8 minutes (< 20 min threshold)
    // Use relative time from now for the test
    const now = new Date();
    const in8Minutes = new Date(now.getTime() + 8 * 60000).toISOString();
    const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: in8Minutes,
        endTime: in60Minutes,
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
      upcomingBlocks,
      waitlist,
    });

    // Court 12 should be filtered out because block starts in 8 min (< 20)
    expect(result.usableAvailableCourts).toEqual([]);

    // live1 should be false - no CTA should fire
    expect(result.live1).toBe(false);
  });

  it('CTA should fire when available court has block starting in > 20 minutes', () => {
    // Court 12: available (empty, not overtime)
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    // Block for Court 12 starting in 25 minutes (> 20 min threshold)
    const now = new Date();
    const in25Minutes = new Date(now.getTime() + 25 * 60000).toISOString();
    const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: in25Minutes,
        endTime: in60Minutes,
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
      upcomingBlocks,
      waitlist,
    });

    // Court 12 should be included because block starts in 25 min (>= 20)
    expect(result.usableAvailableCourts).toEqual([12]);

    // live1 should be true - CTA should fire
    expect(result.live1).toBe(true);
  });

  it('CTA should fire when court has no upcoming block', () => {
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

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
      upcomingBlocks,
      waitlist,
    });

    expect(result.usableAvailableCourts).toEqual([12]);
    expect(result.live1).toBe(true);
  });

  it('CTA edge case: block starting in exactly 20 minutes should allow CTA', () => {
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    // Block starts in exactly 20 minutes
    const now = new Date();
    const in20Minutes = new Date(now.getTime() + 20 * 60000).toISOString();
    const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: in20Minutes,
        endTime: in60Minutes,
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
      upcomingBlocks,
      waitlist,
    });

    // >= 20 minutes, so court should be usable
    expect(result.usableAvailableCourts).toEqual([12]);
    expect(result.live1).toBe(true);
  });

  it('CTA edge case: block starting in 19 minutes should NOT allow CTA', () => {
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

    // Block starts in 19 minutes
    const now = new Date();
    const in19Minutes = new Date(now.getTime() + 19 * 60000).toISOString();
    const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

    const upcomingBlocks = [
      {
        id: 'block-1',
        courtNumber: 12,
        startTime: in19Minutes,
        endTime: in60Minutes,
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
      upcomingBlocks,
      waitlist,
    });

    // < 20 minutes, so court should NOT be usable
    expect(result.usableAvailableCourts).toEqual([]);
    expect(result.live1).toBe(false);
  });

  it('CTA should NOT fire when upcomingBlocks is null (data not loaded yet)', () => {
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

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
      upcomingBlocks,
      waitlist,
    });

    // Block data not loaded — be conservative, no courts usable
    expect(result.usableAvailableCourts).toEqual([]);
    expect(result.live1).toBe(false);
  });

  it('CTA should NOT fire when upcomingBlocks is undefined (data not loaded yet)', () => {
    const courts = [
      { number: 12, isAvailable: true, isOvertime: false, isOccupied: false, isBlocked: false },
    ];

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
      upcomingBlocks,
      waitlist,
    });

    // Block data not loaded — be conservative, no courts usable
    expect(result.usableAvailableCourts).toEqual([]);
    expect(result.live1).toBe(false);
  });
});
