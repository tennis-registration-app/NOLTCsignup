import { describe, it, expect } from 'vitest';
import { computeRegistrationCourtSelection } from '../../../src/shared/courts/overtimeEligibility.js';

/**
 * Tests for agreement between kiosk and courtboard paths.
 *
 * Both paths now consume computeRegistrationCourtSelection as the
 * single source of truth. These tests verify that:
 * 1. CTA fires if and only if "You're Up" would fire for the same scenario
 * 2. Overtime is shown as green on courtboard iff it's in selectable courts
 * 3. Deferred group handling is consistent across paths
 */

// Simulate kiosk CTA logic (from useRegistrationDerived)
function computeKioskCta({ courts, upcomingBlocks, waitlist }) {
  const selection = computeRegistrationCourtSelection(courts, upcomingBlocks);

  const firstEntry = waitlist?.[0] || null;
  if (!firstEntry) return { live1: false };

  const playerCount = firstEntry.players?.length || 0;
  const isDeferred = firstEntry.deferred ?? false;

  const availableCount = isDeferred
    ? selection.countFullTimeForGroup(playerCount)
    : selection.countSelectableForGroup(playerCount);

  return {
    live1: availableCount > 0,
    selection,
  };
}

// Simulate courtboard "You're Up" logic (from WaitingList.jsx canGroupRegisterNow)
function computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist, idx = 0 }) {
  const selection = computeRegistrationCourtSelection(courts, upcomingBlocks);

  const group = waitlist?.[idx];
  if (!group) return false;

  const playerCount = group.players?.length || 0;
  const isDeferred = group.deferred ?? false;

  const available = isDeferred
    ? selection.countFullTimeForGroup(playerCount)
    : selection.countSelectableForGroup(playerCount);

  return available > 0;
}

// Helper to create a waitlist group
const makeGroup = (playerCount, deferred = false) => ({
  id: `group-${Math.random()}`,
  players: Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` })),
  deferred,
});

describe('kiosk and courtboard agreement', () => {
  describe('CTA fires iff You\'re Up fires for same scenario', () => {
    it('both fire when free court available', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];
      const waitlist = [makeGroup(2)];

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      expect(kioskResult.live1).toBe(true);
      expect(courtboardResult).toBe(true);
    });

    it('neither fires when no courts available', () => {
      const courts = [
        { number: 1, isAvailable: false, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];
      const waitlist = [makeGroup(2)];

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      expect(kioskResult.live1).toBe(false);
      expect(courtboardResult).toBe(false);
    });

    it('both fire when free court has block in < 20 min (still selectable with warning)', () => {
      const now = new Date();
      const in10Minutes = new Date(now.getTime() + 10 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in10Minutes, endTime: in60Minutes },
      ];
      const waitlist = [makeGroup(2)];

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      // Free court is still selectable (player can choose), just not "usable" for full session
      // The 20-min threshold determines overtime fallback, not whether CTA fires
      expect(kioskResult.live1).toBe(true);
      expect(courtboardResult).toBe(true);
    });

    it('both fire when overtime available as fallback', () => {
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
      const waitlist = [makeGroup(2)];

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      expect(kioskResult.live1).toBe(true);
      expect(courtboardResult).toBe(true);
    });

    it('neither fires when only Court 8 available for doubles', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];
      const waitlist = [makeGroup(4)]; // doubles

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      expect(kioskResult.live1).toBe(false);
      expect(courtboardResult).toBe(false);
    });

    it('both fire when Court 8 available for singles', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];
      const waitlist = [makeGroup(2)]; // singles

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      expect(kioskResult.live1).toBe(true);
      expect(courtboardResult).toBe(true);
    });
  });

  describe('overtime green on courtboard iff overtime in selectable courts', () => {
    it('overtime in selectableCourts when no usable free courts', () => {
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

      const selection = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // showingOvertimeCourts should be true
      expect(selection.showingOvertimeCourts).toBe(true);

      // Overtime court should be in selectableCourts
      const overtimeCourt = selection.selectableCourts.find((sc) => sc.number === 2);
      expect(overtimeCourt).toBeDefined();
      expect(overtimeCourt.reason).toBe('overtime_fallback');
    });

    it('overtime NOT in selectableCourts when usable free court exists', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [];

      const selection = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // showingOvertimeCourts should be false
      expect(selection.showingOvertimeCourts).toBe(false);

      // Overtime court should NOT be in selectableCourts
      const overtimeCourt = selection.selectableCourts.find((sc) => sc.number === 2);
      expect(overtimeCourt).toBeUndefined();
    });

    it('tournament overtime never in selectableCourts', () => {
      const courts = [
        { number: 1, isAvailable: false, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: true },
      ];
      const upcomingBlocks = [];

      const selection = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // No free courts, but tournament overtime should still be excluded
      expect(selection.fallbackOvertimeCourts).toHaveLength(0);
      expect(selection.selectableCourts).toHaveLength(0);
    });
  });

  describe('deferred group: both paths agree on full-time availability', () => {
    it('deferred group sees no full-time when court has block < 95 min (doubles)', () => {
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

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      // 60 min < 95 min needed for doubles, no full-time court
      expect(kioskResult.live1).toBe(false);
      expect(courtboardResult).toBe(false);
    });

    it('deferred group sees full-time when court has block >= 95 min (doubles)', () => {
      const now = new Date();
      const in100Minutes = new Date(now.getTime() + 100 * 60000).toISOString();
      const in180Minutes = new Date(now.getTime() + 180 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in100Minutes, endTime: in180Minutes },
      ];
      const waitlist = [makeGroup(4, true)]; // deferred doubles

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      // 100 min >= 95 min needed for doubles, full-time court available
      expect(kioskResult.live1).toBe(true);
      expect(courtboardResult).toBe(true);
    });

    it('deferred group sees no full-time when court has block < 65 min (singles)', () => {
      const now = new Date();
      const in50Minutes = new Date(now.getTime() + 50 * 60000).toISOString();
      const in120Minutes = new Date(now.getTime() + 120 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in50Minutes, endTime: in120Minutes },
      ];
      const waitlist = [makeGroup(2, true)]; // deferred singles

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      // 50 min < 65 min needed for singles, no full-time court
      expect(kioskResult.live1).toBe(false);
      expect(courtboardResult).toBe(false);
    });

    it('deferred group sees full-time when court has no block', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];
      const waitlist = [makeGroup(4, true)]; // deferred doubles

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      // No block = unlimited time, full-time available
      expect(kioskResult.live1).toBe(true);
      expect(courtboardResult).toBe(true);
    });

    it('deferred doubles cannot use Court 8 even if full-time', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];
      const waitlist = [makeGroup(4, true)]; // deferred doubles

      const kioskResult = computeKioskCta({ courts, upcomingBlocks, waitlist });
      const courtboardResult = computeCourtboardYoureUp({ courts, upcomingBlocks, waitlist });

      // Court 8 is singles-only, doubles can't use it
      expect(kioskResult.live1).toBe(false);
      expect(courtboardResult).toBe(false);
    });
  });
});
