// Import shared utilities from @lib
import {
  getCourtBlockStatus as _sharedGetCourtBlockStatus,
  TENNIS_CONFIG as _sharedTennisConfig,
  TennisBusinessLogic,
} from '@lib';

// Import API config for mobile detection
import { API_CONFIG } from '../../lib/apiConfig';
import { logger } from '../../lib/logger';

// Platform bridge for window global access
import { toast as _toast } from '../../shared/utils/toast.js';
import { getDataStore as _getDataStore, TennisCourtDataStore } from '../../lib/TennisCourtDataStore';

// TennisBackend interface layer
import { createBackend } from '../../lib/backend/index';

// Overtime eligibility policy
import { computeRegistrationCourtSelection } from '../../shared/courts/overtimeEligibility.js';

// Session timeout hook
import { useSessionTimeout } from '../ui/timeout';

// UI State module
import { useRegistrationUiState } from './state/useRegistrationUiState';

// Domain Hooks module
import { useRegistrationDomainHooks } from './state/useRegistrationDomainHooks';

// Runtime module
import { useRegistrationRuntime } from './state/useRegistrationRuntime';

// Data Layer module
import { useRegistrationDataLayer } from './state/useRegistrationDataLayer';

// Derived values module
import { useRegistrationDerived } from './state/useRegistrationDerived';

// Helpers module
import { useRegistrationHelpers, validateGroupCompat } from './state/useRegistrationHelpers';

// Return object builder
import { buildRegistrationReturn } from './state/buildRegistrationReturn';

// Effects module
import { useRegistrationEffects } from './effects/useRegistrationEffects';

// Workflow context — provides per-flow state that resets via key-based remount
import { useWorkflowContext } from '../context/WorkflowProvider';

// Orchestration facade
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
const dbg = (...args: unknown[]) => {
  if (DEBUG) logger.debug('RegistrationAppState', ...(args as [string, ...unknown[]]));
};

// DataStore reference
let dataStore: TennisCourtDataStore | null = null;
if (typeof window !== 'undefined') {
  dataStore = _getDataStore() || null;
}

// TennisBackend singleton instance
const backend = createBackend();

/**
 * useRegistrationAppState
 * Extracted from App.jsx
 *
 * Contains all state, effects, and hook initialization for the registration app.
 * This is the main state management hook that orchestrates all other hooks.
 *
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.isMobileView] - Whether the app is in mobile view mode
 * @returns {Object} - All state, setters, refs, derived values, helpers, and hook results
 */
export function useRegistrationAppState({ isMobileView = false, resetWorkflow = () => {} }: { isMobileView?: boolean; resetWorkflow?: () => void } = {}) {
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

  // ===== WORKFLOW CONTEXT (per-flow state, resets on key bump) =====
  const workflow = useWorkflowContext();

  // ===== UI STATE MODULE (shell-owned only) =====
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
    setLastActivity,
    setCurrentTime,
    setBallPriceCents,
    setIsUserTyping,
  } = ui;

  // ===== RUNTIME MODULE =====
  // Provides refs and handles timer/CSS/interval effects
  const runtime = useRegistrationRuntime({
    setCurrentTime,
    setBallPriceCents,
    setBlockWarningMinutes: () => {}, // Will be set by domain hooks
    availableCourts: availableCourts as unknown as Parameters<typeof useRegistrationRuntime>[0]['availableCourts'],
    backend: backend as unknown as Parameters<typeof useRegistrationRuntime>[0]['backend'],
  });
  const { successResetTimerRef, typingTimeoutRef } = runtime;

  // ===== HELPERS MODULE =====
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

  // ===== DOMAIN HOOKS MODULE (shell-owned only) =====
  const domain = useRegistrationDomainHooks({
    backend,
    CONSTANTS,
    setCurrentScreen,
    showSuccess,
    justAssignedCourt: workflow.courtAssignment.justAssignedCourt,
    isMobile: API_CONFIG.IS_MOBILE,
    toast: /** @type {Function} */ (typeof window !== 'undefined' ? _toast : () => {}),
    markUserTyping,
    getCourtData,
    showAlertMessage: null, // Will use internal showAlertMessage
  });
  // Destructure for internal use
  const {
    showAlertMessage,
    setSearchInput,
    setShowSuggestions,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    setApiMembers,
  } = domain;
  // Workflow-owned fields come from context
  const { currentMemberId, fetchFrequentPartners } = workflow.memberIdentity;

  // Inactivity timeout exit sequence (must be defined before useSessionTimeout)
  // Workflow-owned state resets via key bump (resetWorkflow from App.jsx).
  // This function handles shell-level cleanup only.
  function applyInactivityTimeoutExitSequence() {
    applyInactivityTimeoutOrchestrated({
      setShowSuccess,
      setCurrentScreen,
      setSearchInput,
      setShowSuggestions,
      setAddPlayerSearch,
      setShowAddPlayerSuggestions,
      clearSuccessResetTimer,
      refresh: (() => backend.queries.refresh()) as unknown as Parameters<typeof applyInactivityTimeoutOrchestrated>[0]["refresh"],
    });
  }

  // Session timeout hook
  const { showTimeoutWarning } = useSessionTimeout({
    currentScreen,
    setLastActivity,
    showAlertMessage,
    onTimeout: applyInactivityTimeoutExitSequence,
  });

  // ===== DERIVED VALUES MODULE =====
  const derived = useRegistrationDerived({
    data,
    CONSTANTS,
    isMobileView,
  });

  // ===== DATA LAYER MODULE =====
  // Provides loadData and handles board subscription
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

  // ===== USE EFFECTS MODULE =====
  useRegistrationEffects({
    currentScreen,
    currentMemberId,
    dataStore,
    TENNIS_CONFIG,
    setBallPriceInput: ui.setBallPriceInput,
    setPreselectedCourt: domain.setPreselectedCourt,
    setCurrentScreen: ui.setCurrentScreen,
    fetchFrequentPartners,
    loadData,
  });

  // ===== GROUP HELPERS =====
  const helpers = {
    markUserTyping,
    getCourtData,
    clearSuccessResetTimer,
    loadData,
    applyInactivityTimeoutExitSequence,
    getCourtsOccupiedForClearing,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
  };

  // ===== RETURN ALL STATE AND HELPERS =====
  return buildRegistrationReturn({
    ui: ui as unknown as Parameters<typeof buildRegistrationReturn>[0]['ui'],
    domain: domain as unknown as Parameters<typeof buildRegistrationReturn>[0]['domain'],
    runtime,
    _dataLayer: dataLayer as unknown as Parameters<typeof buildRegistrationReturn>[0]['_dataLayer'],
    helpers: helpers as unknown as Parameters<typeof buildRegistrationReturn>[0]['helpers'],
    derived: derived as unknown as Parameters<typeof buildRegistrationReturn>[0]['derived'],
    timeout: { showTimeoutWarning },
    backend: backend as unknown as Parameters<typeof buildRegistrationReturn>[0]['backend'],
    dataStore,
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,
    TennisBusinessLogic: TennisBusinessLogic as unknown as Parameters<typeof buildRegistrationReturn>[0]['TennisBusinessLogic'],
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
    resetWorkflow,
  });
}
