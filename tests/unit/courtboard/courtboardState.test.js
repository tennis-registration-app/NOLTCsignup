/** @vitest-environment jsdom */
/**
 * courtboardState — window bridge accessor tests
 *
 * Tests getCourtboardState, isCourtboardStateReady, and window exposure.
 * Mocks window.CourtboardState at test level.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCourtboardState,
  isCourtboardStateReady,
} from '../../../src/courtboard/courtboardState.js';

describe('courtboardState', () => {
  let savedCourtboardState;

  beforeEach(() => {
    savedCourtboardState = window.CourtboardState;
  });

  afterEach(() => {
    window.CourtboardState = savedCourtboardState;
  });

  // ============================================================
  // getCourtboardState
  // ============================================================

  describe('getCourtboardState', () => {
    it('returns window.CourtboardState when it exists', () => {
      const state = {
        courts: [{ number: 1 }],
        courtBlocks: [{ id: 'b1' }],
        waitingGroups: [{ id: 'w1' }],
        timestamp: 12345,
      };
      window.CourtboardState = state;
      expect(getCourtboardState()).toBe(state);
    });

    it('returns default empty state when window.CourtboardState is undefined', () => {
      window.CourtboardState = undefined;
      const result = getCourtboardState();
      expect(result).toEqual({
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
      });
    });

    it('returns default empty state when window.CourtboardState is null', () => {
      window.CourtboardState = null;
      const result = getCourtboardState();
      expect(result).toEqual({
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
      });
    });

    it('returns partial state as-is (does not merge with defaults)', () => {
      const partial = { courts: [{ number: 1 }] };
      window.CourtboardState = partial;
      const result = getCourtboardState();
      expect(result).toBe(partial);
      expect(result.courtBlocks).toBeUndefined();
    });
  });

  // ============================================================
  // isCourtboardStateReady
  // ============================================================

  describe('isCourtboardStateReady', () => {
    it('returns true when state has timestamp', () => {
      window.CourtboardState = {
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
        timestamp: Date.now(),
      };
      expect(isCourtboardStateReady()).toBe(true);
    });

    it('returns false when state has no timestamp', () => {
      window.CourtboardState = {
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
      };
      expect(isCourtboardStateReady()).toBe(false);
    });

    it('returns false when state has timestamp of 0 (falsy)', () => {
      window.CourtboardState = { courts: [], timestamp: 0 };
      expect(isCourtboardStateReady()).toBe(false);
    });

    it('returns false when CourtboardState is null', () => {
      window.CourtboardState = null;
      expect(isCourtboardStateReady()).toBe(false);
    });

    it('returns false when CourtboardState is undefined', () => {
      window.CourtboardState = undefined;
      expect(isCourtboardStateReady()).toBe(false);
    });
  });

  // ============================================================
  // Window exposure
  // ============================================================

  describe('window exposure', () => {
    it('exposes getCourtboardState on window', () => {
      expect(window.getCourtboardState).toBe(getCourtboardState);
    });

    it('exposes isCourtboardStateReady on window', () => {
      expect(window.isCourtboardStateReady).toBe(isCourtboardStateReady);
    });
  });
});
