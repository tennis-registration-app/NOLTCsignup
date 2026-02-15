/**
 * CourtSelectionScreen Presenter Equivalence Test
 *
 * Proves that buildCourtModel produces IDENTICAL model props
 * to the legacy CourtRoute destructuring.
 *
 * NOTE: Only model props are tested. Handlers remain in route
 * due to their complexity and closure dependencies.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Mock all platform/window dependencies before importing hooks
vi.mock('../../../src/platform/windowBridge.js', () => ({
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

vi.mock('../../../src/platform/registerGlobals.js', () => ({
  setLoadDataGlobal: vi.fn(),
}));

vi.mock('../../../src/registration/backend/index.js', () => ({
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

vi.mock('../../../src/registration/services/index.js', () => ({
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

// Import hooks and presenter after mocks
import { useRegistrationAppState } from '../../../src/registration/appHandlers/useRegistrationAppState.js';
import { buildCourtModel } from '../../../src/registration/router/presenters/courtPresenter.js';

/**
 * Legacy CourtRoute model prop mapping — VERBATIM from CourtRoute.jsx
 * This is the source of truth we're testing against.
 * (Handlers excluded - only model props)
 */
function legacyCourtScreenModelProps(app, computed) {
  // Destructure from app (verbatim from CourtRoute)
  const { derived, groupGuest, state } = app;
  const { isMobileView } = derived;
  const { currentGroup } = groupGuest;
  const { hasWaitlistPriority, currentWaitlistEntryId } = state;

  return {
    // Computed values (from route)
    availableCourts: computed.availableCourts,
    showingOvertimeCourts: computed.showingOvertimeCourts,
    hasWaitingGroups: computed.hasWaitingGroups,
    waitingGroupsCount: computed.waitingGroupsCount,
    upcomingBlocks: computed.upcomingBlocks,
    // Direct state values
    currentGroup,
    isMobileView,
    hasWaitlistPriority,
    currentWaitlistEntryId,
  };
}

/**
 * Presenter-based model prop mapping
 */
function presenterCourtScreenModelProps(app, computed) {
  return buildCourtModel(app, computed);
}

/**
 * Minimal component to capture hook result.
 */
function HookCapture({ onResult }) {
  const app = useRegistrationAppState({ isMobileView: false });

  // Capture immediately during first render
  if (onResult._captured === undefined) {
    onResult._captured = app;
    onResult(app);
  }

  return null;
}

/**
 * Helper to render hook and capture result.
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

describe('CourtSelectionScreen presenter equivalence (model only)', () => {
  let app;
  let legacy;
  let presenter;

  // Mock computed values that would be calculated in the route
  const mockComputed = {
    availableCourts: [1, 3, 5],
    showingOvertimeCourts: false,
    hasWaitingGroups: true,
    waitingGroupsCount: 2,
    upcomingBlocks: [{ courtNumber: 2, startTime: '10:00', endTime: '11:00' }],
  };

  beforeAll(async () => {
    app = await captureHookResult();
    legacy = legacyCourtScreenModelProps(app, mockComputed);
    presenter = presenterCourtScreenModelProps(app, mockComputed);
  });

  it('captures hook successfully', () => {
    expect(app).not.toBeNull();
  });

  it('produces same keys', () => {
    const legacyKeys = Object.keys(legacy).sort();
    const presenterKeys = Object.keys(presenter).sort();
    expect(presenterKeys).toEqual(legacyKeys);
  });

  it('produces same number of keys (no extras)', () => {
    expect(Object.keys(presenter).length).toBe(Object.keys(legacy).length);
  });

  it('produces identical values for each key', () => {
    for (const key of Object.keys(legacy)) {
      expect(presenter[key]).toEqual(legacy[key]);
    }
  });

  it('computed values are passed through correctly', () => {
    expect(presenter.availableCourts).toEqual(mockComputed.availableCourts);
    expect(presenter.showingOvertimeCourts).toBe(mockComputed.showingOvertimeCourts);
    expect(presenter.hasWaitingGroups).toBe(mockComputed.hasWaitingGroups);
    expect(presenter.waitingGroupsCount).toBe(mockComputed.waitingGroupsCount);
    expect(presenter.upcomingBlocks).toEqual(mockComputed.upcomingBlocks);
  });

  it('all expected model props are present', () => {
    const expectedProps = [
      // Computed values
      'availableCourts',
      'showingOvertimeCourts',
      'hasWaitingGroups',
      'waitingGroupsCount',
      'upcomingBlocks',
      // Direct state values
      'currentGroup',
      'isMobileView',
      'hasWaitlistPriority',
      'currentWaitlistEntryId',
    ];

    for (const prop of expectedProps) {
      expect(presenter).toHaveProperty(prop);
    }
    expect(Object.keys(presenter).length).toBe(expectedProps.length);
  });
});
