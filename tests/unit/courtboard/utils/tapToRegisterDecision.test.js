/**
 * tapToRegisterDecision — decideTapToRegister tests
 *
 * Pure function, no DOM/window/storage dependencies.
 * Tests all 5 decision branches + edge cases.
 */

import { describe, it, expect } from 'vitest';
import { decideTapToRegister } from '../../../../src/courtboard/utils/tapToRegisterDecision.js';

// Helper: build a courts array where court N (1-based) has given properties
function makeCourts(overrides = {}) {
  // 8 courts, all empty by default
  return Array.from({ length: 8 }, (_, i) => ({
    number: i + 1,
    isOccupied: false,
    session: null,
    ...overrides[i + 1],
  }));
}

// Helper: build an occupied court (players present)
function occupiedCourt(players = [{ name: 'Alice' }]) {
  return {
    isOccupied: true,
    session: { group: { players } },
  };
}

describe('decideTapToRegister', () => {
  // ============================================================
  // A) Normal registration — no waitlist, no prior registration
  // ============================================================

  describe('normal registration (no waitlist, no prior registration)', () => {
    it('returns register action with courtNumber', () => {
      const result = decideTapToRegister({
        courtNumber: 3,
        courts: makeCourts(),
        waitingGroups: [],
        registeredCourt: null,
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'register', courtNumber: 3 });
    });

    it('coerces courtNumber to Number', () => {
      const result = decideTapToRegister({
        courtNumber: '5',
        courts: makeCourts(),
        waitingGroups: [],
        registeredCourt: null,
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'register', courtNumber: 5 });
    });

    it('returns register when waitingGroups is null', () => {
      const result = decideTapToRegister({
        courtNumber: 1,
        courts: makeCourts(),
        waitingGroups: null,
        registeredCourt: null,
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'register', courtNumber: 1 });
    });

    it('returns register when waitingGroups is undefined', () => {
      const result = decideTapToRegister({
        courtNumber: 2,
        courts: makeCourts(),
        waitingGroups: undefined,
        registeredCourt: null,
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'register', courtNumber: 2 });
    });
  });

  // ============================================================
  // B) User already registered — valid registration
  // ============================================================

  describe('already registered (valid)', () => {
    it('returns already-registered when registered court is occupied', () => {
      const courts = makeCourts({ 4: occupiedCourt() });
      const result = decideTapToRegister({
        courtNumber: 2,
        courts,
        waitingGroups: [],
        registeredCourt: '4',
        waitlistEntryId: null,
      });
      expect(result).toEqual({
        action: 'already-registered',
        message: 'You are currently registered for play on Court 4',
      });
    });

    it('returns already-registered when court has participants (API wire format)', () => {
      const courts = makeCourts({
        3: { isOccupied: false, session: { participants: [{ id: 'p1' }] } },
      });
      const result = decideTapToRegister({
        courtNumber: 1,
        courts,
        waitingGroups: [],
        registeredCourt: '3',
        waitlistEntryId: null,
      });
      expect(result.action).toBe('already-registered');
      expect(result.message).toContain('Court 3');
    });

    it('returns already-registered when court has isOccupied flag only', () => {
      const courts = makeCourts({ 5: { isOccupied: true, session: null } });
      const result = decideTapToRegister({
        courtNumber: 1,
        courts,
        waitingGroups: [],
        registeredCourt: '5',
        waitlistEntryId: null,
      });
      expect(result.action).toBe('already-registered');
    });

    it('message includes the registered court number', () => {
      const courts = makeCourts({ 7: occupiedCourt() });
      const result = decideTapToRegister({
        courtNumber: 1,
        courts,
        waitingGroups: [],
        registeredCourt: '7',
        waitlistEntryId: null,
      });
      expect(result.message).toBe(
        'You are currently registered for play on Court 7'
      );
    });
  });

  // ============================================================
  // C) Stale registration — court no longer occupied
  // ============================================================

  describe('stale registration (reset)', () => {
    it('returns reset-stale-session when registered court is empty', () => {
      const courts = makeCourts(); // all empty
      const result = decideTapToRegister({
        courtNumber: 2,
        courts,
        waitingGroups: [],
        registeredCourt: '4',
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'reset-stale-session' });
    });

    it('returns reset-stale-session when courts array is empty', () => {
      const result = decideTapToRegister({
        courtNumber: 1,
        courts: [],
        waitingGroups: [],
        registeredCourt: '3',
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'reset-stale-session' });
    });

    it('returns reset-stale-session when courts is null', () => {
      const result = decideTapToRegister({
        courtNumber: 1,
        courts: null,
        waitingGroups: [],
        registeredCourt: '2',
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'reset-stale-session' });
    });

    it('returns reset-stale-session when courts is undefined', () => {
      const result = decideTapToRegister({
        courtNumber: 1,
        courts: undefined,
        waitingGroups: [],
        registeredCourt: '1',
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'reset-stale-session' });
    });

    it('returns reset-stale-session when registered court index is out of range', () => {
      const courts = makeCourts(); // 8 courts
      const result = decideTapToRegister({
        courtNumber: 1,
        courts,
        waitingGroups: [],
        registeredCourt: '99',
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'reset-stale-session' });
    });

    it('returns reset-stale-session when registered court has empty players array', () => {
      const courts = makeCourts({
        2: { isOccupied: false, session: { group: { players: [] } } },
      });
      const result = decideTapToRegister({
        courtNumber: 1,
        courts,
        waitingGroups: [],
        registeredCourt: '2',
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'reset-stale-session' });
    });
  });

  // ============================================================
  // D) Waitlist — user is first
  // ============================================================

  describe('assign from waitlist (user is first)', () => {
    it('returns assign-from-waitlist when user is first in waitlist', () => {
      const result = decideTapToRegister({
        courtNumber: 3,
        courts: makeCourts(),
        waitingGroups: [{ id: 'wl-123' }, { id: 'wl-456' }],
        registeredCourt: null,
        waitlistEntryId: 'wl-123',
      });
      expect(result).toEqual({
        action: 'assign-from-waitlist',
        courtNumber: 3,
        waitlistEntryId: 'wl-123',
      });
    });

    it('coerces courtNumber to Number for assign-from-waitlist', () => {
      const result = decideTapToRegister({
        courtNumber: '7',
        courts: makeCourts(),
        waitingGroups: [{ id: 'entry-1' }],
        registeredCourt: null,
        waitlistEntryId: 'entry-1',
      });
      expect(result.courtNumber).toBe(7);
    });

    it('includes waitlistEntryId in result', () => {
      const result = decideTapToRegister({
        courtNumber: 1,
        courts: makeCourts(),
        waitingGroups: [{ id: 'abc-def' }],
        registeredCourt: null,
        waitlistEntryId: 'abc-def',
      });
      expect(result.waitlistEntryId).toBe('abc-def');
    });
  });

  // ============================================================
  // E) Waitlist — user NOT first (or not on waitlist)
  // ============================================================

  describe('join waitlist (user not first or not on waitlist)', () => {
    it('returns join-waitlist when waitlist exists but user has no entry', () => {
      const result = decideTapToRegister({
        courtNumber: 3,
        courts: makeCourts(),
        waitingGroups: [{ id: 'wl-123' }],
        registeredCourt: null,
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'join-waitlist' });
    });

    it('returns join-waitlist when user is not first in waitlist', () => {
      const result = decideTapToRegister({
        courtNumber: 3,
        courts: makeCourts(),
        waitingGroups: [{ id: 'wl-123' }, { id: 'wl-456' }],
        registeredCourt: null,
        waitlistEntryId: 'wl-456', // second in line
      });
      expect(result).toEqual({ action: 'join-waitlist' });
    });

    it('returns join-waitlist when waitlistEntryId does not match any group', () => {
      const result = decideTapToRegister({
        courtNumber: 3,
        courts: makeCourts(),
        waitingGroups: [{ id: 'wl-123' }],
        registeredCourt: null,
        waitlistEntryId: 'nonexistent',
      });
      expect(result).toEqual({ action: 'join-waitlist' });
    });

    it('returns join-waitlist when waitlistEntryId is empty string (falsy)', () => {
      const result = decideTapToRegister({
        courtNumber: 3,
        courts: makeCourts(),
        waitingGroups: [{ id: 'wl-123' }],
        registeredCourt: null,
        waitlistEntryId: '',
      });
      expect(result).toEqual({ action: 'join-waitlist' });
    });
  });

  // ============================================================
  // F) Edge cases
  // ============================================================

  describe('edge cases', () => {
    it('registeredCourt takes priority over waitlist check', () => {
      // User is registered AND there's a waitlist — registered check wins
      const courts = makeCourts({ 2: occupiedCourt() });
      const result = decideTapToRegister({
        courtNumber: 1,
        courts,
        waitingGroups: [{ id: 'wl-123' }],
        registeredCourt: '2',
        waitlistEntryId: 'wl-123',
      });
      expect(result.action).toBe('already-registered');
    });

    it('stale registration takes priority over waitlist', () => {
      // User has stale registration AND there's a waitlist
      const courts = makeCourts(); // all empty
      const result = decideTapToRegister({
        courtNumber: 1,
        courts,
        waitingGroups: [{ id: 'wl-123' }],
        registeredCourt: '3',
        waitlistEntryId: null,
      });
      expect(result.action).toBe('reset-stale-session');
    });

    it('handles courtNumber 0', () => {
      const result = decideTapToRegister({
        courtNumber: 0,
        courts: makeCourts(),
        waitingGroups: [],
        registeredCourt: null,
        waitlistEntryId: null,
      });
      expect(result).toEqual({ action: 'register', courtNumber: 0 });
    });

    it('handles first waitingGroup with no id property', () => {
      const result = decideTapToRegister({
        courtNumber: 1,
        courts: makeCourts(),
        waitingGroups: [{ name: 'no-id-group' }],
        registeredCourt: null,
        waitlistEntryId: 'wl-123',
      });
      // firstGroup.id is undefined, doesn't match — falls through to join-waitlist
      expect(result).toEqual({ action: 'join-waitlist' });
    });

    it('handles waitingGroups with null first entry', () => {
      const result = decideTapToRegister({
        courtNumber: 1,
        courts: makeCourts(),
        waitingGroups: [null],
        registeredCourt: null,
        waitlistEntryId: 'wl-123',
      });
      // firstGroup?.id is undefined — join-waitlist
      expect(result).toEqual({ action: 'join-waitlist' });
    });
  });
});
