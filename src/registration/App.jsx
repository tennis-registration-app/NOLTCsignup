// Registration App - Vite-bundled React
// Converted from inline Babel to ES module JSX
/* global Tennis */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Import shared utilities from @lib
// IMPORTANT: Import all @lib items in one import to avoid rollup circular dependency issues
import {
  STORAGE as STORAGE_SHARED,
  readJSON as _sharedReadJSON,
  getEmptyData as _sharedGetEmptyData,
  getCourtBlockStatus as _sharedGetCourtBlockStatus,
  TENNIS_CONFIG as _sharedTennisConfig,
  // Services (also from @lib)
  DataValidation,
  TennisBusinessLogic,
} from '@lib';

// Import registration-specific services
import { GeolocationService } from './services';

// Import API config for mobile detection
import { API_CONFIG } from '../lib/apiConfig.js';

// Import Domain engagement helpers
import { findEngagementByMemberId, getEngagementMessage } from '../lib/domain/engagement.js';

// toLegacyBoard removed - now using pure Domain Board directly

// Import extracted UI components
import { AlertDisplay, ToastHost, QRScanner } from './components';

// Import extracted screens and modals
import {
  HomeScreen,
  SuccessScreen,
  CourtSelectionScreen,
  ClearCourtScreen,
  AdminScreen,
  GroupScreen,
} from './screens';
// BlockWarningModal available in ./modals if needed

// Import custom hooks
// useDebounce now used internally by useMemberSearch hook
import { useMemberSearch } from './search/useMemberSearch.js';

// API Backend Integration
import { getTennisService } from './services/index.js';
// getRealtimeClient available in @lib/RealtimeClient.js if needed

// TennisBackend interface layer
import { createBackend } from './backend/index.js';
// DenialCodes available in ./backend/index.js if needed

// Overtime eligibility policy
import { computeRegistrationCourtSelection } from '../shared/courts/overtimeEligibility.js';

// Extracted admin operations
import {
  handleClearWaitlistOp,
  handleRemoveFromWaitlistOp,
  handleAdminClearCourtOp,
  handleClearAllCourtsOp,
  handleMoveCourtOp,
} from './handlers/adminOperations';

// Block admin hook (WP5.3 R3.3)
import { useBlockAdmin } from './blocks/useBlockAdmin';

// Waitlist admin hook (WP5.3 R4a.3)
import { useWaitlistAdmin } from './waitlist/useWaitlistAdmin';

// Group/Guest hook (WP5.3 R8a.3)
import { useGroupGuest } from './group/useGroupGuest';

// Streak hook (WP5.3 R8c.3)
import { useStreak } from './streak/useStreak';

// Member identity hook (WP5.3 R8b.3)
import { useMemberIdentity } from './memberIdentity/useMemberIdentity';

// Court assignment result hook (WP5.4 R9a-1.3)
import { useCourtAssignmentResult } from './court/useCourtAssignmentResult';

// Clear court flow hook (WP5.4 R9a-2.3)
import { useClearCourtFlow } from './court/useClearCourtFlow';

// Alert display hook (WP5.6 R6a-1)
import { useAlertDisplay } from './ui/alert';

// Admin price feedback hook (WP5.6 R6a-2)
import { useAdminPriceFeedback } from './ui/adminPriceFeedback';

// Guest counter hook (WP5.6 R6a-3)
import { useGuestCounter } from './ui/guestCounter';

// Session timeout hook (WP5.7)
import { useSessionTimeout } from './ui/timeout';

// Mobile flow controller hook (WP5.8)
import { useMobileFlowController } from './ui/mobile';

// Registration router (WP5.9.1)
import { RegistrationRouter } from './router';

// Orchestration facade (WP5.5)
import {
  changeCourtOrchestrated,
  resetFormOrchestrated,
  applyInactivityTimeoutOrchestrated,
  handleSuggestionClickOrchestrated,
  handleAddPlayerSuggestionClickOrchestrated,
  sendGroupToWaitlistOrchestrated,
  assignCourtToGroupOrchestrated,
} from './orchestration';

// TennisBackend singleton instance
const backend = createBackend();

// Utility functions available in ./utils if needed:
// normalizeName, findEngagementFor, validateGuestName, getCourtsOccupiedForClearing

// Global service aliases for backward compatibility with other scripts
window.Tennis = window.Tennis || {};
window.TennisBusinessLogic = window.TennisBusinessLogic || TennisBusinessLogic;
window.GeolocationService = window.GeolocationService || GeolocationService;

// Access window.APP_UTILS for backward compatibility
const U = window.APP_UTILS || {};

// === Shared Core Integration Flag ===
// USE_SHARED_CORE flag removed - always using shared core
const DEBUG = false; // Gate noisy logs
const dbg = (...args) => {
  if (DEBUG) console.log(...args);
};

// These will be populated from window.Tennis after modules load
const Storage = window.Tennis?.Storage;
let dataStore = window.Tennis?.DataStore || null;

// Storage helpers from shared module
const readJSON = _sharedReadJSON;
const getEmptyData = _sharedGetEmptyData;
const STORAGE = Storage?.KEYS || STORAGE_SHARED;

// --- Robust validation wrapper: always returns { ok, errors[] }
function validateGroupCompat(players, guests) {
  const W = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist || null;
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

// ---- Storage & Event keys: NOW IMPORTED FROM window.APP_UTILS ----
// REMOVED: STORAGE_ORIGINAL constant (no longer needed since USE_SHARED_CORE is always true)

// ---- Dev flag & assert (no UI change) ----
const DEV = typeof location !== 'undefined' && /localhost|127\.0\.0\.1/.test(location.host);
const assert = (cond, msg, obj) => {
  if (DEV && !cond) console.warn('ASSERT:', msg, obj || '');
};

// ============================================================
// Section: Data access & persistence
// ============================================================

// ---- TennisCourtDataStore: NOW IMPORTED FROM window.APP_UTILS ----
// REMOVED: local TennisCourtDataStore class (~96 lines)
// The class is now imported via destructuring at the top of the script

// Initialize DataStore using the shared class (dataStore already set via window.Tennis.DataStore above)

// Boot data assertion
const _bootData = U.readDataSafe ? U.readDataSafe() : readJSON(STORAGE.DATA) || getEmptyData();
assert(
  !_bootData || Array.isArray(_bootData.courts),
  'Expected data.courts array on boot',
  _bootData
);

// ---- TENNIS_CONFIG: NOW IMPORTED FROM window.APP_UTILS ----
// REMOVED: local TENNIS_CONFIG (~61 lines)
// The shared config includes all properties (COURTS, TIMING, DISPLAY, PLAYERS, STORAGE, ADMIN, PRICING, GEOLOCATION)
const TENNIS_CONFIG = _sharedTennisConfig;

// ---- Court Block Functions: NOW IMPORTED FROM window.APP_UTILS ----
// REMOVED: local getCourtBlockStatus (~28 lines) and getUpcomingBlockWarning (~59 lines)
// These functions are now imported via destructuring at the top of the script
const getCourtBlockStatus = _sharedGetCourtBlockStatus;

// Main TennisRegistration Component
const TennisRegistration = ({ isMobileView = window.IS_MOBILE_VIEW }) => {
  // Initialize data state
  const [data, setData] = useState(() => ({
    courts: Array(TENNIS_CONFIG.COURTS.TOTAL_COUNT).fill(null),
    waitlist: [],
    blocks: [],
    upcomingBlocks: [],
    recentlyCleared: [],
  }));

  // IMPORTANT: These state variables must be declared BEFORE any useEffect that references them
  // to avoid TDZ (Temporal Dead Zone) errors when the code is minified
  const [currentScreen, _setCurrentScreen] = useState('home');
  const setCurrentScreen = (screen, source = 'unknown') => {
    console.log(`[NAV] ${currentScreen} → ${screen} (from: ${source})`);
    console.trace('[NAV] Stack trace');
    _setCurrentScreen(screen);
  };
  const [availableCourts, setAvailableCourts] = useState([]);
  const [waitlistPosition, setWaitlistPosition] = useState(0); // Position from API response
  const [operatingHours, setOperatingHours] = useState(null); // Operating hours from API

  // Mobile flow state moved to useMobileFlowController hook (WP5.8)

  // Get the API data service
  const getDataService = useCallback(() => {
    return getTennisService({
      deviceId: 'a0000000-0000-0000-0000-000000000001',
      deviceType: 'kiosk',
    });
  }, []);

  // Load data from API (used for initial load and CTA state emission)
  const loadData = useCallback(async () => {
    try {
      const service = getDataService();
      const initialData = await service.loadInitialData();

      // Transform API data to legacy format
      const courts = initialData.courts || [];
      const waitlist = initialData.waitlist || [];

      const updatedData = {
        courts: courts,
        waitlist: waitlist,
        recentlyCleared: data.recentlyCleared || [],
      };

      setData(updatedData);

      // Store operating hours from API
      if (initialData.operatingHours) {
        setOperatingHours(initialData.operatingHours);
      }

      // Store API members for autocomplete search
      if (initialData.members && Array.isArray(initialData.members)) {
        setApiMembers(initialData.members);
      }

      // Compute court selection using centralized policy
      const selection = computeRegistrationCourtSelection(courts);
      const selectableCourts = selection.showingOvertimeCourts
        ? selection.fallbackOvertimeCourts
        : selection.primaryCourts;
      const selectableNumbers = selectableCourts.map((c) => c.number);
      setAvailableCourts(selectableNumbers);

      // CTA state is now derived via useMemo from data.waitlist and availableCourts
      // No cta:state event dispatch needed - React's reactivity handles updates
      console.log(
        '[Registration] Initial load complete, waitlist length:',
        initialData.waitlist?.length
      );

      return updatedData;
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using stale recentlyCleared to preserve state across refreshes
  }, [getDataService]);
  window.loadData = loadData; // expose for coalescer/tests

  // Debug: log whenever availableCourts changes
  useEffect(() => {
    console.log('🔄 availableCourts state changed:', availableCourts);
  }, [availableCourts]);

  // Cleanup success reset timer on unmount
  useEffect(() => {
    return () => {
      if (successResetTimerRef.current) {
        clearTimeout(successResetTimerRef.current);
        successResetTimerRef.current = null;
      }
    };
  }, []);

  // PHASE1C: Redundant - subscribeToBoardChanges handles initial fetch
  // useEffect(() => {
  //   loadData();
  // }, []);

  // Fetch ball price from API on mount (for SuccessScreen)
  useEffect(() => {
    const fetchBallPrice = async () => {
      try {
        const result = await backend.admin.getSettings();
        if (result.ok && result.settings?.ball_price_cents) {
          setBallPriceCents(result.settings.ball_price_cents);
        }
        if (result.ok && result.settings?.block_warning_minutes) {
          const blockWarnMin = parseInt(result.settings.block_warning_minutes, 10);
          if (blockWarnMin > 0) {
            setBlockWarningMinutes(blockWarnMin);
          }
        }
      } catch (error) {
        console.error('Failed to load ball price from API:', error);
      }
    };
    fetchBallPrice();
  }, []);

  // TennisBackend Real-time subscription
  useEffect(() => {
    console.log('[TennisBackend] Setting up board subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges((domainBoard) => {
      // PHASE2: Using pure Domain Board directly - toLegacyBoard removed
      const board = domainBoard;

      console.log('[TennisBackend] Board update received:', {
        serverNow: board.serverNow,
        courts: board.courts?.length,
        waitlist: board.waitlist?.length,
      });

      // Update courts and waitlist state (including blocks for availability calculations)
      setData((prev) => ({
        ...prev,
        courts: board.courts || [],
        waitlist: board.waitlist || [],
        blocks: board.blocks || [],
        upcomingBlocks: board.upcomingBlocks || [],
      }));

      // Update operating hours
      if (board.operatingHours) {
        setOperatingHours(board.operatingHours);
      }

      // Update available courts (for court selection UI)
      // Exclude blocked courts from selectable list
      const selectable = (board.courts || [])
        .filter((c) => (c.isAvailable || c.isOvertime) && !c.isBlocked)
        .map((c) => c.number);
      setAvailableCourts(selectable);

      // DEBUG: Log court block status for CTA debugging
      console.log(
        '[Registration CTA Debug] Courts from API:',
        board.courts?.map((c) => ({
          num: c.number,
          isBlocked: c.isBlocked,
          isAvailable: c.isAvailable,
          isOvertime: c.isOvertime,
          block: c.block ? { id: c.block.id, reason: c.block.reason } : null,
        }))
      );
      // CTA state is now derived via useMemo from data.waitlist and availableCourts
      // No cta:state event dispatch needed - React's reactivity handles updates
    });

    console.log('[TennisBackend] Board subscription active');

    return () => {
      console.log('[TennisBackend] Unsubscribing from board updates');
      unsubscribe();
    };
  }, []);

  // Load members for autocomplete moved to useMemberSearch hook (WP5.3 R5a.3)

  // CSS Performance Optimizations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Force GPU acceleration and optimize animations */
      .animate-pulse {
        will-change: opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      
      .animate-spin {
        will-change: transform;
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      
      /* Optimize transform animations */
      .transform {
        transition: transform 200ms ease-out;
        will-change: transform;
      }
      
      /* Replace transition-all with specific properties */
      .transition-all {
        transition: none !important;
      }
      
      /* Specific transitions for court displays */
      .court-transition {
        transition: background-color 200ms ease-out, 
                    border-color 200ms ease-out,
                    box-shadow 200ms ease-out;
      }
      
      /* Button optimizations */
      .button-transition {
        transition: background-color 150ms ease-out, 
                    transform 150ms ease-out;
        transform: translateZ(0);
      }
      
      .button-transition:hover {
        will-change: transform;
      }
      
      /* Optimize backdrop blur (expensive operation) */
      .backdrop-blur {
        transform: translateZ(0);
        will-change: backdrop-filter;
      }
      
      /* Reduce animation overhead for multiple pulsing elements */
      @media (prefers-reduced-motion: reduce) {
        .animate-pulse {
          animation: none;
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // PHASE1D: Court availability now handled by TennisBackend subscription

  // Auto-clear expired courts - disabled per policy
  // Players remain on-court until manual clear or bump
  // Auto-clear now handled server-side via API

  // Historical Data Protection System - REMOVED
  // Previously backed up court game data to localStorage for analytics.
  // Now handled server-side via API session history.

  // REMOVED: Historical Data Restoration System
  // This was causing issues where cleared data would be automatically restored every 15 seconds.
  // We keep the Historical Data Protection System above for analytics purposes,
  // but we don't want to automatically restore cleared courts.

  // Block cleanup - REMOVED
  // Previously cleaned up expired blocks from localStorage weekly.
  // Now handled server-side — backend is authoritative for block state.

  // Constants
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

  // memberNumber moved to useMemberIdentity hook (WP5.3 R8b.3)
  // showAlert/alertMessage moved to useAlertDisplay hook (WP5.6 R6a-1)
  const { showAlert, alertMessage, setShowAlert, setAlertMessage, showAlertMessage } =
    useAlertDisplay({ alertDurationMs: CONSTANTS.ALERT_DISPLAY_MS });

  // Uncleared session tracking - moved to useStreak hook (WP5.3 R8c.3)
  // NOTE: availableCourts moved to top of component (line ~236) to avoid TDZ errors

  // Derive CTA state from data.waitlist and availableCourts using useMemo
  // This replaces the cta:state event-based approach with direct derivation
  const {
    firstWaitlistEntry,
    secondWaitlistEntry,
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
  } = useMemo(() => {
    // Transform waitlist entries to CTA format
    const normalizedWaitlist = (data.waitlist || []).map((entry) => ({
      id: entry.id,
      position: entry.position,
      groupType: entry.group?.type,
      joinedAt: entry.joinedAt,
      minutesWaiting: entry.minutesWaiting,
      names: (entry.group?.players || []).map((p) => p.displayName || p.name || 'Unknown'),
      players: entry.group?.players || [],
    }));

    const firstGroup = normalizedWaitlist[0] || null;
    const secondGroup = normalizedWaitlist[1] || null;
    const gateCount = availableCourts.length;

    const live1 = gateCount >= 1 && firstGroup !== null;
    const live2 = gateCount >= 2 && secondGroup !== null;

    // Build entry objects for SearchScreen
    const first = firstGroup
      ? { id: firstGroup.id, position: firstGroup.position ?? 1, players: firstGroup.players }
      : null;
    const second = secondGroup
      ? { id: secondGroup.id, position: secondGroup.position ?? 2, players: secondGroup.players }
      : null;

    return {
      firstWaitlistEntry: first,
      secondWaitlistEntry: second,
      canFirstGroupPlay: !!live1,
      canSecondGroupPlay: !!live2,
      firstWaitlistEntryData: first,
      secondWaitlistEntryData: second,
    };
  }, [data.waitlist, availableCourts]);
  const [showSuccess, setShowSuccess] = useState(false);
  // mobileCountdown moved to useMobileFlowController hook (WP5.8)
  // justAssignedCourt, assignedSessionId moved to useCourtAssignmentResult hook (WP5.4 R9a-1.3)
  const [replacedGroup, setReplacedGroup] = useState(null);
  const [displacement, setDisplacement] = useState(null);
  // Shape: { displacedSessionId, displacedCourtId, takeoverSessionId, restoreUntil } | null
  const [originalCourtData, setOriginalCourtData] = useState(null);
  const [canChangeCourt, setCanChangeCourt] = useState(false);
  const [changeTimeRemaining, setChangeTimeRemaining] = useState(
    CONSTANTS.CHANGE_COURT_TIMEOUT_SEC
  );
  const [isTimeLimited, setIsTimeLimited] = useState(false);
  const [timeLimitReason, setTimeLimitReason] = useState(null);
  // NOTE: currentScreen moved to top of component (line ~235) to avoid TDZ errors
  // searchInput, showSuggestions, addPlayerSearch, showAddPlayerSuggestions, apiMembers moved to useMemberSearch hook (WP5.3 R5a.3)
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  // selectedCourtToClear, clearCourtStep moved to useClearCourtFlow hook (WP5.4 R9a-2.3)
  const [isChangingCourt, setIsChangingCourt] = useState(false);
  const [, setWasOvertimeCourt] = useState(false); // Getter unused, setter used
  const [, setLastActivity] = useState(Date.now()); // Getter unused, setter used
  // showTimeoutWarning, timeoutTimerRef, warningTimerRef moved to useSessionTimeout hook (WP5.7)
  const { showTimeoutWarning } = useSessionTimeout({
    currentScreen,
    setLastActivity,
    showAlertMessage,
    onTimeout: applyInactivityTimeoutExitSequence,
  });
  const successResetTimerRef = useRef(null);
  // frequentPartnersCacheRef, frequentPartners, frequentPartnersLoading, currentMemberId
  // moved to useMemberIdentity hook (WP5.3 R8b.3)
  const [currentTime, setCurrentTime] = useState(new Date());
  const [courtToMove, setCourtToMove] = useState(null);
  // hasAssignedCourt moved to useCourtAssignmentResult hook (WP5.4 R9a-1.3)
  const [hasWaitlistPriority, setHasWaitlistPriority] = useState(false);
  const [currentWaitlistEntryId, setCurrentWaitlistEntryId] = useState(null);

  // waitlistMoveFrom moved to useWaitlistAdmin hook (WP5.3 R4a.3)
  // showGuestForm, guestName, guestSponsor, showGuestNameError, showSponsorError moved to useGroupGuest hook (WP5.3 R8a.3)
  // guestCounter moved to useGuestCounter hook (WP5.6 R6a-3)
  const { guestCounter, incrementGuestCounter } = useGuestCounter();
  // Block modal state moved to useBlockAdmin hook (WP5.3 R3.3)
  // isSearching moved to useMemberSearch hook (WP5.3 R5a.3)
  const [isAssigning, setIsAssigning] = useState(false); // Prevent double-submit during court assignment
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false); // Prevent double-submit during waitlist join

  // Admin panel state - moved to top level
  const [ballPriceInput, setBallPriceInput] = useState('');
  // showPriceSuccess/priceError moved to useAdminPriceFeedback hook (WP5.6 R6a-2)
  const {
    showPriceSuccess,
    priceError,
    setShowPriceSuccess,
    setPriceError,
    showPriceSuccessWithClear,
  } = useAdminPriceFeedback();

  // Ball price from API (in cents) - used by SuccessScreen
  const [ballPriceCents, setBallPriceCents] = useState(TENNIS_CONFIG.PRICING.TENNIS_BALLS * 100);
  // blockWarningMinutes moved to useBlockAdmin hook (WP5.3 R3.3)
  // checkingLocation, locationToken, showQRScanner, gpsFailedPrompt moved to useMobileFlowController hook (WP5.8)
  const [, setIsUserTyping] = useState(false); // Getter unused, setter used
  const typingTimeoutRef = useRef(null);

  // Debounce/derived search values moved to useMemberSearch hook (WP5.3 R5a.3)

  // CTA state is now derived via useMemo from data.waitlist and availableCourts
  // The cta:state event listener has been removed in favor of direct derivation

  // Helper function to get courts that can be cleared (occupied or overtime)
  function getCourtsOccupiedForClearing() {
    const reactData = getCourtData();
    const courts = reactData.courts || [];

    const clearableCourts = courts
      .filter((c) => {
        // Court has a session (is occupied) - Domain format
        if (c.session || c.isOccupied) {
          // Not blocked
          if (c.isBlocked) return false;
          return true;
        }
        return false;
      })
      .map((c) => c.number)
      .sort((a, b) => a - b);

    return clearableCourts;
  }

  // Helper function to mark user as typing
  const markUserTyping = () => {
    setIsUserTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 3000);
  };

  // Member search hook (WP5.3 R5a.3)
  const {
    // State
    searchInput,
    showSuggestions,
    addPlayerSearch,
    showAddPlayerSuggestions,
    isSearching,
    // Derived
    effectiveSearchInput,
    effectiveAddPlayerSearch,
    // Setters (for components that need them)
    setSearchInput,
    setShowSuggestions,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    setApiMembers,
    // Handlers
    handleGroupSearchChange,
    handleGroupSearchFocus,
    handleAddPlayerSearchChange,
    handleAddPlayerSearchFocus,
    getAutocompleteSuggestions,
    // Resets available: resetLeaderSearch, resetAddPlayerSearch, resetAllSearch
    // apiMembers and setApiMembers available if needed
  } = useMemberSearch({
    backend,
    setCurrentScreen,
    CONSTANTS,
    markUserTyping,
  });

  // Court assignment result hook (WP5.4 R9a-1.3)
  // NOTE: Must be initialized before useEffect at ~line 1100 that references justAssignedCourt
  const {
    justAssignedCourt,
    assignedSessionId,
    hasAssignedCourt,
    setJustAssignedCourt,
    setAssignedSessionId,
    setHasAssignedCourt,
    // resetCourtAssignmentResult available but not wired into reset functions yet
  } = useCourtAssignmentResult();

  // Clear court flow hook (WP5.4 R9a-2.3)
  const {
    selectedCourtToClear,
    clearCourtStep,
    setSelectedCourtToClear,
    setClearCourtStep,
    decrementClearCourtStep,
  } = useClearCourtFlow();

  // Mobile flow controller hook (WP5.8)
  const {
    mobileFlow,
    preselectedCourt,
    mobileMode,
    mobileCountdown,
    checkingLocation,
    locationToken,
    showQRScanner,
    gpsFailedPrompt,
    setMobileFlow,
    setPreselectedCourt,
    setMobileMode,
    setCheckingLocation,
    setLocationToken,
    setShowQRScanner,
    setGpsFailedPrompt,
    getMobileGeolocation,
    requestMobileReset,
    onQRScanToken,
    onQRScannerClose,
    openQRScanner,
    dismissGpsPrompt,
  } = useMobileFlowController({
    showSuccess,
    justAssignedCourt,
    backend,
    isMobile: API_CONFIG.IS_MOBILE,
    toast: window.Tennis?.UI?.toast,
    dbg,
    DEBUG,
  });

  // --- duplicate guard helpers (early-check on selection) ---
  function __normalizeName(n) {
    return (n?.name ?? n?.fullName ?? n?.playerName ?? n ?? '')
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function guardAddPlayerEarly(getBoardData, player) {
    // Get memberId from player (API members have id = memberId)
    const memberId = player?.memberId || player?.id;

    // Use current board state from getter
    const board = getBoardData() || {};

    if (DEBUG) {
      console.log('[guardAddPlayerEarly] Checking player:', player);
      console.log('[guardAddPlayerEarly] memberId:', memberId);
      console.log('[guardAddPlayerEarly] Board courts:', board.courts?.length);
    }

    // Use Domain engagement lookup (memberId-based, not name-based)
    const engagement = findEngagementByMemberId(board, memberId);

    if (DEBUG) {
      console.log('[guardAddPlayerEarly] Engagement found:', engagement);
    }

    if (!engagement) return true;

    // Check if waitlist member can register based on available courts
    if (engagement.kind === 'waitlist') {
      const courts = Array.isArray(board?.courts) ? board.courts : [];
      const unoccupiedCount = courts.filter((c) => c.isAvailable).length;
      const overtimeCount = courts.filter((c) => c.isOvertime).length;
      const totalAvailable = unoccupiedCount > 0 ? unoccupiedCount : overtimeCount;
      const maxAllowedPosition = totalAvailable >= 2 ? 2 : 1;

      if (engagement.waitlistPosition <= maxAllowedPosition) {
        return true; // Allow this waitlist member to register
      }
    }

    // Show toast with engagement message and block
    Tennis.UI.toast(getEngagementMessage(engagement));
    return false;
  }

  function guardAgainstGroupDuplicate(player, playersArray) {
    const R = window.Tennis?.Domain?.roster;
    const nm = R?.normalizeName
      ? R.normalizeName(player?.name || player || '')
      : __normalizeName(player);
    const pid = player?.memberId || null;

    return !playersArray.some((p) => {
      // Check by ID first if both have IDs
      if (pid && p?.memberId) {
        return p.memberId === pid;
      }
      // Fallback to name comparison
      const pName = R?.normalizeName ? R.normalizeName(p?.name || p || '') : __normalizeName(p);
      return pName === nm;
    });
  }

  // Wrapper function to check location before proceeding
  const checkLocationAndProceed = async (onSuccess) => {
    // Skip location check if disabled
    if (!TENNIS_CONFIG.GEOLOCATION.ENABLED) {
      console.log('⚠️ Geolocation check disabled for development');
      onSuccess();
      return;
    }

    setCheckingLocation(true);

    try {
      const locationResult = await GeolocationService.verifyAtClub();

      if (locationResult.success) {
        // Location verified, proceed with action
        onSuccess();
      } else {
        // Not at club
        showAlertMessage(locationResult.message);
      }
    } catch (error) {
      // Location check failed (timeout, permission denied, etc.)
      console.error('Location check failed:', error);
      showAlertMessage(TENNIS_CONFIG.GEOLOCATION.ERROR_MESSAGE);
    } finally {
      setCheckingLocation(false);
    }
  };

  // getMobileGeolocation moved to useMobileFlowController hook (WP5.8)

  // isSearching effect moved to useMemberSearch hook (WP5.3 R5a.3)

  // Load current ball price when entering admin screen
  useEffect(() => {
    const loadAdminSettings = async () => {
      if (currentScreen === 'admin') {
        try {
          const settings = await dataStore.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY);
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

  // Simplified member database - memoized to prevent re-creation on every render
  const memberDatabase = React.useMemo(() => {
    const db = {};
    for (let i = 1; i <= CONSTANTS.MEMBER_COUNT; i++) {
      const id = CONSTANTS.MEMBER_ID_START + i;
      const names = [
        'Novak Djokovic',
        'Carlos Alcaraz',
        'Jannik Sinner',
        'Daniil Medvedev',
        'Alexander Zverev',
        'Andrey Rublev',
        'Casper Ruud',
        'Hubert Hurkacz',
        'Taylor Fritz',
        'Alex de Minaur',
        'Iga Swiatek',
        'Aryna Sabalenka',
        'Coco Gauff',
        'Elena Rybakina',
        'Jessica Pegula',
        'Ons Jabeur',
        'Marketa Vondrousova',
        'Karolina Muchova',
        'Beatriz Haddad Maia',
        'Petra Kvitova',
        'Stefanos Tsitsipas',
        'Felix Auger-Aliassime',
        'Cameron Norrie',
        'Karen Khachanov',
        'Frances Tiafoe',
        'Tommy Paul',
        'Lorenzo Musetti',
        'Ben Shelton',
        'Nicolas Jarry',
        'Sebastian Korda',
        'Madison Keys',
        'Victoria Azarenka',
        'Daria Kasatkina',
        'Belinda Bencic',
        'Caroline Garcia',
        'Simona Halep',
        'Elina Svitolina',
        'Maria Sakkari',
        'Liudmila Samsonova',
        'Zheng Qinwen',
      ];

      db[id.toString()] = {
        familyMembers: [
          {
            id: id,
            name: names[i - 1] || `Player ${i}`,
            phone: `555-${String(i).padStart(4, '0')}`,
            ranking: ((i - 1) % 20) + 1,
            winRate: 0.5 + Math.random() * 0.4,
          },
        ],
        playingHistory: [],
        lastGame: null,
      };
    }
    return db;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- CONSTANTS.MEMBER_* are true constants, never change at runtime
  }, []);

  // Update current time every second for responsive overtime detection
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mobile Bridge Integration
  useEffect(() => {
    // Hook up mobile UI helpers
    if (window.RegistrationUI) {
      window.RegistrationUI.setSelectedCourt = (courtNumber) => {
        console.log('Mobile: Setting selected court to', courtNumber);
        // Store the court for assignment but don't navigate yet
        setPreselectedCourt(courtNumber);
      };

      window.RegistrationUI.startRegistration = (courtNumber) => {
        console.log('Mobile: Starting registration for court', courtNumber);
        // Navigate to group step and focus input
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setCurrentScreen is a logging wrapper, intentionally not memoized
  }, []);

  // Mobile message listener and success signal effects moved to useMobileFlowController hook (WP5.8)

  // PHASE1D: Court availability now handled by TennisBackend subscription

  // PHASE1D: Event listeners for localStorage removed - TennisBackend handles all updates

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // updateActivity function and timeout useEffect moved to useSessionTimeout hook (WP5.7)

  // showAlertMessage moved to useAlertDisplay hook (WP5.6 R6a-1)

  // Get court data using the data service (synchronous for React renders)
  // NOTE: Auto-timeout and cleanup now handled by API/server
  const getCourtData = () => {
    return data;
  };

  // Block admin hook (WP5.3 R3.3)
  const {
    // State values
    showBlockModal,
    blockingInProgress,
    selectedCourtsToBlock,
    blockMessage,
    blockStartTime,
    blockEndTime,
    blockWarningMinutes,
    // Setters
    setShowBlockModal,
    setSelectedCourtsToBlock,
    setBlockMessage,
    setBlockStartTime,
    setBlockEndTime,
    setBlockWarningMinutes,
    setBlockingInProgress,
    // Handlers
    onBlockCreate,
    onCancelBlock,
  } = useBlockAdmin({
    backend,
    showAlertMessage,
    getCourtData,
  });

  // Waitlist admin hook (WP5.3 R4a.3)
  const { waitlistMoveFrom, setWaitlistMoveFrom, onReorderWaitlist } = useWaitlistAdmin({
    getCourtData,
    showAlertMessage,
  });

  // Group/Guest hook (WP5.3 R8a.3)
  const {
    // State
    currentGroup,
    guestName,
    guestSponsor,
    showGuestForm,
    showGuestNameError,
    showSponsorError,
    // Setters (for selection handlers and other callers)
    setCurrentGroup,
    setGuestName,
    setGuestSponsor,
    setShowGuestForm,
    setShowGuestNameError,
    setShowSponsorError,
    // Handlers
    handleRemovePlayer,
    handleSelectSponsor,
    handleCancelGuest,
    // Resets (available but not wired into resetForm yet)
    // resetGuestForm,
    // resetGroup,
  } = useGroupGuest();

  // Streak hook (WP5.3 R8c.3)
  const {
    registrantStreak,
    showStreakModal,
    streakAcknowledged,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,
    // resetStreak available but not wired into reset functions yet
  } = useStreak();

  // Member identity hook (WP5.3 R8b.3)
  const {
    memberNumber,
    currentMemberId,
    frequentPartners,
    frequentPartnersLoading,
    setMemberNumber,
    setCurrentMemberId,
    // setFrequentPartners, setFrequentPartnersLoading used internally by hook
    fetchFrequentPartners,
    clearCache,
    // resetMemberIdentity, resetMemberIdentityWithCache available but not wired yet
  } = useMemberIdentity({ backend });

  // Save court data using the data service
  // @deprecated — localStorage persistence removed; API commands handle state
  const saveCourtData = async (_data) => {
    // TennisDataService.saveData removed — API is source of truth
    // Callers should migrate to TennisCommands for write operations
    console.warn('[saveCourtData] DEPRECATED: localStorage persistence removed. Use API commands.');
    return true; // Return success to avoid breaking callers during migration
  };

  // Get available courts (strict selectable API - single source of truth)
  const getAvailableCourts = (
    checkWaitlistPriority = true,
    _includeOvertimeIfChanging = false,
    excludeCourtNumber = null,
    dataOverride = null
  ) => {
    const Av = Tennis.Domain.availability || Tennis.Domain.Availability;
    if (!Av?.getSelectableCourtsStrict || !Av?.getFreeCourtsInfo) {
      console.warn('Availability functions not available');
      return [];
    }

    try {
      // Use API state by default, fall back to localStorage only if state not available
      const courtData = dataOverride || getCourtData();
      const data = courtData?.courts?.length > 0 ? courtData : Tennis.Storage.readDataSafe();
      const now = new Date();

      // Get blocks from the board data if available, otherwise localStorage
      const blocks =
        courtData?.blocks || Tennis.Storage.readJSON(Tennis.Storage.STORAGE.BLOCKS) || [];
      const wetSet = new Set();

      let selectable = [];

      if (checkWaitlistPriority) {
        // Waitlist priority mode: ONLY show truly free courts (no overtime fallback)
        const info = Av.getFreeCourtsInfo({ data, now, blocks, wetSet });
        selectable = info.free || [];
        dbg('Waitlist priority mode - free courts only:', selectable);
      } else {
        // Non-waitlist mode: use standard selectable logic (free first, then overtime fallback)
        selectable = Av.getSelectableCourtsStrict({ data, now, blocks, wetSet });
        dbg('Standard selectable courts:', selectable);
      }

      // Apply excludeCourtNumber filter if specified
      const filtered = excludeCourtNumber
        ? selectable.filter((n) => n !== excludeCourtNumber)
        : selectable;

      return filtered;
    } catch (error) {
      console.error('Error in getAvailableCourts:', error);
      return [];
    }
  };

  // tryAssignCourtToGroup - REMOVED (was unused, contained localStorage read)
  // Auto-assignment logic now handled via API-based court availability

  // Assign court (moved to orchestration layer - WP5.5)
  const assignCourtToGroup = async (courtNumber, selectableCountAtSelection = null) => {
    return assignCourtToGroupOrchestrated(courtNumber, selectableCountAtSelection, {
      // Read values
      isAssigning,
      mobileFlow,
      preselectedCourt,
      operatingHours,
      currentGroup,
      courts: data.courts,
      currentWaitlistEntryId,
      CONSTANTS,
      // Setters
      setIsAssigning,
      setCurrentWaitlistEntryId,
      setHasWaitlistPriority,
      setCurrentGroup,
      setJustAssignedCourt,
      setAssignedSessionId,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setHasAssignedCourt,
      setCanChangeCourt,
      setChangeTimeRemaining,
      setIsTimeLimited,
      setTimeLimitReason,
      setShowSuccess,
      setGpsFailedPrompt,
      // Services
      backend,
      // Helpers
      getCourtBlockStatus,
      getMobileGeolocation,
      showAlertMessage,
      validateGroupCompat,
      clearSuccessResetTimer,
      resetForm,
      successResetTimerRef,
      dbg,
      API_CONFIG,
    });
  };

  // Change court assignment (moved to orchestration layer - WP5.5)
  const changeCourt = () => {
    changeCourtOrchestrated({
      canChangeCourt,
      justAssignedCourt,
      replacedGroup,
      setOriginalCourtData,
      setShowSuccess,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setCurrentScreen,
    });
  };

  // Clear a court via TennisBackend
  async function clearViaService(courtNumber, clearReason) {
    // Get court UUID from court number
    const court = data.courts.find((c) => c.number === courtNumber);
    if (!court) {
      console.error('[clearViaService] Court not found for number:', courtNumber);
      return { success: false, error: 'Court not found' };
    }

    console.log('[clearViaService] Using TennisBackend for court:', court.id);

    try {
      const result = await backend.commands.endSession({
        courtId: court.id,
        reason: clearReason || 'completed',
      });

      // Map {ok, message} to {success, error} for compatibility
      return {
        success: result.ok,
        error: result.ok ? undefined : result.message,
      };
    } catch (error) {
      console.error('[clearViaService] Error:', error);
      return { success: false, error: error.message || 'Failed to clear court' };
    }
  }

  const clearCourt = async (courtNumber, clearReason = 'Cleared') => {
    console.log(
      `[Registration UI] clearCourt called for court ${courtNumber} with reason: ${clearReason}`
    );

    const res = await clearViaService(courtNumber, clearReason);
    if (!res?.success) {
      Tennis.UI.toast(res?.error || 'Failed to clear court');
      return;
    }
    console.log(`Court ${courtNumber} cleared successfully`);
    // success UI stays the same (thanks/close), no manual writes needed—
    // DataStore.set inside the service will emit both events.
  };

  // Send group to waitlist (moved to orchestration layer - WP5.5)
  const sendGroupToWaitlist = async (group) => {
    await sendGroupToWaitlistOrchestrated(group, {
      // Read values
      isJoiningWaitlist,
      currentGroup,
      mobileFlow,
      // Setters
      setIsJoiningWaitlist,
      setWaitlistPosition,
      setGpsFailedPrompt,
      // Services/helpers
      backend,
      getMobileGeolocation,
      validateGroupCompat,
      isPlayerAlreadyPlaying,
      showAlertMessage,
      API_CONFIG,
    });
  };

  // Clear any pending success reset timer
  const clearSuccessResetTimer = () => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
      successResetTimerRef.current = null;
    }
  };

  /**
   * Applies the full inactivity timeout exit sequence.
   * (moved to orchestration layer - WP5.5)
   */
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

  // Reset form (moved to orchestration layer - WP5.5)
  const resetForm = () => {
    resetFormOrchestrated({
      setCurrentGroup,
      setShowSuccess,
      setMemberNumber,
      setCurrentMemberId,
      setJustAssignedCourt,
      setAssignedSessionId,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setCanChangeCourt,
      setIsTimeLimited,
      setCurrentScreen,
      setSearchInput,
      setShowSuggestions,
      setShowAddPlayer,
      setAddPlayerSearch,
      setShowAddPlayerSuggestions,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setWaitlistPosition,
      setSelectedCourtToClear,
      setClearCourtStep,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setCourtToMove,
      setHasAssignedCourt,
      setShowGuestForm,
      setGuestName,
      setGuestSponsor,
      setShowGuestNameError,
      setShowSponsorError,
      setRegistrantStreak,
      setShowStreakModal,
      setStreakAcknowledged,
      clearCache,
      clearSuccessResetTimer,
    });
  };

  // fetchFrequentPartners moved to useMemberIdentity hook (WP5.3 R8b.3)

  // Fetch frequent partners when entering group screen (fallback if pre-fetch missed)
  useEffect(() => {
    if (currentScreen === 'group' && currentMemberId) {
      fetchFrequentPartners(currentMemberId);
    }
  }, [currentScreen, currentMemberId, fetchFrequentPartners]);

  // Check if player is already playing with detailed info
  const isPlayerAlreadyPlaying = (playerId) => {
    const data = getCourtData();
    return TennisBusinessLogic.isPlayerAlreadyPlaying(playerId, data, currentGroup);
  };

  // Validate guest name (2+ words with 2+ letters each)
  const validateGuestName = (name) => {
    const words = name.trim().split(/\s+/);
    if (words.length < 2) return false;
    return words.every((word) => word.length >= 2 && /^[a-zA-Z]+$/.test(word));
  };

  // Add frequent partner
  const addFrequentPartner = (player) => {
    console.log('🔵 addFrequentPartner called with:', JSON.stringify(player, null, 2));

    // Validate player object
    if (!DataValidation.isValidPlayer(player)) {
      console.log('🔴 Invalid player data - validation failed:', {
        player,
        hasId: !!player?.id,
        idType: typeof player?.id,
        idValue: player?.id,
        hasName: !!player?.name,
        nameType: typeof player?.name,
        nameValue: player?.name,
      });
      showAlertMessage('Invalid player data. Please try again.');
      return;
    }

    // Player from getFrequentPartners already has API data
    const enriched = player;

    // Ensure player has at least a name
    if (!enriched?.name && !player?.name) {
      showAlertMessage('Player must have a name');
      return;
    }

    // Check if player is already playing or on waitlist
    if (!guardAddPlayerEarly(getCourtData, enriched)) {
      return; // Toast message already shown by guardAddPlayerEarly
    }

    // Validate group size
    if (currentGroup.length >= CONSTANTS.MAX_PLAYERS) {
      showAlertMessage(`Group is full (max ${CONSTANTS.MAX_PLAYERS} players)`);
      return;
    }

    // Check for duplicate in current group
    if (!guardAgainstGroupDuplicate(enriched, currentGroup)) {
      Tennis.UI.toast(`${enriched.name} is already in this group`);
      return;
    }

    // For API backend, use the data directly; for legacy, look up memberNumber
    const newPlayer = {
      name: enriched.name,
      memberNumber: enriched.memberNumber || findMemberNumber(enriched.id),
      id: enriched.id,
      memberId: enriched.memberId || enriched.id,
      phone: enriched.phone || '',
      ranking: enriched.ranking || null,
      winRate: enriched.winRate || 0.5,
      accountId: enriched.accountId, // Include accountId for API backend
    };
    console.log('🔵 Adding frequent partner to group:', newPlayer);
    setCurrentGroup([...currentGroup, newPlayer]);
  };

  // Find member number
  const findMemberNumber = (playerId) => {
    // First check if the playerId itself is a member number
    if (memberDatabase[playerId]) {
      return playerId;
    }

    // Then check family members
    for (const [memberNum, member] of Object.entries(memberDatabase)) {
      if (member.familyMembers.some((m) => String(m.id) === String(playerId))) {
        return memberNum;
      }
    }
    return '';
  };

  // Helper to compare groups (ID-first, name fallback)
  const sameGroup = (a = [], b = []) => {
    const norm = (p) => {
      // Ensure we're working with strings before calling toLowerCase
      const memberId = String(p?.memberId || '');
      const id = String(p?.id || '');
      const name = String(p?.name || '');

      return memberId.toLowerCase() || id.toLowerCase() || name.trim().toLowerCase();
    };
    if (a.length !== b.length) return false;
    const A = a.map(norm).sort();
    const B = b.map(norm).sort();
    return A.every((x, i) => x === B[i]);
  };

  // getAutocompleteSuggestions moved to useMemberSearch hook (WP5.3 R5a.3)

  // Handle suggestion click (moved to orchestration layer - WP5.5)
  const handleSuggestionClick = async (suggestion) => {
    await handleSuggestionClickOrchestrated(suggestion, {
      // Read values
      currentGroup,
      // Setters
      setSearchInput,
      setShowSuggestions,
      setMemberNumber,
      setCurrentMemberId,
      setRegistrantStreak,
      setStreakAcknowledged,
      setCurrentGroup,
      setCurrentScreen,
      // Services/helpers
      backend,
      fetchFrequentPartners,
      isPlayerAlreadyPlaying,
      guardAddPlayerEarly,
      getCourtData,
      getAvailableCourts,
      showAlertMessage,
    });
  };

  // ============================================
  // Admin Screen Handlers
  // ============================================

  const handleClearAllCourts = () => handleClearAllCourtsOp({ backend, showAlertMessage });

  // handleBlockCreate and handleCancelBlock moved to useBlockAdmin hook (WP5.3 R3.3)

  const handleAdminClearCourt = (courtNum) =>
    handleAdminClearCourtOp({ clearCourt, showAlertMessage }, courtNum);

  const handleMoveCourt = (fromCourtNum, toCourtNum) =>
    handleMoveCourtOp(
      { backend, getCourtData, showAlertMessage, setCourtToMove },
      fromCourtNum,
      toCourtNum
    );

  const handleClearWaitlist = () =>
    handleClearWaitlistOp({ backend, showAlertMessage, getCourtData });

  const handleRemoveFromWaitlist = (group) =>
    handleRemoveFromWaitlistOp({ backend, showAlertMessage }, group);

  // handleReorderWaitlist moved to useWaitlistAdmin hook (WP5.3 R4a.3)

  const handlePriceUpdate = async () => {
    const price = parseFloat(ballPriceInput);

    // Validation
    if (isNaN(price)) {
      setPriceError('Please enter a valid number');
      return;
    }

    if (price < 0.5 || price > 50.0) {
      setPriceError('Price must be between $0.50 and $50.00');
      return;
    }

    // Save to localStorage
    try {
      const parsed = (await dataStore.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY)) || {};
      parsed.tennisBallPrice = price;
      await dataStore.set(TENNIS_CONFIG.STORAGE.SETTINGS_KEY, parsed, { immediate: true });

      // Show success message
      showPriceSuccessWithClear();
      // eslint-disable-next-line no-unused-vars
    } catch (_error) {
      setPriceError('Failed to save price');
    }
  };

  const handleExitAdmin = () => {
    setCurrentScreen('home', 'exitAdminPanel');
    setSearchInput('');
  };

  // ============================================================
  // GroupScreen Handlers
  // ============================================================
  // handleGroupSearchChange, handleGroupSearchFocus, handleAddPlayerSearchChange,
  // handleAddPlayerSearchFocus moved to useMemberSearch hook (WP5.3 R5a.3)

  const handleGroupSuggestionClick = async (suggestion) => {
    await handleSuggestionClick(suggestion);
    // For mobile flow, clear search after adding first player
    if (mobileFlow) {
      setSearchInput('');
      setShowSuggestions(false);
    }
  };

  // Handle add player suggestion click (moved to orchestration layer - WP5.5)
  const handleAddPlayerSuggestionClick = async (suggestion) => {
    await handleAddPlayerSuggestionClickOrchestrated(suggestion, {
      // Read values
      currentGroup,
      // Setters
      setAddPlayerSearch,
      setShowAddPlayer,
      setShowAddPlayerSuggestions,
      setCurrentGroup,
      setHasWaitlistPriority,
      setAlertMessage,
      setShowAlert,
      // Services/helpers
      guardAddPlayerEarly,
      guardAgainstGroupDuplicate,
      isPlayerAlreadyPlaying,
      getAvailableCourts,
      getCourtData,
      saveCourtData,
      findMemberNumber,
      showAlertMessage,
      CONSTANTS,
    });
  };

  const handleToggleAddPlayer = () => {
    if (showGuestForm) {
      // If guest form is showing, close it and reset
      setShowGuestForm(false);
      setGuestName('');
      setGuestSponsor('');
      setShowGuestNameError(false);
      setShowSponsorError(false);
      setShowAddPlayer(false);
    } else {
      // Normal toggle behavior
      setShowAddPlayer(!showAddPlayer);
    }
  };

  const handleToggleGuestForm = (prefillName) => {
    if (showGuestForm) {
      // If guest form is already showing, close it
      setShowGuestForm(false);
      setGuestName('');
      setGuestSponsor('');
      setShowGuestNameError(false);
      setShowSponsorError(false);
      setShowAddPlayer(false);
    } else {
      // Open guest form
      setShowGuestForm(true);
      setShowAddPlayer(true);
      setShowAddPlayerSuggestions(false);
      setAddPlayerSearch('');
      // Prefill name if provided (from "Add as guest?" button)
      if (typeof prefillName === 'string') {
        setGuestName(prefillName);
      }
      // Set default sponsor to current user ("My Guest")
      // This works for both single member and multiple members in group
      if (memberNumber) {
        setGuestSponsor(memberNumber);
      } else if (currentGroup.length >= 1 && !currentGroup[0].isGuest) {
        setGuestSponsor(currentGroup[0].memberNumber);
      }
    }
  };

  // handleRemovePlayer moved to useGroupGuest hook (WP5.3 R8a.3)
  // handleSelectSponsor moved to useGroupGuest hook (WP5.3 R8a.3)

  const handleGuestNameChange = (e) => {
    markUserTyping();
    setGuestName(e.target.value);
    setShowGuestNameError(false);
  };

  const handleAddGuest = async () => {
    if (!validateGuestName(guestName)) {
      setShowGuestNameError(true);
      return;
    }

    // Check if sponsor is selected when multiple members exist
    if (currentGroup.filter((p) => !p.isGuest).length > 1 && !guestSponsor) {
      setShowSponsorError(true);
      return;
    }

    // Early duplicate guard for guest
    if (!guardAddPlayerEarly(getCourtData, guestName.trim())) {
      setShowGuestForm(false);
      setShowAddPlayer(false);
      setGuestName('');
      setGuestSponsor('');
      return;
    }

    // Check for duplicate in current group
    if (!guardAgainstGroupDuplicate(guestName.trim(), currentGroup)) {
      Tennis.UI.toast(`${guestName.trim()} is already in this group`);
      setShowGuestForm(false);
      setShowAddPlayer(false);
      setGuestName('');
      setGuestSponsor('');
      return;
    }

    // Add guest to group
    const guestId = -guestCounter;
    incrementGuestCounter();

    const sponsorMember =
      guestSponsor || currentGroup.filter((p) => !p.isGuest)[0]?.memberNumber || memberNumber;

    // Find the sponsor's details
    const sponsorPlayer =
      currentGroup.find((p) => p.memberNumber === sponsorMember) ||
      memberDatabase[sponsorMember]?.familyMembers[0];

    setCurrentGroup([
      ...currentGroup,
      {
        name: guestName.trim(),
        memberNumber: 'GUEST',
        id: guestId,
        phone: '',
        ranking: null,
        winRate: 0.5,
        isGuest: true,
        sponsor: sponsorMember,
      },
    ]);

    // Track guest charge
    const guestCharge = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      guestName: guestName.trim(),
      sponsorName: sponsorPlayer?.name || 'Unknown',
      sponsorNumber: sponsorMember,
      amount: 15.0,
    };

    console.log('🎾 Creating guest charge:', guestCharge);

    try {
      // Get existing charges from localStorage
      const existingChargesFromStorage = localStorage.getItem(
        TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY
      );
      const existingCharges = existingChargesFromStorage
        ? JSON.parse(existingChargesFromStorage)
        : [];
      console.log('📋 Existing charges before save:', existingCharges.length);

      // Add new charge
      existingCharges.push(guestCharge);
      console.log('📋 Charges after adding new one:', existingCharges.length);

      // Save to localStorage
      localStorage.setItem(
        TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY,
        JSON.stringify(existingCharges)
      );
      console.log('💾 Guest charge saved to localStorage');

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent('tennisDataUpdate', {
          detail: { source: 'guest-charge' },
        })
      );
      console.log('📡 Dispatched update event (source=guest-charge)');
    } catch (error) {
      console.error('❌ Error saving guest charge:', error);
    }

    // Reset form
    setGuestName('');
    setGuestSponsor('');
    setShowGuestForm(false);
    setShowAddPlayer(false);
    setShowGuestNameError(false);
    setShowSponsorError(false);
  };

  // handleCancelGuest moved to useGroupGuest hook (WP5.3 R8a.3)

  const handleGroupSelectCourt = () => {
    console.log('[handleGroupSelectCourt] registrantStreak:', registrantStreak);
    console.log('[handleGroupSelectCourt] streakAcknowledged:', streakAcknowledged);

    // Check if streak >= 3 and not yet acknowledged
    if (registrantStreak >= 3 && !streakAcknowledged) {
      console.log('[handleGroupSelectCourt] Showing streak modal');
      setShowStreakModal(true);
      return;
    }

    // Mobile: Skip court selection if we have a preselected court
    if (mobileFlow && preselectedCourt) {
      assignCourtToGroup(preselectedCourt);
    } else {
      setCurrentScreen('court', 'selectCourtButton');
    }
  };

  // Handler for streak modal acknowledgment
  const handleStreakAcknowledge = () => {
    setStreakAcknowledged(true);
    setShowStreakModal(false);
    // Now proceed to court selection
    if (mobileFlow && preselectedCourt) {
      assignCourtToGroup(preselectedCourt);
    } else {
      setCurrentScreen('court', 'selectCourtButton');
    }
  };

  const handleGroupJoinWaitlist = async () => {
    try {
      await sendGroupToWaitlist(currentGroup);
      setShowSuccess(true);
    } catch (error) {
      console.error('[handleGroupJoinWaitlist] Error:', error);
    }
    // Mobile: trigger success signal
    if (window.UI?.__mobileSendSuccess__) {
      window.UI.__mobileSendSuccess__();
    }

    // Don't auto-reset in mobile flow - let the overlay handle timing
    if (!mobileFlow) {
      clearSuccessResetTimer();
      successResetTimerRef.current = setTimeout(() => {
        successResetTimerRef.current = null;
        resetForm();
      }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
    }
  };

  const handleGroupGoBack = () => {
    if (mobileFlow) {
      // Check if we're in Clear Court workflow - handle navigation properly
      if (currentScreen === 'clearCourt') {
        // In Clear Court, Back should go to previous step or exit
        if (clearCourtStep > 1) {
          decrementClearCourtStep();
        } else {
          // Exit Clear Court workflow
          requestMobileReset();
        }
      } else {
        // For other screens, close the registration overlay
        requestMobileReset();
      }
    } else {
      // Desktop behavior - go back to home
      setCurrentGroup([]);
      setMemberNumber('');
      setCurrentMemberId(null);
      setCurrentScreen('home', 'groupGoBack');
    }
  };

  // ===== ROUTING (delegated to RegistrationRouter - WP5.9.1) =====
  return (
    <RegistrationRouter
      // Core navigation
      currentScreen={currentScreen}
      setCurrentScreen={setCurrentScreen}
      // Alert state
      showAlert={showAlert}
      alertMessage={alertMessage}
      showAlertMessage={showAlertMessage}
      // Mobile state
      mobileFlow={mobileFlow}
      mobileMode={mobileMode}
      preselectedCourt={preselectedCourt}
      mobileCountdown={mobileCountdown}
      checkingLocation={checkingLocation}
      showQRScanner={showQRScanner}
      gpsFailedPrompt={gpsFailedPrompt}
      onQRScanToken={onQRScanToken}
      onQRScannerClose={onQRScannerClose}
      openQRScanner={openQRScanner}
      dismissGpsPrompt={dismissGpsPrompt}
      // Search state
      searchInput={searchInput}
      setSearchInput={setSearchInput}
      showSuggestions={showSuggestions}
      setShowSuggestions={setShowSuggestions}
      isSearching={isSearching}
      effectiveSearchInput={effectiveSearchInput}
      getAutocompleteSuggestions={getAutocompleteSuggestions}
      addPlayerSearch={addPlayerSearch}
      showAddPlayerSuggestions={showAddPlayerSuggestions}
      effectiveAddPlayerSearch={effectiveAddPlayerSearch}
      handleGroupSearchChange={handleGroupSearchChange}
      handleGroupSearchFocus={handleGroupSearchFocus}
      handleAddPlayerSearchChange={handleAddPlayerSearchChange}
      handleAddPlayerSearchFocus={handleAddPlayerSearchFocus}
      // Member identity
      memberNumber={memberNumber}
      setMemberNumber={setMemberNumber}
      currentMemberId={currentMemberId}
      frequentPartners={frequentPartners}
      frequentPartnersLoading={frequentPartnersLoading}
      // Group/guest state
      currentGroup={currentGroup}
      setCurrentGroup={setCurrentGroup}
      guestName={guestName}
      guestSponsor={guestSponsor}
      showGuestForm={showGuestForm}
      showGuestNameError={showGuestNameError}
      showSponsorError={showSponsorError}
      handleRemovePlayer={handleRemovePlayer}
      handleSelectSponsor={handleSelectSponsor}
      handleCancelGuest={handleCancelGuest}
      // Streak state
      registrantStreak={registrantStreak}
      showStreakModal={showStreakModal}
      streakAcknowledged={streakAcknowledged}
      setStreakAcknowledged={setStreakAcknowledged}
      // Court assignment
      justAssignedCourt={justAssignedCourt}
      assignedSessionId={assignedSessionId}
      hasAssignedCourt={hasAssignedCourt}
      // Clear court
      selectedCourtToClear={selectedCourtToClear}
      setSelectedCourtToClear={setSelectedCourtToClear}
      clearCourtStep={clearCourtStep}
      setClearCourtStep={setClearCourtStep}
      // Block admin
      showBlockModal={showBlockModal}
      setShowBlockModal={setShowBlockModal}
      selectedCourtsToBlock={selectedCourtsToBlock}
      setSelectedCourtsToBlock={setSelectedCourtsToBlock}
      blockStartTime={blockStartTime}
      setBlockStartTime={setBlockStartTime}
      blockEndTime={blockEndTime}
      setBlockEndTime={setBlockEndTime}
      blockMessage={blockMessage}
      setBlockMessage={setBlockMessage}
      blockWarningMinutes={blockWarningMinutes}
      blockingInProgress={blockingInProgress}
      setBlockingInProgress={setBlockingInProgress}
      getCourtBlockStatus={getCourtBlockStatus}
      onBlockCreate={onBlockCreate}
      onCancelBlock={onCancelBlock}
      // Waitlist admin
      waitlistMoveFrom={waitlistMoveFrom}
      setWaitlistMoveFrom={setWaitlistMoveFrom}
      onReorderWaitlist={onReorderWaitlist}
      // Session timeout
      showTimeoutWarning={showTimeoutWarning}
      // Admin price feedback
      showPriceSuccess={showPriceSuccess}
      setShowPriceSuccess={setShowPriceSuccess}
      priceError={priceError}
      setPriceError={setPriceError}
      ballPriceInput={ballPriceInput}
      setBallPriceInput={setBallPriceInput}
      // CTA state (computed values)
      canFirstGroupPlay={canFirstGroupPlay}
      canSecondGroupPlay={canSecondGroupPlay}
      firstWaitlistEntry={firstWaitlistEntry}
      secondWaitlistEntry={secondWaitlistEntry}
      firstWaitlistEntryData={firstWaitlistEntryData}
      secondWaitlistEntryData={secondWaitlistEntryData}
      // Remaining state
      data={data}
      availableCourts={availableCourts}
      waitlistPosition={waitlistPosition}
      showSuccess={showSuccess}
      setShowSuccess={setShowSuccess}
      replacedGroup={replacedGroup}
      displacement={displacement}
      setDisplacement={setDisplacement}
      originalCourtData={originalCourtData}
      setOriginalCourtData={setOriginalCourtData}
      canChangeCourt={canChangeCourt}
      changeTimeRemaining={changeTimeRemaining}
      isTimeLimited={isTimeLimited}
      timeLimitReason={timeLimitReason}
      showAddPlayer={showAddPlayer}
      isChangingCourt={isChangingCourt}
      setIsChangingCourt={setIsChangingCourt}
      setWasOvertimeCourt={setWasOvertimeCourt}
      currentTime={currentTime}
      courtToMove={courtToMove}
      setCourtToMove={setCourtToMove}
      hasWaitlistPriority={hasWaitlistPriority}
      setHasWaitlistPriority={setHasWaitlistPriority}
      currentWaitlistEntryId={currentWaitlistEntryId}
      setCurrentWaitlistEntryId={setCurrentWaitlistEntryId}
      isAssigning={isAssigning}
      isJoiningWaitlist={isJoiningWaitlist}
      ballPriceCents={ballPriceCents}
      successResetTimerRef={successResetTimerRef}
      // Computed values
      isMobileView={isMobileView}
      // Handlers
      handleSuggestionClick={handleSuggestionClick}
      handleGroupSuggestionClick={handleGroupSuggestionClick}
      handleAddPlayerSuggestionClick={handleAddPlayerSuggestionClick}
      markUserTyping={markUserTyping}
      findMemberNumber={findMemberNumber}
      addFrequentPartner={addFrequentPartner}
      isPlayerAlreadyPlaying={isPlayerAlreadyPlaying}
      handleToggleAddPlayer={handleToggleAddPlayer}
      handleToggleGuestForm={handleToggleGuestForm}
      handleGuestNameChange={handleGuestNameChange}
      handleAddGuest={handleAddGuest}
      handleGroupSelectCourt={handleGroupSelectCourt}
      handleStreakAcknowledge={handleStreakAcknowledge}
      handleGroupJoinWaitlist={handleGroupJoinWaitlist}
      handleGroupGoBack={handleGroupGoBack}
      assignCourtToGroup={assignCourtToGroup}
      changeCourt={changeCourt}
      clearCourt={clearCourt}
      sendGroupToWaitlist={sendGroupToWaitlist}
      resetForm={resetForm}
      clearSuccessResetTimer={clearSuccessResetTimer}
      handleClearAllCourts={handleClearAllCourts}
      handleAdminClearCourt={handleAdminClearCourt}
      handleMoveCourt={handleMoveCourt}
      handleClearWaitlist={handleClearWaitlist}
      handleRemoveFromWaitlist={handleRemoveFromWaitlist}
      handlePriceUpdate={handlePriceUpdate}
      handleExitAdmin={handleExitAdmin}
      checkLocationAndProceed={checkLocationAndProceed}
      getCourtData={getCourtData}
      saveCourtData={saveCourtData}
      getCourtsOccupiedForClearing={getCourtsOccupiedForClearing}
      computeRegistrationCourtSelection={computeRegistrationCourtSelection}
      sameGroup={sameGroup}
      // External dependencies
      backend={backend}
      CONSTANTS={CONSTANTS}
      TENNIS_CONFIG={TENNIS_CONFIG}
    />
  );
};

export default TennisRegistration;
