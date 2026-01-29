import { useEffect } from 'react';

// Import shared utilities from @lib
import {
  STORAGE as STORAGE_SHARED,
  readJSON as _sharedReadJSON,
  getEmptyData as _sharedGetEmptyData,
  getCourtBlockStatus as _sharedGetCourtBlockStatus,
  TENNIS_CONFIG as _sharedTennisConfig,
  TennisBusinessLogic,
} from '@lib';

// Import API config for mobile detection
import { API_CONFIG } from '../../lib/apiConfig.js';

// Import Domain engagement helpers
import { findEngagementByMemberId, getEngagementMessage } from '../../lib/domain/engagement.js';

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
  dataStore = window.Tennis?.DataStore || null;
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

  // ===== HELPER FUNCTIONS (defined before hooks that need them) =====

  // Get court data (synchronous for React renders)
  const getCourtData = () => {
    return data;
  };

  // Clear any pending success reset timer
  const clearSuccessResetTimer = () => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
      successResetTimerRef.current = null;
    }
  };

  // Mark user as typing (for timeout handling)
  const markUserTyping = () => {
    setIsUserTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 3000);
  };

  // Helper to get courts occupied for clearing
  function getCourtsOccupiedForClearing() {
    const reactData = getCourtData();
    const courts = reactData.courts || [];

    const clearableCourts = courts
      .filter((c) => {
        if (c.session || c.isOccupied) {
          if (c.isBlocked) return false;
          return true;
        }
        return false;
      })
      .map((c) => c.number)
      .sort((a, b) => a - b);

    return clearableCourts;
  }

  // Duplicate guard helpers
  function __normalizeName(n) {
    return (n?.name ?? n?.fullName ?? n?.playerName ?? n ?? '')
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function guardAddPlayerEarly(getBoardData, player) {
    const memberId = player?.memberId || player?.id;
    const board = getBoardData() || {};

    if (DEBUG) {
      console.log('[guardAddPlayerEarly] Checking player:', player);
      console.log('[guardAddPlayerEarly] memberId:', memberId);
    }

    const engagement = findEngagementByMemberId(board, memberId);

    if (!engagement) return true;

    if (engagement.kind === 'waitlist') {
      const courts = Array.isArray(board?.courts) ? board.courts : [];
      const unoccupiedCount = courts.filter((c) => c.isAvailable).length;
      const overtimeCount = courts.filter((c) => c.isOvertime).length;
      const totalAvailable = unoccupiedCount > 0 ? unoccupiedCount : overtimeCount;
      const maxAllowedPosition = totalAvailable >= 2 ? 2 : 1;

      if (engagement.waitlistPosition <= maxAllowedPosition) {
        return true;
      }
    }

    if (typeof window !== 'undefined' && window.Tennis?.UI?.toast) {
      window.Tennis.UI.toast(getEngagementMessage(engagement));
    }
    return false;
  }

  function guardAgainstGroupDuplicate(player, playersArray) {
    const R = typeof window !== 'undefined' ? window.Tennis?.Domain?.roster : null;
    const nm = R?.normalizeName
      ? R.normalizeName(player?.name || player || '')
      : __normalizeName(player);
    const pid = player?.memberId || null;

    return !playersArray.some((p) => {
      if (pid && p?.memberId) {
        return p.memberId === pid;
      }
      const pName = R?.normalizeName ? R.normalizeName(p?.name || p || '') : __normalizeName(p);
      return pName === nm;
    });
  }

  // ===== DOMAIN HOOKS MODULE (WP5.9.6.4) =====
  const domain = useRegistrationDomainHooks({
    backend,
    CONSTANTS,
    setCurrentScreen,
    showSuccess,
    justAssignedCourt: null, // Not available yet at this point
    isMobile: API_CONFIG.IS_MOBILE,
    toast: typeof window !== 'undefined' ? window.Tennis?.UI?.toast : undefined,
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

// --- Robust validation wrapper: always returns { ok, errors[] }
function validateGroupCompat(players, guests) {
  const W =
    typeof window !== 'undefined'
      ? window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist || null
      : null;
  const norm = (ok, errs) => ({
    ok: !!ok,
    errors: Array.isArray(errs) ? errs : errs ? [errs] : [],
  });

  // 1) Prefer domain-level validator if available
  try {
    if (W && typeof W.validateGroup === 'function') {
      const out = W.validateGroup({ players, guests });
      if (out && (typeof out.ok === 'boolean' || Array.isArray(out.errors))) {
        return norm(out.ok, out.errors);
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (_e) {
    // fall through to local rules
  }

  // 2) Local minimal validator (matches club rules)
  // - At least 1 named player or guest
  // - Guests is a non-negative integer
  // - Total size 1–4 (singles/doubles max 4)

  // Count guests by isGuest flag in players array
  const guestRowCount = Array.isArray(players)
    ? players.filter((p) => p && p.isGuest === true).length
    : 0;

  // Parse the separate guests field
  const gVal = Number.isFinite(guests) ? guests : parseInt(guests || 0, 10);

  // Count non-guest players
  const namedPlayers = Array.isArray(players)
    ? players.filter((p) => p && !p.isGuest && String(p?.name ?? p ?? '').trim())
    : [];
  const namedCount = namedPlayers.length;

  const errs = [];
  if (namedCount < 1 && Math.max(guestRowCount, gVal) < 1) errs.push('Enter at least one player.');
  if (!Number.isFinite(gVal) || gVal < 0) errs.push('Guests must be 0 or more.');

  // Effective guest count is the MAX of the two representations (not the sum),
  // so we never double-count a guest.
  const effectiveGuestCount = Math.max(guestRowCount, Math.max(0, gVal));

  // Final effective size
  const totalSize = namedCount + effectiveGuestCount;

  if (totalSize < 1) errs.push('Group size must be at least 1.');
  if (totalSize > 4) errs.push('Maximum group size is 4.');

  return norm(errs.length === 0, errs);
}
