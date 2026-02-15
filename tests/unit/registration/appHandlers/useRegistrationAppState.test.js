/**
 * useRegistrationAppState Contract Test
 *
 * Freezes the public contract of useRegistrationAppState.
 * Changes to the return shape will fail this test, requiring
 * explicit acknowledgment via snapshot update.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Mock all platform/window dependencies before importing the hook
vi.mock('../../../../src/platform/windowBridge.js', () => ({
  getTennisDataStore: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  }),
  getTennisUI: () => ({
    toast: vi.fn(),
  }),
  getTennisDomain: () => ({
    time: {
      durationForGroupSize: (size) => (size <= 2 ? 60 : 90),
    },
  }),
  getUI: () => null,
}));

vi.mock('../../../../src/platform/registerGlobals.js', () => ({
  setLoadDataGlobal: vi.fn(),
}));

vi.mock('../../../../src/registration/backend/index.js', () => ({
  createBackend: () => ({
    queries: {
      subscribeToBoardChanges: vi.fn(() => () => {}),
      refresh: vi.fn().mockResolvedValue(undefined),
      getBoard: vi.fn().mockResolvedValue({ courts: [], waitlist: [] }),
    },
    commands: {
      assignCourtWithPlayers: vi.fn().mockResolvedValue({ ok: true }),
      assignFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      joinWaitlistWithPlayers: vi.fn().mockResolvedValue({ ok: true }),
    },
    directory: {
      getAllMembers: vi.fn().mockResolvedValue([]),
      getFrequentPartners: vi.fn().mockResolvedValue([]),
    },
    admin: {
      clearAllCourts: vi.fn().mockResolvedValue({ ok: true }),
      removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
      createBlock: vi.fn().mockResolvedValue({ ok: true }),
    },
  }),
}));

vi.mock('../../../../src/registration/services/index.js', () => ({
  getTennisService: () => ({
    loadInitialData: vi.fn().mockResolvedValue({ courts: [], waitlist: [] }),
  }),
}));

// Mock @lib
vi.mock('@lib', () => ({
  getCourtBlockStatus: vi.fn().mockResolvedValue({ isBlocked: false }),
  TENNIS_CONFIG: {
    ADMIN: { ACCESS_CODE: '9999' },
    PLAYERS: { MAX_PER_GROUP: 4 },
    TIMING: {
      MAX_PLAY_DURATION_MS: 5400000,
      MAX_PLAY_DURATION_MIN: 90,
      TIMEOUT_WARNING_MIN: 2,
      SESSION_TIMEOUT_MS: 120000,
      SESSION_WARNING_MS: 30000,
      CHANGE_COURT_TIMEOUT_SEC: 30,
      AUTO_RESET_SUCCESS_MS: 5000,
      ALERT_DISPLAY_MS: 3000,
      AUTO_RESET_CLEAR_MS: 5000,
      SINGLES_DURATION_MIN: 60,
      DOUBLES_DURATION_MIN: 90,
      AVG_GAME_TIME_MIN: 75,
      POLL_INTERVAL_MS: 5000,
      UPDATE_INTERVAL_MS: 1000,
    },
    COURTS: { TOTAL_COUNT: 8 },
    DISPLAY: {
      MAX_AUTOCOMPLETE_RESULTS: 10,
      MAX_FREQUENT_PARTNERS: 5,
      MAX_WAITING_DISPLAY: 10,
    },
    PRICING: { TENNIS_BALLS: 5.0 },
    STORAGE: { SETTINGS_KEY: 'tennis_settings' },
    DEVICES: { ADMIN_ID: 'admin-device-001' },
  },
  TennisBusinessLogic: {},
}));

// Import the hook after mocks are set up
import { useRegistrationAppState } from '../../../../src/registration/appHandlers/useRegistrationAppState.js';

/**
 * Minimal component to capture hook result.
 * Since renderHook isn't available, we use a component
 * that captures the hook result via callback.
 */
function HookCapture({ onResult }) {
  const result = useRegistrationAppState({ isMobileView: false });

  // Capture immediately during first render
  if (onResult._captured === undefined) {
    onResult._captured = result;
    onResult(result);
  }

  return null;
}

/**
 * Helper to render hook and capture result.
 * Uses jsdom + React 18 createRoot.
 */
function captureHookResult() {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const callback = (result) => {
      resolve(result);
    };

    const root = createRoot(container);
    root.render(React.createElement(HookCapture, { onResult: callback }));
  });
}

describe('useRegistrationAppState contract', () => {
  let result;

  beforeAll(async () => {
    // Capture the hook result once for all tests
    result = await captureHookResult();
  });

  it('captures hook result', () => {
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
  });

  it('top-level keys are stable', () => {
    const keys = Object.keys(result).sort();
    expect(keys).toEqual([
      'API_CONFIG',
      'CONSTANTS',
      'DEBUG',
      'TENNIS_CONFIG',
      'TennisBusinessLogic',
      'adminPriceFeedback',
      'alert',
      'assignCourtToGroupOrchestrated',
      'blockAdmin',
      'changeCourtOrchestrated',
      'clearCourtFlow',
      'computeRegistrationCourtSelection',
      'courtAssignment',
      'dbg',
      'derived',
      'groupGuest',
      'guestCounterHook',
      'handleAddPlayerSuggestionClickOrchestrated',
      'handleSuggestionClickOrchestrated',
      'helpers',
      'memberIdentity',
      'mobile',
      'refs',
      'resetFormOrchestrated',
      'search',
      'sendGroupToWaitlistOrchestrated',
      'services',
      'setters',
      'state',
      'streak',
      'timeout',
      'validateGroupCompat',
      'waitlistAdmin',
    ]);
    // Guard against duplicates
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('type map is stable', () => {
    const typeMap = {};
    for (const [key, val] of Object.entries(result)) {
      if (val === null) typeMap[key] = 'null';
      else if (Array.isArray(val)) typeMap[key] = 'array';
      else if (typeof val === 'function') typeMap[key] = 'function';
      else typeMap[key] = typeof val;
    }
    expect(typeMap).toEqual({
      state: 'object',
      setters: 'object',
      refs: 'object',
      derived: 'object',
      helpers: 'object',
      services: 'object',
      alert: 'object',
      adminPriceFeedback: 'object',
      guestCounterHook: 'object',
      timeout: 'object',
      search: 'object',
      courtAssignment: 'object',
      clearCourtFlow: 'object',
      mobile: 'object',
      blockAdmin: 'object',
      waitlistAdmin: 'object',
      groupGuest: 'object',
      streak: 'object',
      memberIdentity: 'object',
      CONSTANTS: 'object',
      TENNIS_CONFIG: 'object',
      API_CONFIG: 'object',
      TennisBusinessLogic: 'object',
      dbg: 'function',
      DEBUG: 'boolean',
      computeRegistrationCourtSelection: 'function',
      assignCourtToGroupOrchestrated: 'function',
      sendGroupToWaitlistOrchestrated: 'function',
      handleSuggestionClickOrchestrated: 'function',
      handleAddPlayerSuggestionClickOrchestrated: 'function',
      changeCourtOrchestrated: 'function',
      resetFormOrchestrated: 'function',
      validateGroupCompat: 'function',
    });
  });

  it('critical groups are non-null objects with keys', () => {
    expect(typeof result.state).toBe('object');
    expect(result.state).not.toBeNull();
    expect(Object.keys(result.state).length).toBeGreaterThan(0);

    expect(typeof result.setters).toBe('object');
    expect(result.setters).not.toBeNull();
    expect(Object.keys(result.setters).length).toBeGreaterThan(0);

    expect(typeof result.derived).toBe('object');
    expect(typeof result.helpers).toBe('object');
    expect(typeof result.services).toBe('object');
  });

  it('orchestrators are functions', () => {
    expect(typeof result.assignCourtToGroupOrchestrated).toBe('function');
    expect(typeof result.sendGroupToWaitlistOrchestrated).toBe('function');
    expect(typeof result.resetFormOrchestrated).toBe('function');
    expect(typeof result.changeCourtOrchestrated).toBe('function');
    expect(typeof result.handleSuggestionClickOrchestrated).toBe('function');
    expect(typeof result.handleAddPlayerSuggestionClickOrchestrated).toBe('function');
  });
});
