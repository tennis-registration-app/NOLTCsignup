/** @vitest-environment jsdom */
/**
 * window-bridge — single writer for window.CourtboardState
 *
 * Tests writeCourtboardState and getLegacyAvailabilityDomain.
 * Mocks window globals at test level.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  writeCourtboardState,
  getLegacyAvailabilityDomain,
} from '../../../../src/courtboard/bridge/window-bridge.js';

describe('window-bridge', () => {
  // ============================================================
  // writeCourtboardState
  // ============================================================

  describe('writeCourtboardState', () => {
    let savedCourtboardState;

    beforeEach(() => {
      savedCourtboardState = window.CourtboardState;
    });

    afterEach(() => {
      window.CourtboardState = savedCourtboardState;
    });

    it('writes state to window.CourtboardState', () => {
      const state = { courts: [{ number: 1 }], timestamp: 123 };
      writeCourtboardState(state);
      expect(window.CourtboardState).toBe(state);
    });

    it('overwrites existing state', () => {
      window.CourtboardState = { courts: [{ number: 1 }] };
      const newState = { courts: [{ number: 2 }], timestamp: 456 };
      writeCourtboardState(newState);
      expect(window.CourtboardState).toBe(newState);
    });

    it('handles null gracefully', () => {
      window.CourtboardState = { courts: [] };
      writeCourtboardState(null);
      expect(window.CourtboardState).toBeNull();
    });

    it('handles undefined', () => {
      window.CourtboardState = { courts: [] };
      writeCourtboardState(undefined);
      expect(window.CourtboardState).toBeUndefined();
    });
  });

  // ============================================================
  // getLegacyAvailabilityDomain
  // ============================================================

  describe('getLegacyAvailabilityDomain', () => {
    let savedTennis;

    beforeEach(() => {
      savedTennis = window.Tennis;
    });

    afterEach(() => {
      window.Tennis = savedTennis;
    });

    it('returns window.Tennis.Domain.availability when present', () => {
      const avail = { getFreeCourtsInfo: () => {} };
      window.Tennis = { Domain: { availability: avail } };
      expect(getLegacyAvailabilityDomain()).toBe(avail);
    });

    it('returns window.Tennis.Domain.Availability (capitalized) as fallback', () => {
      const avail = { getFreeCourtsInfo: () => {} };
      window.Tennis = { Domain: { Availability: avail } };
      expect(getLegacyAvailabilityDomain()).toBe(avail);
    });

    it('prefers lowercase availability over capitalized Availability', () => {
      const lower = { id: 'lower' };
      const upper = { id: 'upper' };
      window.Tennis = { Domain: { availability: lower, Availability: upper } };
      expect(getLegacyAvailabilityDomain()).toBe(lower);
    });

    it('returns undefined when Tennis is not defined', () => {
      window.Tennis = undefined;
      expect(getLegacyAvailabilityDomain()).toBeUndefined();
    });

    it('returns undefined when Tennis.Domain is not defined', () => {
      window.Tennis = {};
      expect(getLegacyAvailabilityDomain()).toBeUndefined();
    });

    it('returns undefined when Tennis.Domain has neither availability key', () => {
      window.Tennis = { Domain: {} };
      expect(getLegacyAvailabilityDomain()).toBeUndefined();
    });
  });
});
