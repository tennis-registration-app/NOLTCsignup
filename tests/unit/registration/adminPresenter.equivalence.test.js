/**
 * AdminScreen Presenter Equivalence Test
 *
 * Proves that buildAdminModel + buildAdminActions produce
 * IDENTICAL props to the legacy AdminRoute destructuring.
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
import { useRegistrationHandlers } from '../../../src/registration/appHandlers/useRegistrationHandlers.js';
import {
  buildAdminModel,
  buildAdminActions,
} from '../../../src/registration/router/presenters/adminPresenter.js';

/**
 * Legacy AdminRoute prop mapping — VERBATIM from AdminRoute.jsx
 * This is the source of truth we're testing against.
 */
function legacyAdminScreenProps(app, handlers) {
  // Destructure from app (verbatim from AdminRoute)
  const { state, setters, alert, blockAdmin, waitlistAdmin, adminPriceFeedback, CONSTANTS } = app;
  const { currentTime, courtToMove, ballPriceInput } = state;
  const { setCourtToMove, setBallPriceInput } = setters;
  const { showAlert, alertMessage, showAlertMessage } = alert;
  const {
    showBlockModal,
    setShowBlockModal,
    selectedCourtsToBlock,
    setSelectedCourtsToBlock,
    blockMessage,
    setBlockMessage,
    blockStartTime,
    setBlockStartTime,
    blockEndTime,
    setBlockEndTime,
    blockingInProgress,
    setBlockingInProgress,
    onCancelBlock,
    onBlockCreate,
    getCourtBlockStatus,
  } = blockAdmin;
  const { waitlistMoveFrom, setWaitlistMoveFrom, onReorderWaitlist } = waitlistAdmin;
  const { priceError, setPriceError, showPriceSuccess, setShowPriceSuccess } = adminPriceFeedback;

  // Destructure from handlers (verbatim from AdminRoute)
  const {
    getCourtData,
    handleClearAllCourts,
    handleAdminClearCourt,
    handleMoveCourt,
    handleClearWaitlist,
    handleRemoveFromWaitlist,
    handlePriceUpdate,
    handleExitAdmin,
  } = handlers;

  const adminData = getCourtData();

  return {
    // Data
    data: adminData,
    currentTime,
    // Alert state (read only)
    showAlert,
    alertMessage,
    // Block modal state
    showBlockModal,
    setShowBlockModal,
    selectedCourtsToBlock,
    setSelectedCourtsToBlock,
    blockMessage,
    setBlockMessage,
    blockStartTime,
    setBlockStartTime,
    blockEndTime,
    setBlockEndTime,
    blockingInProgress,
    setBlockingInProgress,
    // Move state
    courtToMove,
    setCourtToMove,
    waitlistMoveFrom,
    setWaitlistMoveFrom,
    // Price state
    ballPriceInput,
    setBallPriceInput,
    priceError,
    setPriceError,
    showPriceSuccess,
    setShowPriceSuccess,
    // Callbacks
    onClearAllCourts: handleClearAllCourts,
    onClearCourt: handleAdminClearCourt,
    onCancelBlock,
    onBlockCreate,
    onMoveCourt: handleMoveCourt,
    onClearWaitlist: handleClearWaitlist,
    onRemoveFromWaitlist: handleRemoveFromWaitlist,
    onReorderWaitlist,
    onPriceUpdate: handlePriceUpdate,
    onExit: handleExitAdmin,
    showAlertMessage,
    // Utilities
    getCourtBlockStatus,
    CONSTANTS,
  };
}

/**
 * Presenter-based prop mapping
 */
function presenterAdminScreenProps(app, handlers) {
  return {
    ...buildAdminModel(app, handlers),
    ...buildAdminActions(app, handlers),
  };
}

/**
 * Minimal component to capture both hooks' results.
 */
function HookCapture({ onResult }) {
  const app = useRegistrationAppState({ isMobileView: false });
  const handlers = useRegistrationHandlers({ app });

  // Capture immediately during first render
  if (onResult._captured === undefined) {
    onResult._captured = { app, handlers };
    onResult({ app, handlers });
  }

  return null;
}

/**
 * Helper to render hooks and capture results.
 */
function captureHookResults() {
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

describe('AdminScreen presenter equivalence', () => {
  let app;
  let handlers;
  let legacy;
  let presenter;

  beforeAll(async () => {
    const result = await captureHookResults();
    app = result.app;
    handlers = result.handlers;
    legacy = legacyAdminScreenProps(app, handlers);
    presenter = presenterAdminScreenProps(app, handlers);
  });

  it('captures hooks successfully', () => {
    expect(app).not.toBeNull();
    expect(handlers).not.toBeNull();
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
      if (typeof legacy[key] === 'function') {
        // Functions must be reference-equal
        expect(presenter[key]).toBe(legacy[key]);
      } else {
        // Data must be deep-equal
        expect(presenter[key]).toEqual(legacy[key]);
      }
    }
  });

  it('all expected props are present', () => {
    const expectedProps = [
      // Data
      'data',
      'currentTime',
      // Alert state
      'showAlert',
      'alertMessage',
      // Block modal state
      'showBlockModal',
      'setShowBlockModal',
      'selectedCourtsToBlock',
      'setSelectedCourtsToBlock',
      'blockMessage',
      'setBlockMessage',
      'blockStartTime',
      'setBlockStartTime',
      'blockEndTime',
      'setBlockEndTime',
      'blockingInProgress',
      'setBlockingInProgress',
      // Move state
      'courtToMove',
      'setCourtToMove',
      'waitlistMoveFrom',
      'setWaitlistMoveFrom',
      // Price state
      'ballPriceInput',
      'setBallPriceInput',
      'priceError',
      'setPriceError',
      'showPriceSuccess',
      'setShowPriceSuccess',
      // Callbacks
      'onClearAllCourts',
      'onClearCourt',
      'onCancelBlock',
      'onBlockCreate',
      'onMoveCourt',
      'onClearWaitlist',
      'onRemoveFromWaitlist',
      'onReorderWaitlist',
      'onPriceUpdate',
      'onExit',
      'showAlertMessage',
      // Utilities
      'getCourtBlockStatus',
      'CONSTANTS',
    ];

    for (const prop of expectedProps) {
      expect(presenter).toHaveProperty(prop);
    }
    expect(Object.keys(presenter).length).toBe(expectedProps.length);
  });
});
