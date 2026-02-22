/**
 * Handler Test Harness
 *
 * Renders React hooks via manual createRoot pattern (no @testing-library/react).
 * Matches the approach in useRegistrationAppState.test.js.
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { vi } from 'vitest';

// ============================================
// A) renderHandlerHook — render any hook, capture result
// ============================================

/**
 * Renders a React hook inside a minimal component using createRoot.
 * Returns { result, unmount } where result.current holds the hook's
 * latest return value. Callers MUST call unmount() in afterEach.
 *
 * @param {Function} hookFn - Zero-arg function that calls the hook, e.g. () => useCourtHandlers(deps)
 * @returns {Promise<{ result: { current: any }, unmount: () => void }>}
 */
export async function renderHandlerHook(hookFn) {
  const result = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function HookCapture() {
    result.current = hookFn();
    return null;
  }

  await act(async () => {
    root.render(React.createElement(HookCapture));
  });

  const unmount = () => {
    root.unmount();
    container.remove();
  };

  return { result, unmount };
}

// ============================================
// B) Deep merge utility
// ============================================

/**
 * Deep merge two objects. Arrays are replaced, not concatenated.
 * Target values are overwritten by source values at each level.
 */
function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// ============================================
// C) createBaseDeps — shared mock foundation
// ============================================

/**
 * Creates base mock functions and state values reusable across
 * all handler test files. Returns { deps, mocks } where mocks
 * is a flat map for easy assertions and deps contains the nested
 * structure handlers expect.
 *
 * @param {object} [overrides] - Deep-merged into deps
 * @returns {{ deps: object, mocks: object }}
 */
export function createBaseDeps(overrides = {}) {
  // Shared mock functions
  const setCurrentScreen = vi.fn();
  const setShowSuccess = vi.fn();
  const showAlertMessage = vi.fn();
  const getCourtData = vi.fn().mockReturnValue({
    courts: [],
    waitlist: [],
    courtSelection: null,
    blocks: [],
    serverNow: new Date().toISOString(),
    operatingHours: [],
  });
  const markUserTyping = vi.fn();
  const resetForm = vi.fn();
  const clearSuccessResetTimer = vi.fn();
  const isPlayerAlreadyPlaying = vi.fn().mockReturnValue({ isPlaying: false });
  const dbg = vi.fn();

  const mocks = {
    setCurrentScreen,
    setShowSuccess,
    showAlertMessage,
    getCourtData,
    markUserTyping,
    resetForm,
    clearSuccessResetTimer,
    isPlayerAlreadyPlaying,
    dbg,
  };

  const deps = deepMerge(
    {
      state: {
        currentScreen: 'home',
        data: { courts: [], waitlist: [], operatingHours: [] },
        isAssigning: false,
        isJoiningWaitlist: false,
        currentWaitlistEntryId: null,
        canChangeCourt: false,
        operatingHours: [],
        replacedGroup: null,
      },
      setters: {
        setCurrentScreen,
        setShowSuccess,
      },
      helpers: {
        getCourtData,
        markUserTyping,
      },
      alert: {
        showAlertMessage,
      },
      core: {
        clearSuccessResetTimer,
        resetForm,
        isPlayerAlreadyPlaying,
      },
      dbg,
    },
    overrides
  );

  return { deps, mocks };
}

// ============================================
// D) createCourtHandlerDeps — exact shape for useCourtHandlers
// ============================================

/**
 * Builds the EXACT destructured parameter shape for useCourtHandlers.
 * All function values are vi.fn(). Nested mocks share references
 * with the flat mocks object.
 *
 * @param {object} [overrides] - Deep-merged into deps
 * @returns {{ deps: object, mocks: object }}
 */
export function createCourtHandlerDeps(overrides = {}) {
  // --- Setters (from setters slice) ---
  const setIsAssigning = vi.fn();
  const setCurrentWaitlistEntryId = vi.fn();
  const setHasWaitlistPriority = vi.fn();
  const setReplacedGroup = vi.fn();
  const setDisplacement = vi.fn();
  const setOriginalCourtData = vi.fn();
  const setIsChangingCourt = vi.fn();
  const setWasOvertimeCourt = vi.fn();
  const setCanChangeCourt = vi.fn();
  const setChangeTimeRemaining = vi.fn();
  const setIsTimeLimited = vi.fn();
  const setTimeLimitReason = vi.fn();
  const setShowSuccess = vi.fn();
  const setCurrentScreen = vi.fn();
  const setIsJoiningWaitlist = vi.fn();
  const setWaitlistPosition = vi.fn();

  // --- mobile slice ---
  const getMobileGeolocation = vi.fn().mockResolvedValue(null);
  const setGpsFailedPrompt = vi.fn();

  // --- groupGuest slice ---
  const setCurrentGroup = vi.fn();

  // --- courtAssignment slice ---
  const setJustAssignedCourt = vi.fn();
  const setAssignedSessionId = vi.fn();
  const setAssignedEndTime = vi.fn();
  const setHasAssignedCourt = vi.fn();

  // --- services slice ---
  const refresh = vi.fn().mockResolvedValue({ courts: [], waitlist: [] });
  const assignCourtWithPlayers = vi.fn().mockResolvedValue({ ok: true });
  const assignFromWaitlist = vi.fn().mockResolvedValue({ ok: true });
  const joinWaitlistWithPlayers = vi.fn().mockResolvedValue({ ok: true, data: { waitlist: { id: 'entry-1', position: 1 } } });
  const endSession = vi.fn().mockResolvedValue({ ok: true });
  const cancelWaitlist = vi.fn().mockResolvedValue({ ok: true });
  const deferWaitlistEntryCmd = vi.fn().mockResolvedValue({ ok: true });
  const undoOvertimeTakeover = vi.fn().mockResolvedValue({ ok: true });
  const restoreSession = vi.fn().mockResolvedValue({ ok: true });
  const moveCourt = vi.fn().mockResolvedValue({ ok: true });

  // --- helpers slice ---
  const getCourtData = vi.fn().mockReturnValue({
    courts: [],
    waitlist: [],
    courtSelection: null,
    blocks: [],
    serverNow: new Date().toISOString(),
    operatingHours: [],
  });

  // --- blockAdmin slice ---
  const getCourtBlockStatus = vi.fn().mockReturnValue(null);

  // --- alert slice ---
  const showAlertMessage = vi.fn();

  // --- refs slice ---
  const successResetTimerRef = { current: null };

  // --- core slice ---
  const clearSuccessResetTimer = vi.fn();
  const resetForm = vi.fn();
  const isPlayerAlreadyPlaying = vi.fn().mockReturnValue({ isPlaying: false });

  // --- orchestrators ---
  const assignCourtToGroupOrchestrated = vi.fn().mockResolvedValue(undefined);
  const changeCourtOrchestrated = vi.fn();
  const sendGroupToWaitlistOrchestrated = vi.fn().mockResolvedValue(undefined);
  const validateGroupCompat = vi.fn().mockReturnValue({ ok: true, errors: [] });

  // --- config/debug ---
  const dbg = vi.fn();

  // Flat mocks for assertions
  const mocks = {
    // setters
    setIsAssigning,
    setCurrentWaitlistEntryId,
    setHasWaitlistPriority,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setCanChangeCourt,
    setChangeTimeRemaining,
    setIsTimeLimited,
    setTimeLimitReason,
    setShowSuccess,
    setCurrentScreen,
    setIsJoiningWaitlist,
    setWaitlistPosition,
    // mobile
    getMobileGeolocation,
    setGpsFailedPrompt,
    // groupGuest
    setCurrentGroup,
    // courtAssignment
    setJustAssignedCourt,
    setAssignedSessionId,
    setAssignedEndTime,
    setHasAssignedCourt,
    // services
    refresh,
    assignCourtWithPlayers,
    assignFromWaitlist,
    joinWaitlistWithPlayers,
    endSession,
    cancelWaitlist,
    deferWaitlistEntryCmd,
    undoOvertimeTakeover,
    restoreSession,
    moveCourt,
    // helpers
    getCourtData,
    // blockAdmin
    getCourtBlockStatus,
    // alert
    showAlertMessage,
    // refs
    successResetTimerRef,
    // core
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
    // orchestrators
    assignCourtToGroupOrchestrated,
    changeCourtOrchestrated,
    sendGroupToWaitlistOrchestrated,
    validateGroupCompat,
    // debug
    dbg,
  };

  const deps = deepMerge(
    {
      state: {
        data: { courts: [], waitlist: [], operatingHours: [] },
        isAssigning: false,
        currentWaitlistEntryId: null,
        canChangeCourt: false,
        isJoiningWaitlist: false,
        operatingHours: [],
        replacedGroup: null,
      },
      setters: {
        setIsAssigning,
        setCurrentWaitlistEntryId,
        setHasWaitlistPriority,
        setReplacedGroup,
        setDisplacement,
        setOriginalCourtData,
        setIsChangingCourt,
        setWasOvertimeCourt,
        setCanChangeCourt,
        setChangeTimeRemaining,
        setIsTimeLimited,
        setTimeLimitReason,
        setShowSuccess,
        setCurrentScreen,
        setIsJoiningWaitlist,
        setWaitlistPosition,
      },
      mobile: {
        mobileFlow: false,
        preselectedCourt: null,
        getMobileGeolocation,
        setGpsFailedPrompt,
      },
      groupGuest: {
        currentGroup: [],
        setCurrentGroup,
      },
      courtAssignment: {
        justAssignedCourt: null,
        setJustAssignedCourt,
        setAssignedSessionId,
        setAssignedEndTime,
        setHasAssignedCourt,
      },
      services: {
        backend: {
          queries: { refresh },
          commands: {
            assignCourtWithPlayers,
            assignFromWaitlist,
            joinWaitlistWithPlayers,
            endSession,
            cancelWaitlist,
            deferWaitlistEntry: deferWaitlistEntryCmd,
            undoOvertimeTakeover,
            restoreSession,
            moveCourt,
          },
        },
      },
      helpers: {
        getCourtData,
      },
      blockAdmin: {
        getCourtBlockStatus,
      },
      alert: {
        showAlertMessage,
      },
      refs: {
        successResetTimerRef,
      },
      assignCourtToGroupOrchestrated,
      changeCourtOrchestrated,
      sendGroupToWaitlistOrchestrated,
      validateGroupCompat,
      dbg,
      CONSTANTS: {
        MAX_PLAYERS: 4,
        MIN_PLAYERS: 2,
        COURT_COUNT: 8,
        INACTIVITY_TIMEOUT_MS: 120000,
        AUTO_RESET_SUCCESS_MS: 5000,
        ALERT_DISPLAY_MS: 3000,
        CHANGE_COURT_TIMEOUT_SEC: 30,
      },
      API_CONFIG: {
        DEVICE_TYPE: 'kiosk',
        IS_MOBILE: false,
      },
      core: {
        clearSuccessResetTimer,
        resetForm,
        isPlayerAlreadyPlaying,
      },
    },
    overrides
  );

  return { deps, mocks };
}

// ============================================
// E) createGroupHandlerDeps — exact shape for useGroupHandlers
// ============================================

/**
 * Builds the EXACT destructured parameter shape for useGroupHandlers.
 * All function values are vi.fn(). Nested mocks share references
 * with the flat mocks object.
 *
 * @param {object} [overrides] - Deep-merged into deps
 * @returns {{ deps: object, mocks: object }}
 */
export function createGroupHandlerDeps(overrides = {}) {
  // --- groupGuest slice ---
  const setCurrentGroup = vi.fn();

  // --- streak slice ---
  const setRegistrantStreak = vi.fn();
  const setStreakAcknowledged = vi.fn();
  const setShowStreakModal = vi.fn();

  // --- search slice ---
  const setSearchInput = vi.fn();
  const setShowSuggestions = vi.fn();
  const setAddPlayerSearch = vi.fn();
  const setShowAddPlayerSuggestions = vi.fn();

  // --- memberIdentity slice ---
  const setMemberNumber = vi.fn();
  const setCurrentMemberId = vi.fn();
  const fetchFrequentPartners = vi.fn();

  // --- setters slice ---
  const setCurrentScreen = vi.fn();
  const setShowAddPlayer = vi.fn();
  const setHasWaitlistPriority = vi.fn();
  const setShowSuccess = vi.fn();

  // --- alert slice ---
  const setAlertMessage = vi.fn();
  const setShowAlert = vi.fn();
  const showAlertMessage = vi.fn();

  // --- refs slice ---
  const successResetTimerRef = { current: null };

  // --- services slice ---
  const backend = {
    directory: {
      invalidateAccount: vi.fn(),
      getMembersByAccount: vi.fn().mockResolvedValue([]),
    },
  };

  // --- helpers slice ---
  const guardAddPlayerEarly = vi.fn().mockReturnValue(true);
  const guardAgainstGroupDuplicate = vi.fn().mockReturnValue(true);
  const getCourtData = vi.fn().mockReturnValue({
    courts: [],
    waitlist: [],
    courtSelection: null,
    blocks: [],
    serverNow: new Date().toISOString(),
    operatingHours: [],
  });

  // --- court slice (outputs from courtHandlers) ---
  const getAvailableCourts = vi.fn().mockReturnValue([1, 2, 3]);
  const saveCourtData = vi.fn().mockResolvedValue(true);
  const assignCourtToGroup = vi.fn().mockResolvedValue(undefined);
  const sendGroupToWaitlist = vi.fn().mockResolvedValue(undefined);

  // --- core slice ---
  const clearSuccessResetTimer = vi.fn();
  const resetForm = vi.fn();
  const isPlayerAlreadyPlaying = vi.fn().mockReturnValue({ isPlaying: false });

  // --- orchestrators ---
  const handleSuggestionClickOrchestrated = vi.fn().mockResolvedValue(undefined);
  const handleAddPlayerSuggestionClickOrchestrated = vi.fn().mockResolvedValue(undefined);

  const mocks = {
    // groupGuest
    setCurrentGroup,
    // streak
    setRegistrantStreak,
    setStreakAcknowledged,
    setShowStreakModal,
    // search
    setSearchInput,
    setShowSuggestions,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    // memberIdentity
    setMemberNumber,
    setCurrentMemberId,
    fetchFrequentPartners,
    // setters
    setCurrentScreen,
    setShowAddPlayer,
    setHasWaitlistPriority,
    setShowSuccess,
    // alert
    setAlertMessage,
    setShowAlert,
    showAlertMessage,
    // refs
    successResetTimerRef,
    // services
    backend,
    // helpers
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
    getCourtData,
    // court
    getAvailableCourts,
    saveCourtData,
    assignCourtToGroup,
    sendGroupToWaitlist,
    // core
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
    // orchestrators
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
  };

  const deps = deepMerge(
    {
      groupGuest: {
        currentGroup: [],
        setCurrentGroup,
      },
      derived: {
        memberDatabase: {},
      },
      mobile: {
        mobileFlow: false,
        preselectedCourt: null,
      },
      streak: {
        registrantStreak: 0,
        streakAcknowledged: false,
        setRegistrantStreak,
        setStreakAcknowledged,
        setShowStreakModal,
      },
      search: {
        setSearchInput,
        setShowSuggestions,
        setAddPlayerSearch,
        setShowAddPlayerSuggestions,
      },
      memberIdentity: {
        setMemberNumber,
        setCurrentMemberId,
        fetchFrequentPartners,
      },
      setters: {
        setCurrentScreen,
        setShowAddPlayer,
        setHasWaitlistPriority,
        setShowSuccess,
      },
      alert: {
        setAlertMessage,
        setShowAlert,
        showAlertMessage,
      },
      refs: {
        successResetTimerRef,
      },
      services: {
        backend,
      },
      helpers: {
        guardAddPlayerEarly,
        guardAgainstGroupDuplicate,
        getCourtData,
      },
      court: {
        getAvailableCourts,
        saveCourtData,
        assignCourtToGroup,
        sendGroupToWaitlist,
      },
      core: {
        clearSuccessResetTimer,
        resetForm,
        isPlayerAlreadyPlaying,
      },
      handleSuggestionClickOrchestrated,
      handleAddPlayerSuggestionClickOrchestrated,
      CONSTANTS: {
        MAX_PLAYERS: 4,
        MIN_PLAYERS: 2,
        COURT_COUNT: 8,
        INACTIVITY_TIMEOUT_MS: 120000,
        AUTO_RESET_SUCCESS_MS: 5000,
        ALERT_DISPLAY_MS: 3000,
        CHANGE_COURT_TIMEOUT_SEC: 30,
      },
    },
    overrides
  );

  return { deps, mocks };
}

// ============================================
// F) createGuestHandlerDeps — exact shape for useGuestHandlers
// ============================================

/**
 * Builds the EXACT destructured parameter shape for useGuestHandlers.
 *
 * @param {object} [overrides] - Deep-merged into deps
 * @returns {{ deps: object, mocks: object }}
 */
export function createGuestHandlerDeps(overrides = {}) {
  // --- groupGuest slice ---
  const setGuestName = vi.fn();
  const setGuestSponsor = vi.fn();
  const setShowGuestForm = vi.fn();
  const setShowGuestNameError = vi.fn();
  const setShowSponsorError = vi.fn();
  const setCurrentGroup = vi.fn();

  // --- guestCounterHook slice ---
  const incrementGuestCounter = vi.fn();

  // --- setters slice ---
  const setShowAddPlayer = vi.fn();

  // --- search slice ---
  const setShowAddPlayerSuggestions = vi.fn();
  const setAddPlayerSearch = vi.fn();

  // --- helpers slice ---
  const markUserTyping = vi.fn();
  const getCourtData = vi.fn().mockReturnValue({
    courts: [],
    waitlist: [],
    operatingHours: [],
  });
  const guardAddPlayerEarly = vi.fn().mockReturnValue(true);
  const guardAgainstGroupDuplicate = vi.fn().mockReturnValue(true);

  const mocks = {
    setGuestName,
    setGuestSponsor,
    setShowGuestForm,
    setShowGuestNameError,
    setShowSponsorError,
    setCurrentGroup,
    incrementGuestCounter,
    setShowAddPlayer,
    setShowAddPlayerSuggestions,
    setAddPlayerSearch,
    markUserTyping,
    getCourtData,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
  };

  const deps = deepMerge(
    {
      groupGuest: {
        guestName: '',
        setGuestName,
        guestSponsor: '',
        setGuestSponsor,
        showGuestForm: false,
        setShowGuestForm,
        setShowGuestNameError,
        setShowSponsorError,
        currentGroup: [],
        setCurrentGroup,
      },
      guestCounterHook: {
        guestCounter: 1,
        incrementGuestCounter,
      },
      memberIdentity: {
        memberNumber: '1234',
      },
      derived: {
        memberDatabase: {},
      },
      setters: {
        setShowAddPlayer,
      },
      search: {
        setShowAddPlayerSuggestions,
        setAddPlayerSearch,
      },
      helpers: {
        markUserTyping,
        getCourtData,
        guardAddPlayerEarly,
        guardAgainstGroupDuplicate,
      },
    },
    overrides
  );

  return { deps, mocks };
}

// ============================================
// G) createRegistrationAdminHandlerDeps — exact shape for useAdminHandlers (registration)
// ============================================

/**
 * Builds the EXACT destructured parameter shape for the registration
 * useAdminHandlers (src/registration/appHandlers/handlers/adminHandlers.js).
 * NOT to be confused with the admin app's useAdminHandlers.
 *
 * @param {object} [overrides] - Deep-merged into deps
 * @returns {{ deps: object, mocks: object }}
 */
export function createRegistrationAdminHandlerDeps(overrides = {}) {
  // --- services slice ---
  const backend = {
    commands: {
      clearAllCourts: vi.fn().mockResolvedValue({ ok: true }),
      moveCourt: vi.fn().mockResolvedValue({ ok: true }),
      clearWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
    },
  };
  const dataStore = {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
  };

  // --- alert slice ---
  const showAlertMessage = vi.fn();

  // --- helpers slice ---
  const getCourtData = vi.fn().mockReturnValue({
    courts: [],
    waitlist: [],
    operatingHours: [],
  });

  // --- setters slice ---
  const setCourtToMove = vi.fn();
  const setCurrentScreen = vi.fn();

  // --- search slice ---
  const setSearchInput = vi.fn();

  // --- adminPriceFeedback slice ---
  const setPriceError = vi.fn();
  const showPriceSuccessWithClear = vi.fn();

  // --- court slice (from courtHandlers) ---
  const clearCourt = vi.fn().mockResolvedValue(undefined);

  const mocks = {
    backend,
    dataStore,
    showAlertMessage,
    getCourtData,
    setCourtToMove,
    setCurrentScreen,
    setSearchInput,
    setPriceError,
    showPriceSuccessWithClear,
    clearCourt,
  };

  const deps = deepMerge(
    {
      services: {
        backend,
        dataStore,
      },
      alert: {
        showAlertMessage,
      },
      helpers: {
        getCourtData,
      },
      setters: {
        setCourtToMove,
        setCurrentScreen,
      },
      search: {
        setSearchInput,
      },
      state: {
        ballPriceInput: '',
      },
      adminPriceFeedback: {
        setPriceError,
        showPriceSuccessWithClear,
      },
      TENNIS_CONFIG: {
        STORAGE: {
          SETTINGS_KEY: 'tennisClubSettings',
        },
      },
      court: {
        clearCourt,
      },
    },
    overrides
  );

  return { deps, mocks };
}

// ============================================
// H) createNavigationHandlerDeps — exact shape for useNavigationHandlers
// ============================================

/**
 * Builds the EXACT destructured parameter shape for useNavigationHandlers.
 *
 * @param {object} [overrides] - Deep-merged into deps
 * @returns {{ deps: object, mocks: object }}
 */
export function createNavigationHandlerDeps(overrides = {}) {
  // --- setters slice ---
  const setShowAddPlayer = vi.fn();
  const setCurrentScreen = vi.fn();

  // --- groupGuest slice ---
  const setShowGuestForm = vi.fn();
  const setGuestName = vi.fn();
  const setGuestSponsor = vi.fn();
  const setShowGuestNameError = vi.fn();
  const setShowSponsorError = vi.fn();
  const setCurrentGroup = vi.fn();

  // --- memberIdentity slice ---
  const setMemberNumber = vi.fn();
  const setCurrentMemberId = vi.fn();

  // --- mobile slice ---
  const setCheckingLocation = vi.fn();
  const requestMobileReset = vi.fn();

  // --- clearCourtFlow slice ---
  const decrementClearCourtStep = vi.fn();

  // --- alert slice ---
  const showAlertMessage = vi.fn();

  const mocks = {
    setShowAddPlayer,
    setCurrentScreen,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    setCurrentGroup,
    setMemberNumber,
    setCurrentMemberId,
    setCheckingLocation,
    requestMobileReset,
    decrementClearCourtStep,
    showAlertMessage,
  };

  const deps = deepMerge(
    {
      state: {
        showAddPlayer: false,
        currentScreen: 'group',
      },
      setters: {
        setShowAddPlayer,
        setCurrentScreen,
      },
      groupGuest: {
        showGuestForm: false,
        setShowGuestForm,
        setGuestName,
        setGuestSponsor,
        setShowGuestNameError,
        setShowSponsorError,
        setCurrentGroup,
      },
      memberIdentity: {
        setMemberNumber,
        setCurrentMemberId,
      },
      mobile: {
        mobileFlow: false,
        setCheckingLocation,
        requestMobileReset,
      },
      clearCourtFlow: {
        clearCourtStep: 1,
        decrementClearCourtStep,
      },
      alert: {
        showAlertMessage,
      },
      TENNIS_CONFIG: {
        GEOLOCATION: {
          ENABLED: true,
          ERROR_MESSAGE: 'Location check failed',
        },
      },
    },
    overrides
  );

  return { deps, mocks };
}
