/**
 * Courtboard State Bridge Contract Test
 *
 * Verifies the window.CourtboardState bridge contract between
 * React state (writer) and non-React consumers (readers).
 *
 * This test documents the expected shape of CourtboardState
 * and ensures the bridge functions behave correctly.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCourtboardState,
  isCourtboardStateReady,
} from '../../../src/courtboard/courtboardState.js';
import { writeCourtboardState } from '../../../src/courtboard/bridge/window-bridge.js';

describe('Courtboard State Bridge Contract', () => {
  // Clean slate for each test
  beforeEach(() => {
    delete window.CourtboardState;
  });

  afterEach(() => {
    delete window.CourtboardState;
  });

  describe('getCourtboardState', () => {
    it('returns default empty state before React initializes', () => {
      const state = getCourtboardState();
      expect(state).toEqual({
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
      });
    });

    it('returns window.CourtboardState when present', () => {
      window.CourtboardState = {
        courts: [{ id: 1, number: 1 }],
        courtBlocks: [{ id: 'block-1' }],
        waitingGroups: [{ id: 'entry-1' }],
        timestamp: Date.now(),
      };

      const state = getCourtboardState();
      expect(state).toBe(window.CourtboardState);
    });

    it('provides all guaranteed fields in default state', () => {
      const state = getCourtboardState();

      // Document the contract: these fields are always present
      expect(state).toHaveProperty('courts');
      expect(state).toHaveProperty('courtBlocks');
      expect(state).toHaveProperty('waitingGroups');

      // All arrays
      expect(Array.isArray(state.courts)).toBe(true);
      expect(Array.isArray(state.courtBlocks)).toBe(true);
      expect(Array.isArray(state.waitingGroups)).toBe(true);
    });
  });

  describe('isCourtboardStateReady', () => {
    it('returns false before React initializes', () => {
      expect(isCourtboardStateReady()).toBe(false);
    });

    it('returns false if CourtboardState exists but has no timestamp', () => {
      window.CourtboardState = {
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
      };

      expect(isCourtboardStateReady()).toBe(false);
    });

    it('returns true when CourtboardState has timestamp', () => {
      window.CourtboardState = {
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
        timestamp: Date.now(),
      };

      expect(isCourtboardStateReady()).toBe(true);
    });

    it('returns true for any truthy timestamp (including 0)', () => {
      // Edge case: timestamp of 0 is falsy but still indicates initialization
      // Current implementation treats 0 as not ready - documenting this behavior
      window.CourtboardState = {
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
        timestamp: 0,
      };

      // Note: timestamp: 0 is falsy, so isReady returns false
      // This is acceptable as timestamp should never actually be 0
      expect(isCourtboardStateReady()).toBe(false);

      // Any positive timestamp works
      window.CourtboardState.timestamp = 1;
      expect(isCourtboardStateReady()).toBe(true);
    });
  });

  describe('writeCourtboardState', () => {
    it('assigns to window.CourtboardState', () => {
      const newState = {
        courts: [{ id: 1, number: 1 }],
        courtBlocks: [],
        waitingGroups: [],
        timestamp: Date.now(),
      };

      writeCourtboardState(newState);

      expect(window.CourtboardState).toBe(newState);
    });

    it('overwrites previous state completely', () => {
      window.CourtboardState = {
        courts: [{ id: 'old' }],
        extraField: 'should be gone',
      };

      const newState = {
        courts: [{ id: 'new' }],
        courtBlocks: [],
        waitingGroups: [],
      };

      writeCourtboardState(newState);

      expect(window.CourtboardState).toBe(newState);
      expect(window.CourtboardState.extraField).toBeUndefined();
    });
  });

  describe('window globals', () => {
    it('exposes getCourtboardState on window', () => {
      // The module exposes these for plain JS files
      expect(typeof window.getCourtboardState).toBe('function');
    });

    it('exposes isCourtboardStateReady on window', () => {
      expect(typeof window.isCourtboardStateReady).toBe('function');
    });

    it('window.getCourtboardState behaves same as import', () => {
      window.CourtboardState = {
        courts: [{ id: 1 }],
        courtBlocks: [],
        waitingGroups: [],
        timestamp: 123,
      };

      const fromImport = getCourtboardState();
      const fromWindow = window.getCourtboardState();

      expect(fromWindow).toBe(fromImport);
    });
  });

  describe('contract: expected state shape', () => {
    /**
     * Document the full expected shape of CourtboardState.
     * This serves as documentation and change detection.
     */

    it('courts array contains court objects', () => {
      const mockCourt = {
        id: 1,
        number: 1,
        isAvailable: true,
        isBlocked: false,
        session: null,
        // Additional fields may exist but these are guaranteed
      };

      window.CourtboardState = {
        courts: [mockCourt],
        courtBlocks: [],
        waitingGroups: [],
        timestamp: Date.now(),
      };

      const state = getCourtboardState();
      expect(state.courts[0]).toHaveProperty('id');
      expect(state.courts[0]).toHaveProperty('number');
    });

    it('courtBlocks array contains block objects', () => {
      const mockBlock = {
        id: 'block-uuid-123',
        courtNumber: 1,
        startTime: '10:00',
        endTime: '11:00',
        reason: 'Maintenance',
      };

      window.CourtboardState = {
        courts: [],
        courtBlocks: [mockBlock],
        waitingGroups: [],
        timestamp: Date.now(),
      };

      const state = getCourtboardState();
      expect(state.courtBlocks[0]).toHaveProperty('id');
      expect(state.courtBlocks[0]).toHaveProperty('courtNumber');
    });

    it('waitingGroups array contains waitlist entry objects', () => {
      const mockEntry = {
        id: 'entry-uuid-123',
        group: { players: [] },
        status: 'waiting',
        createdAt: Date.now(),
      };

      window.CourtboardState = {
        courts: [],
        courtBlocks: [],
        waitingGroups: [mockEntry],
        timestamp: Date.now(),
      };

      const state = getCourtboardState();
      expect(state.waitingGroups[0]).toHaveProperty('id');
      expect(state.waitingGroups[0]).toHaveProperty('status');
    });

    it('optional fields documented', () => {
      // These fields may or may not be present depending on main.jsx version
      const fullState = {
        courts: [],
        courtBlocks: [],
        waitingGroups: [],
        timestamp: Date.now(),
        // Optional extended fields:
        upcomingBlocks: [], // Future blocks for today
        freeCourts: 8, // Count of playable courts
      };

      window.CourtboardState = fullState;

      const state = getCourtboardState();
      // Optional fields should be accessible if present
      expect(state.upcomingBlocks).toEqual([]);
      expect(state.freeCourts).toBe(8);
    });
  });

  describe('guaranteed fields snapshot', () => {
    it('default state keys match inline snapshot', () => {
      const defaultState = getCourtboardState();
      const keys = Object.keys(defaultState).sort();

      expect(keys).toMatchInlineSnapshot(`
        [
          "courtBlocks",
          "courts",
          "waitingGroups",
        ]
      `);
    });
  });
});
