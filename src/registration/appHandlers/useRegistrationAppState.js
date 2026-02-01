import { useEffect } from 'react';

// Import shared utilities from @lib
import {
  getCourtBlockStatus as _sharedGetCourtBlockStatus,
  TENNIS_CONFIG as _sharedTennisConfig,
  TennisBusinessLogic,
} from '@lib';

// Import API config for mobile detection
import { API_CONFIG } from '../../lib/apiConfig.js';

// Platform bridge for window global access
import { getTennisDataStore, getTennisUI } from '../../platform/windowBridge.js';

// TennisBackend interface layer
import { createBackend } from '../backend/index.js';

// Overtime eligibility policy
import { computeRegistrationCourtSelection } from '../../shared/courts/overtimeEligibility.js';

// Session timeout hook (WP5.7)
import { useSessionTimeout } from '../ui/timeout';

// UI State module (WP5.9.6.1)
import { useRegistrationUiState } from './state/useRegistrationUiState';

// Domain Hooks module (WP5.9.6.4)
import { useRegistrationDomainHooks } from './state/useRegistrationDomainHooks';

// Runtime module (WP5.9.6.2)
import { useRegistrationRuntime } from './state/useRegistrationRuntime';

// Data Layer module (WP5.9.6.3)
import { useRegistrationDataLayer } from './state/useRegistrationDataLayer';

// Derived values module (WP5.9.6.6b)
import { useRegistrationDerived } from './state/useRegistrationDerived';

// Helpers module (WP5.9.6.6c)
import { useRegistrationHelpers, validateGroupCompat } from './state/useRegistrationHelpers';

// Return object builder (WP5.9.6.6a)
import { buildRegistrationReturn } from './state/buildRegistrationReturn';

// Orchestration facade (WP5.5)
import {
  applyInactivityTimeoutOrchestrated,
  changeCourtOrchestrated,
  resetFormOrchestrated,
  handleSuggestionClickOrchestrated,
  handleAddPlayerSuggestionClickOrchestrated,
  sendGroupToWaitlistOrchestrated,
  assignCourtToGroupOrchestrated,
} from '../orchestration';

// Config
const TENNIS_CONFIG = _sharedTennisConfig;
const getCourtBlockStatus = _sharedGetCourtBlockStatus;

// Debug utilities
const DEBUG = false;
const dbg = (...args) => {
  if (DEBUG) console.log(...args);
};

// DataStore reference
let dataStore = null;
if (typeof window !== 'undefined') {
  dataStore = getTennisDataStore() || null;
}

// TennisBackend singleton instance
const backend = createBackend();

/**
 * useRegistrationAppState
 * Extracted from App.jsx — WP5.9.4
 *
 * Contains all state, effects, and hook initialization for the registration app.
 * This is the main state management hook that orchestrates all other hooks.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.isMobileView - Whether the app is in mobile view mode
 * @returns {Object} - All state, setters, refs, derived values, helpers, and hook results
 */
export function useRegistrationAppState({ isMobileView = false } = {}) {
  // ===== CONSTANTS =====
  const CONSTANTS = {
    ADMIN_CODE: TENNIS_CONFIG.ADMIN.ACCESS_CODE,
    MAX_PLAYERS: TENNIS_CONFIG.PLAYERS.MAX_PER_GROUP,
    MAX_PLAY_DURATION_MS: TENNIS_CONFIG.TIMING.MAX_PLAY_DURATION_MS,
    MAX_PLAY_DURATION_MIN: TENNIS_CONFIG.TIMING.MAX_PLAY_DURATION_MIN,
    TIMEOUT_WARNING_MIN: TENNIS_CONFIG.TIMING.TIMEOUT_WARNING_MIN,
    SESSION_TIMEOUT_MS: TENNIS_CONFIG.TIMING.SESSION_TIMEOUT_MS,
    SESSION_WARNING_MS: TENNIS_CONFIG.TIMING.SESSION_WARNING_MS,
    COURT_COUNT: TENNIS_CONFIG.COURTS.TOTAL_COUNT,
    CHANGE_COURT_TIMEOUT_SEC: TENNIS_CONFIG.TIMING.CHANGE_COURT_TIMEOUT_SEC,
    AUTO_RESET_SUCCESS_MS: TENNIS_CONFIG.TIMING.AUTO_RESET_SUCCESS_MS,
    ALERT_DISPLAY_MS: TENNIS_CONFIG.TIMING.ALERT_DISPLAY_MS,
    AUTO_RESET_CLEAR_MS: TENNIS_CONFIG.TIMING.AUTO_RESET_CLEAR_MS,
    DURATIONS: {
      SINGLES_MIN: TENNIS_CONFIG.TIMING.SINGLES_DURATION_MIN,
      DOUBLES_MIN: TENNIS_CONFIG.TIMING.DOUBLES_DURATION_MIN,
    },
    MEMBER_COUNT: 40,
    MEMBER_ID_START: 1000,
    MAX_AUTOCOMPLETE_RESULTS: TENNIS_CONFIG.DISPLAY.MAX_AUTOCOMPLETE_RESULTS,
    MAX_FREQUENT_PARTNERS: TENNIS_CONFIG.DISPLAY.MAX_FREQUENT_PARTNERS,
    MAX_WAITING_DISPLAY: TENNIS_CONFIG.DISPLAY.MAX_WAITING_DISPLAY,
    AVG_GAME_TIME_MIN: TENNIS_CONFIG.TIMING.AVG_GAME_TIME_MIN,
    POLL_INTERVAL_MS: TENNIS_CONFIG.TIMING.POLL_INTERVAL_MS,
    UPDATE_INTERVAL_MS: TENNIS_CONFIG.TIMING.UPDATE_INTERVAL_MS,
  };

  // ===== UI STATE MODULE (WP5.9.6.1) =====
  const ui = useRegistrationUiState({ CONSTANTS });
  // Destructure for internal use
  const {
    data,
    currentScreen,
    availableCourts,
    showSuccess,
    setData,
    setCurrentScreen,
    setAvailableCourts,
    setOperatingHours,
    setShowSuccess,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setCanChangeCourt,
    setIsTimeLimited,
    setShowAddPlayer,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setLastActivity,
    setCurrentTime,
    setCourtToMove,
    setHasWaitlistPriority,
    setCurrentWaitlistEntryId,
    setIsAssigning,
    setIsJoiningWaitlist,
    setBallPriceInput,
    setBallPriceCents,
    setIsUserTyping,
    setWaitlistPosition,
    setTimeLimitReason,
  } = ui;

  // ===== RUNTIME MODULE (WP5.9.6.2) =====
  // Provides refs and handles timer/CSS/interval effects
  const runtime = useRegistrationRuntime({
    setCurrentTime,
    setBallPriceCents,
    setBlockWarningMinutes: () => {}, // Will be set by domain hooks
    availableCourts,
    backend,
  });
  const { successResetTimerRef, typingTimeoutRef } = runtime;

  // ===== HELPERS MODULE (WP5.9.6.6c) =====
  const {
    getCourtData,
    clearSuccessResetTimer,
    markUserTyping,
    getCourtsOccupiedForClearing,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
  } = useRegistrationHelpers({
    data,
    setIsUserTyping,
    successResetTimerRef,
    typingTimeoutRef,
  });

  // ===== DOMAIN HOOKS MODULE (WP5.9.6.4) =====
  const domain = useRegistrationDomainHooks({
    backend,
    CONSTANTS,
    setCurrentScreen,
    showSuccess,
    justAssignedCourt: null, // Not available yet at this point
    isMobile: API_CONFIG.IS_MOBILE,
    toast: typeof window !== 'undefined' ? getTennisUI()?.toast : undefined,
    markUserTyping,
    getCourtData,
    showAlertMessage: null, // Will use internal showAlertMessage
  });
  // Destructure for internal use
  const {
    showAlertMessage,
    setJustAssignedCourt,
    setAssignedSessionId,
    setCurrentGroup,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,
    setSearchInput,
    setShowSuggestions,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    setHasAssignedCourt,
    setSelectedCourtToClear,
    setClearCourtStep,
    setMemberNumber,
    setCurrentMemberId,
    setPreselectedCourt,
    setApiMembers,
    currentMemberId,
    fetchFrequentPartners,
  } = domain;

  // Inactivity timeout exit sequence (must be defined before useSessionTimeout)
  function applyInactivityTimeoutExitSequence() {
    applyInactivityTimeoutOrchestrated({
      setCurrentGroup,
      setShowSuccess,
      setMemberNumber,
      setCurrentMemberId,
      setJustAssignedCourt,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setCanChangeCourt,
      setIsTimeLimited,
      setCurrentScreen,
      setAssignedSessionId,
      setCurrentWaitlistEntryId,
      setWaitlistPosition,
      setCourtToMove,
      setHasAssignedCourt,
      setShowGuestForm,
      setGuestName,
      setGuestSponsor,
      setRegistrantStreak,
      setShowStreakModal,
      setStreakAcknowledged,
      setSearchInput,
      setShowSuggestions,
      setShowAddPlayer,
      setAddPlayerSearch,
      setShowAddPlayerSuggestions,
      setHasWaitlistPriority,
      setSelectedCourtToClear,
      setClearCourtStep,
      setIsChangingCourt,
      setWasOvertimeCourt,
      clearSuccessResetTimer,
    });
  }

  // Session timeout hook (WP5.7)
  const { showTimeoutWarning } = useSessionTimeout({
    currentScreen,
    setLastActivity,
    showAlertMessage,
    onTimeout: applyInactivityTimeoutExitSequence,
  });

  // ===== DERIVED VALUES MODULE (WP5.9.6.6b) =====
  const derived = useRegistrationDerived({
    data,
    availableCourts,
    CONSTANTS,
    isMobileView,
  });

  // ===== DATA LAYER MODULE (WP5.9.6.3) =====
  // Provides getDataService, loadData and handles board subscription
  const dataLayer = useRegistrationDataLayer({
    backend,
    setData,
    setAvailableCourts,
    setOperatingHours,
    setApiMembers,
    data,
    computeRegistrationCourtSelection,
  });
  const { loadData } = dataLayer;

  // ===== USE EFFECTS =====
  // Note: Most effects are now handled by Runtime and DataLayer modules

  // Load admin settings when entering admin screen
  useEffect(() => {
    const loadAdminSettings = async () => {
      if (currentScreen === 'admin') {
        try {
          const settings = await dataStore?.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY);
          if (settings) {
            const parsed = settings || {};
            setBallPriceInput(
              (parsed.tennisBallPrice || TENNIS_CONFIG.PRICING.TENNIS_BALLS).toFixed(2)
            );
          } else {
            setBallPriceInput(TENNIS_CONFIG.PRICING.TENNIS_BALLS.toFixed(2));
          }
        } catch (_error) {
          setBallPriceInput(TENNIS_CONFIG.PRICING.TENNIS_BALLS.toFixed(2));
        }
      }
    };
    loadAdminSettings();
  }, [currentScreen]);

  // Mobile Bridge Integration
  useEffect(() => {
    if (typeof window !== 'undefined' && window.RegistrationUI) {
      window.RegistrationUI.setSelectedCourt = (courtNumber) => {
        console.log('Mobile: Setting selected court to', courtNumber);
        setPreselectedCourt(courtNumber);
      };

      window.RegistrationUI.startRegistration = (courtNumber) => {
        console.log('Mobile: Starting registration for court', courtNumber);
        setCurrentScreen('group', 'mobileStartRegistration');
        requestAnimationFrame(() => {
          const input =
            document.querySelector('#mobile-group-search-input') ||
            document.querySelector('#main-search-input') ||
            document.querySelector('[data-role="player-input"]') ||
            document.querySelector('#playerNameInput') ||
            document.querySelector('input[type="text"]');
          if (input) {
            input.focus({ preventScroll: true });
            try {
              const v = input.value || '';
              input.setSelectionRange(v.length, v.length);
            } catch {
              /* setSelectionRange not supported */
            }
          }
        });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch frequent partners when entering group screen
  useEffect(() => {
    if (currentScreen === 'group' && currentMemberId) {
      fetchFrequentPartners(currentMemberId);
    }
  }, [currentScreen, currentMemberId, fetchFrequentPartners]);

  // Expose loadData for tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.loadData = loadData;
    }
  }, [loadData]);

  // ===== GROUP HELPERS (WP5.9.6.6a2) =====
  const helpers = {
    markUserTyping,
    getCourtData,
    clearSuccessResetTimer,
    getDataService: dataLayer.getDataService,
    loadData,
    applyInactivityTimeoutExitSequence,
    getCourtsOccupiedForClearing,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
  };

  // ===== RETURN ALL STATE AND HELPERS =====
  return buildRegistrationReturn({
    ui,
    domain,
    runtime,
    dataLayer,
    helpers,
    derived,
    timeout: { showTimeoutWarning },
    backend,
    dataStore,
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,
    TennisBusinessLogic,
    dbg,
    DEBUG,
    getCourtBlockStatus,
    computeRegistrationCourtSelection,
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,
    validateGroupCompat,
  });
}
