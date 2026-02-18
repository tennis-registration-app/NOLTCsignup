/**
 * GroupScreen Presenter Equivalence Test
 *
 * Proves that buildGroupModel + buildGroupActions produce
 * IDENTICAL props to the legacy GroupRoute destructuring.
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

vi.mock('../../../src/lib/backend/index.js', () => ({
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
  buildGroupModel,
  buildGroupActions,
} from '../../../src/registration/router/presenters/groupPresenter.js';

/**
 * Legacy GroupRoute prop mapping — VERBATIM from GroupRoute.jsx
 * This is the source of truth we're testing against.
 */
function legacyGroupScreenProps(app, handlers) {
  // Destructure from app (verbatim from GroupRoute)
  const {
    state,
    groupGuest,
    memberIdentity,
    derived,
    alert,
    timeout,
    mobile,
    search,
    CONSTANTS,
  } = app;
  const { data, showAddPlayer, isAssigning, isJoiningWaitlist, availableCourts } = state;
  const { courtSelection } = data;
  const {
    currentGroup,
    showGuestForm,
    guestName,
    guestSponsor,
    showGuestNameError,
    showSponsorError,
    handleRemovePlayer,
    handleSelectSponsor,
    handleCancelGuest,
  } = groupGuest;
  const { memberNumber, frequentPartners, frequentPartnersLoading } = memberIdentity;
  const { isMobileView } = derived;
  const { showAlert, alertMessage } = alert;
  const { showTimeoutWarning } = timeout;
  const { mobileFlow, preselectedCourt } = mobile;
  const {
    searchInput,
    showSuggestions,
    effectiveSearchInput,
    addPlayerSearch,
    showAddPlayerSuggestions,
    effectiveAddPlayerSearch,
    getAutocompleteSuggestions,
    handleGroupSearchChange,
    handleGroupSearchFocus,
    handleAddPlayerSearchChange,
    handleAddPlayerSearchFocus,
  } = search;

  // Destructure from handlers (verbatim from GroupRoute)
  const {
    handleGroupSuggestionClick,
    handleAddPlayerSuggestionClick,
    handleToggleAddPlayer,
    handleToggleGuestForm,
    handleGuestNameChange,
    handleAddGuest,
    addFrequentPartner,
    handleGroupSelectCourt,
    handleGroupJoinWaitlist,
    handleGroupGoBack,
    resetForm,
    isPlayerAlreadyPlaying,
    sameGroup,
  } = handlers;

  return {
    // Data
    data,
    currentGroup,
    memberNumber,
    availableCourts,
    courtSelection,
    frequentPartners,
    frequentPartnersLoading,
    // UI state
    showAlert,
    alertMessage,
    showTimeoutWarning,
    isMobileView,
    // Mobile flow
    mobileFlow,
    preselectedCourt,
    // Search state
    searchInput,
    showSuggestions,
    effectiveSearchInput,
    // Add player state
    showAddPlayer,
    addPlayerSearch,
    showAddPlayerSuggestions,
    effectiveAddPlayerSearch,
    // Guest form state
    showGuestForm,
    guestName,
    guestSponsor,
    showGuestNameError,
    showSponsorError,
    // Callbacks
    onSearchChange: handleGroupSearchChange,
    onSearchFocus: handleGroupSearchFocus,
    onSuggestionClick: handleGroupSuggestionClick,
    onAddPlayerSearchChange: handleAddPlayerSearchChange,
    onAddPlayerSearchFocus: handleAddPlayerSearchFocus,
    onAddPlayerSuggestionClick: handleAddPlayerSuggestionClick,
    onToggleAddPlayer: handleToggleAddPlayer,
    onToggleGuestForm: handleToggleGuestForm,
    onRemovePlayer: handleRemovePlayer,
    onSelectSponsor: handleSelectSponsor,
    onGuestNameChange: handleGuestNameChange,
    onAddGuest: handleAddGuest,
    onCancelGuest: handleCancelGuest,
    onAddFrequentPartner: addFrequentPartner,
    onSelectCourt: handleGroupSelectCourt,
    isAssigning,
    onJoinWaitlist: handleGroupJoinWaitlist,
    joiningWaitlist: isJoiningWaitlist,
    onGoBack: handleGroupGoBack,
    onStartOver: resetForm,
    // Utilities
    getAutocompleteSuggestions,
    isPlayerAlreadyPlaying,
    sameGroup,
    CONSTANTS,
  };
}

/**
 * Presenter-based prop mapping
 */
function presenterGroupScreenProps(app, handlers) {
  return {
    ...buildGroupModel(app),
    ...buildGroupActions(app, handlers),
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

describe('GroupScreen presenter equivalence', () => {
  let app;
  let handlers;
  let legacy;
  let presenter;

  beforeAll(async () => {
    const result = await captureHookResults();
    app = result.app;
    handlers = result.handlers;
    legacy = legacyGroupScreenProps(app, handlers);
    presenter = presenterGroupScreenProps(app, handlers);
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
      'currentGroup',
      'memberNumber',
      'availableCourts',
      'courtSelection',
      'frequentPartners',
      'frequentPartnersLoading',
      // UI state
      'showAlert',
      'alertMessage',
      'showTimeoutWarning',
      'isMobileView',
      // Mobile flow
      'mobileFlow',
      'preselectedCourt',
      // Search state
      'searchInput',
      'showSuggestions',
      'effectiveSearchInput',
      // Add player state
      'showAddPlayer',
      'addPlayerSearch',
      'showAddPlayerSuggestions',
      'effectiveAddPlayerSearch',
      // Guest form state
      'showGuestForm',
      'guestName',
      'guestSponsor',
      'showGuestNameError',
      'showSponsorError',
      // Callbacks
      'onSearchChange',
      'onSearchFocus',
      'onSuggestionClick',
      'onAddPlayerSearchChange',
      'onAddPlayerSearchFocus',
      'onAddPlayerSuggestionClick',
      'onToggleAddPlayer',
      'onToggleGuestForm',
      'onRemovePlayer',
      'onSelectSponsor',
      'onGuestNameChange',
      'onAddGuest',
      'onCancelGuest',
      'onAddFrequentPartner',
      'onSelectCourt',
      'isAssigning',
      'onJoinWaitlist',
      'joiningWaitlist',
      'onGoBack',
      'onStartOver',
      // Utilities
      'getAutocompleteSuggestions',
      'isPlayerAlreadyPlaying',
      'sameGroup',
      'CONSTANTS',
    ];

    for (const prop of expectedProps) {
      expect(presenter).toHaveProperty(prop);
    }
    expect(Object.keys(presenter).length).toBe(expectedProps.length);
  });
});
