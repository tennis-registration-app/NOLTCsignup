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
  getUpcomingBlockWarning as _sharedGetUpcomingBlockWarning,
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
import { useDebounce } from './hooks';

// API Backend Integration
import { getTennisService } from './services/index.js';
// getRealtimeClient available in @lib/RealtimeClient.js if needed

// TennisBackend interface layer
import { createBackend } from './backend/index.js';
// DenialCodes available in ./backend/index.js if needed

// Overtime eligibility policy
import { computeRegistrationCourtSelection } from '../shared/courts/overtimeEligibility.js';

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
const USE_SHARED_CORE = true;
const DEBUG = false; // Gate noisy logs
const dbg = (...args) => {
  if (DEBUG) console.log(...args);
};

// These will be populated from window.Tennis after modules load
const Storage = window.Tennis?.Storage;
const Events = window.Tennis?.Events;
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
const getUpcomingBlockWarning = _sharedGetUpcomingBlockWarning;

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
  const [apiError, setApiError] = useState(null);
  const [waitlistPosition, setWaitlistPosition] = useState(0); // Position from API response
  const [operatingHours, setOperatingHours] = useState(null); // Operating hours from API

  // Mobile flow state
  const [mobileFlow, setMobileFlow] = useState(false);
  const [preselectedCourt, setPreselectedCourt] = useState(null);
  // Mobile mode: null = normal, 'silent-assign' = loading state for waitlist assignment
  const [mobileMode, setMobileMode] = useState(null);

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
      setApiError(null);

      // CTA state is now derived via useMemo from data.waitlist and availableCourts
      // No cta:state event dispatch needed - React's reactivity handles updates
      console.log(
        '[Registration] Initial load complete, waitlist length:',
        initialData.waitlist?.length
      );

      return updatedData;
    } catch (error) {
      console.error('Failed to load data:', error);
      setApiError(error.message);
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

  // Load members for autocomplete (one-time fetch)
  useEffect(() => {
    const loadMembers = async () => {
      try {
        console.log('[TennisBackend] Loading members for autocomplete...');
        const members = await backend.directory.getAllMembers();
        setApiMembers(members);
        console.log('[TennisBackend] Loaded', members.length, 'members');
      } catch (error) {
        console.error('[TennisBackend] Failed to load members:', error);
      }
    };
    loadMembers();
  }, []);

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

  const [currentGroup, setCurrentGroup] = useState([]);
  const [memberNumber, setMemberNumber] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Uncleared session tracking - streak of the registrant (first player added)
  const [registrantStreak, setRegistrantStreak] = useState(0);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakAcknowledged, setStreakAcknowledged] = useState(false);
  // NOTE: availableCourts moved to top of component (line ~236) to avoid TDZ errors

  // Derive CTA state from data.waitlist and availableCourts using useMemo
  // This replaces the cta:state event-based approach with direct derivation
  const {
    firstWaitlistEntry,
    secondWaitlistEntry,
    canFirstGroupPlay,
    canSecondGroupPlay,
    waitingGroupDisplay,
    secondWaitlistEntryDisplay,
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

    // Compute display names
    let display1 = '';
    if (live1 && firstGroup?.players?.length) {
      const names = firstGroup.players.map((p) => (p.displayName || p.name || '').split(' ').pop());
      display1 = names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')}, etc`;
    }

    let display2 = '';
    if (live2 && secondGroup?.players?.length) {
      const names = secondGroup.players.map((p) =>
        (p.displayName || p.name || '').split(' ').pop()
      );
      display2 = names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')}, etc`;
    }

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
      waitingGroupDisplay: display1,
      secondWaitlistEntryDisplay: display2,
      firstWaitlistEntryData: first,
      secondWaitlistEntryData: second,
    };
  }, [data.waitlist, availableCourts]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mobileCountdown, setMobileCountdown] = useState(5);
  const [justAssignedCourt, setJustAssignedCourt] = useState(null);
  const [assignedSessionId, setAssignedSessionId] = useState(null); // Session ID from assignment (for ball purchases)
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
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerSearch, setAddPlayerSearch] = useState('');
  const [showAddPlayerSuggestions, setShowAddPlayerSuggestions] = useState(false);
  const [apiMembers, setApiMembers] = useState([]); // Cached API members for search

  const [selectedCourtToClear, setSelectedCourtToClear] = useState(null);
  const [clearCourtStep, setClearCourtStep] = useState(1);
  const [isChangingCourt, setIsChangingCourt] = useState(false);
  const [wasOvertimeCourt, setWasOvertimeCourt] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const timeoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const successResetTimerRef = useRef(null);
  const frequentPartnersCacheRef = useRef({});
  const [frequentPartners, setFrequentPartners] = useState([]);
  const [frequentPartnersLoading, setFrequentPartnersLoading] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [courtToMove, setCourtToMove] = useState(null);
  const [moveToCourtNum, setMoveToCourtNum] = useState(null);
  const [hasAssignedCourt, setHasAssignedCourt] = useState(false);
  const [hasWaitlistPriority, setHasWaitlistPriority] = useState(false);
  const [currentWaitlistEntryId, setCurrentWaitlistEntryId] = useState(null);

  const [waitlistMoveFrom, setWaitlistMoveFrom] = useState(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestSponsor, setGuestSponsor] = useState('');
  const [guestCounter, setGuestCounter] = useState(1);
  const [showGuestNameError, setShowGuestNameError] = useState(false);
  const [showSponsorError, setShowSponsorError] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingInProgress, setBlockingInProgress] = useState(false);
  const [selectedCourtsToBlock, setSelectedCourtsToBlock] = useState([]);
  const [blockMessage, setBlockMessage] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('now');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [isSearching, setIsSearching] = useState(false); // Add searching state
  const [isAssigning, setIsAssigning] = useState(false); // Prevent double-submit during court assignment
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false); // Prevent double-submit during waitlist join

  // Admin panel state - moved to top level
  const [ballPriceInput, setBallPriceInput] = useState('');
  const [showPriceSuccess, setShowPriceSuccess] = useState(false);
  const [priceError, setPriceError] = useState('');

  // Ball price from API (in cents) - used by SuccessScreen
  const [ballPriceCents, setBallPriceCents] = useState(TENNIS_CONFIG.PRICING.TENNIS_BALLS * 100);
  // Block warning minutes from API - used by SuccessScreen
  const [blockWarningMinutes, setBlockWarningMinutes] = useState(60);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // QR location token state (mobile GPS fallback)
  const [locationToken, setLocationToken] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [gpsFailedPrompt, setGpsFailedPrompt] = useState(false);

  // Debouncing hooks - MUST be at top level
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const debouncedAddPlayerSearch = useDebounce(addPlayerSearch, 300);

  // Determine which search value to use based on input type
  const shouldDebounceMainSearch = !/^\d+$/.test(searchInput);
  const effectiveSearchInput = shouldDebounceMainSearch ? debouncedSearchInput : searchInput;

  // CTA state is now derived via useMemo from data.waitlist and availableCourts
  // The cta:state event listener has been removed in favor of direct derivation

  const shouldDebounceAddPlayer = !/^\d+$/.test(addPlayerSearch);
  const effectiveAddPlayerSearch = shouldDebounceAddPlayer
    ? debouncedAddPlayerSearch
    : addPlayerSearch;

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

  /**
   * Get current geolocation coordinates for mobile backend validation
   * Returns { latitude, longitude } or { location_token } or null if unavailable/not mobile
   * If GPS fails but we have a location token from QR scan, use that instead
   */
  const getMobileGeolocation = async () => {
    // Only needed for mobile device type
    if (!API_CONFIG.IS_MOBILE) {
      return null;
    }

    // If we have a location token from QR scan, use that
    if (locationToken) {
      console.log('[Mobile] Using location token instead of GPS');
      return { location_token: locationToken };
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('[Mobile] Geolocation not available');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(
            '[Mobile] Got geolocation:',
            position.coords.latitude,
            position.coords.longitude,
            'accuracy:',
            position.coords.accuracy
          );
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy, // GPS accuracy in meters
          });
        },
        (error) => {
          console.error('[Mobile] Geolocation error:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: TENNIS_CONFIG.GEOLOCATION.TIMEOUT_MS || 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Track when main search is in progress
  useEffect(() => {
    if (
      shouldDebounceMainSearch &&
      searchInput !== debouncedSearchInput &&
      searchInput.length > 0
    ) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchInput, debouncedSearchInput, shouldDebounceMainSearch]);

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

  // Simplified member database
  // eslint-disable-next-line react-hooks/exhaustive-deps -- memberDatabase is static data, recreated each render for simplicity (performance optimization deferred)
  const memberDatabase = {};
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

    memberDatabase[id.toString()] = {
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

  // Create roster from memberDatabase and ensure member IDs
  const memberRoster = React.useMemo(() => {
    const roster = [];
    Object.entries(memberDatabase).forEach(([memberNum, data]) => {
      data.familyMembers.forEach((member) => {
        roster.push({
          id: member.id,
          name: member.name,
          memberNumber: memberNum,
          phone: member.phone,
          ranking: member.ranking,
          winRate: member.winRate,
        });
      });
    });

    // Ensure all roster entries have memberIds
    const R = window.Tennis?.Domain?.roster;
    if (R?.ensureMemberIds) {
      const result = R.ensureMemberIds(roster);
      console.log('Member IDs ensured:', result.assigned, 'new IDs assigned');
      return result.roster;
    }
    return roster;
  }, [memberDatabase]);

  // Make roster available for other functions
  window.__memberRoster = memberRoster;

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
        window.__preselectedCourt = courtNumber;
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

  // Mobile: Listen for register messages from parent (Mobile.html)
  useEffect(() => {
    const handleMessage = async (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'register') {
        console.log('[Mobile] Received register message:', data);
        const courtNumber = data.courtNumber;

        // Set mobile flow state
        setMobileFlow(true);
        window.__mobileFlow = true;

        if (courtNumber) {
          setPreselectedCourt(courtNumber);
          window.__preselectedCourt = courtNumber;
          console.log('[Mobile] Preselected court:', courtNumber);
        }

        // Navigate to group screen
        setCurrentScreen('group', 'mobileRegisterMessage');

        // Focus the search input after navigation
        requestAnimationFrame(() => {
          const input =
            document.querySelector('#mobile-group-search-input') ||
            document.querySelector('#main-search-input') ||
            document.querySelector('input[type="text"]');
          if (input) {
            input.focus({ preventScroll: true });
          }
        });
      } else if (data.type === 'assign-from-waitlist') {
        // Handle waitlist assignment from mobile court tap (silent assign mode)
        console.log('[Mobile] Received assign-from-waitlist message:', data);
        const { courtNumber, waitlistEntryId } = data;

        if (!courtNumber || !waitlistEntryId) {
          console.error('[Mobile] Missing courtNumber or waitlistEntryId');
          return;
        }

        // Set mobile flow state and silent-assign mode (shows loading spinner)
        setMobileFlow(true);
        window.__mobileFlow = true;
        setMobileMode('silent-assign');

        try {
          // Get court ID from court number
          const boardData = await backend.queries.getBoard();
          const court = boardData.courts?.find((c) => c.number === courtNumber);

          if (!court?.id) {
            console.error('[Mobile] Could not find court ID for court number:', courtNumber);
            Tennis?.UI?.toast?.('Could not find court', { type: 'error' });
            return;
          }

          console.log('[Mobile] Assigning waitlist entry', waitlistEntryId, 'to court', court.id);

          // Get geolocation for mobile (required by backend)
          let locationData = {};
          if (navigator.geolocation) {
            try {
              const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 5000,
                  maximumAge: 0,
                });
              });
              locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              };
            } catch (geoError) {
              console.warn('[Mobile] Geolocation failed:', geoError);
            }
          }

          // Call assign from waitlist API
          const result = await backend.commands.assignFromWaitlistWithLocation({
            waitlistEntryId,
            courtId: court.id,
            ...locationData,
          });

          if (result.ok) {
            console.log('[Mobile] Waitlist assignment successful:', result);

            // Clear mobile waitlist entry ID
            sessionStorage.removeItem('mobile-waitlist-entry-id');
            // Store the new court registration
            sessionStorage.setItem('mobile-registered-court', String(courtNumber));

            // Clear silent-assign mode and show success
            setMobileMode(null);
            setJustAssignedCourt(courtNumber);
            setAssignedSessionId(result.session?.id || null);
            setShowSuccess(true);

            // Toast success
            Tennis?.UI?.toast?.(`Assigned to Court ${courtNumber}!`, { type: 'success' });
          } else {
            console.error('[Mobile] Waitlist assignment failed:', result.code, result.message);
            Tennis?.UI?.toast?.(result.message || 'Could not assign court', { type: 'error' });

            // Clear silent-assign mode and close overlay on failure
            setMobileMode(null);
            window.parent.postMessage({ type: 'resetRegistration' }, '*');
          }
        } catch (error) {
          console.error('[Mobile] Error assigning from waitlist:', error);
          Tennis?.UI?.toast?.('Error assigning court', { type: 'error' });

          // Clear silent-assign mode and close overlay on error
          setMobileMode(null);
          window.parent.postMessage({ type: 'resetRegistration' }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile: Watch for success state changes and send signal
  useEffect(() => {
    if (showSuccess && mobileFlow && window.top !== window.self) {
      dbg('Registration: Success state changed to true, sending mobile signal');
      const courtNumber = preselectedCourt || justAssignedCourt || null;
      dbg('Registration: Court number for success:', courtNumber);
      try {
        window.parent.postMessage({ type: 'registration:success', courtNumber: courtNumber }, '*');
        dbg('Registration: Direct success message sent');
      } catch (e) {
        if (DEBUG) console.log('Registration: Error in direct success message:', e);
      }

      // Start countdown for mobile (synced with Mobile.html 8 second dismiss)
      setMobileCountdown(8);
      const countdownInterval = setInterval(() => {
        setMobileCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [showSuccess, justAssignedCourt, mobileFlow, preselectedCourt]);

  // PHASE1D: Court availability now handled by TennisBackend subscription

  // PHASE1D: Event listeners for localStorage removed - TennisBackend handles all updates

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Activity tracking for timeout
  const updateActivity = () => {
    setLastActivity(Date.now());
    setShowTimeoutWarning(false);

    // Clear and restart timers when there's activity
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    if (currentScreen === 'group') {
      // Set warning timer
      warningTimerRef.current = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, CONSTANTS.SESSION_WARNING_MS);

      // Set timeout timer
      timeoutTimerRef.current = setTimeout(() => {
        showAlertMessage('Session timed out due to inactivity');
        applyInactivityTimeoutExitSequence();
      }, CONSTANTS.SESSION_TIMEOUT_MS);
    }
  };

  // Setup timeout for group management screen
  useEffect(() => {
    if (currentScreen === 'group') {
      // Initial setup of timers when entering group screen
      updateActivity();

      // Add activity listeners
      const handleActivity = () => updateActivity();
      window.addEventListener('click', handleActivity);
      window.addEventListener('touchstart', handleActivity);
      window.addEventListener('keypress', handleActivity);

      return () => {
        // Cleanup
        if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
        window.removeEventListener('keypress', handleActivity);
      };
    } else {
      // Clear timers when leaving group screen
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only depend on currentScreen, not updateActivity
  }, [currentScreen]);

  // Show alert message helper
  const showAlertMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), CONSTANTS.ALERT_DISPLAY_MS);
  };

  // Get court data using the data service (synchronous for React renders)
  // NOTE: Auto-timeout and cleanup now handled by API/server
  const getCourtData = () => {
    return data;
  };

  // Save court data using the data service
  // @deprecated — localStorage persistence removed; API commands handle state
  const saveCourtData = async (_data) => {
    // TennisDataService.saveData removed — API is source of truth
    // Callers should migrate to TennisCommands for write operations
    console.warn('[saveCourtData] DEPRECATED: localStorage persistence removed. Use API commands.');
    return true; // Return success to avoid breaking callers during migration
  };

  // Check if player is next in waitlist
  const isPlayerNextInWaitlist = (playerId) => {
    const data = getCourtData();
    if (data.waitlist.length > 0) {
      const firstEntry = data.waitlist[0];
      // Domain: entry.group.players with memberId
      const players = firstEntry.group?.players || [];
      return players.some((p) => p.memberId === playerId);
    }
    return false;
  };

  // Get available courts (strict selectable API - single source of truth)
  const getAvailableCourts = (
    checkWaitlistPriority = true,
    includeOvertimeIfChanging = false,
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

  const assignCourtToGroup = async (courtNumber, selectableCountAtSelection = null) => {
    // Prevent double-submit
    if (isAssigning) {
      console.log('⚠️ Assignment already in progress, ignoring duplicate request');
      return;
    }

    // Mobile: Use preselected court if in mobile flow
    if (window.__mobileFlow && window.__preselectedCourt && !courtNumber) {
      courtNumber = window.__preselectedCourt;
      console.log('Mobile: Using preselected court', courtNumber);
    }

    // Check if club is open (using API operating hours when available)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Get opening time from API
    let openingTime;
    let openingTimeString;

    if (operatingHours && Array.isArray(operatingHours) && operatingHours.length > 0) {
      // Find today's operating hours from API
      // Handle both snake_case (from API) and camelCase formats
      const todayHours = operatingHours.find((h) => (h.dayOfWeek ?? h.day_of_week) === dayOfWeek);
      const isClosed = todayHours?.isClosed ?? todayHours?.is_closed;
      if (todayHours && !isClosed) {
        // Parse opensAt (format: "HH:MM:SS") - handle both camelCase and snake_case
        const opensAtValue = todayHours.opensAt ?? todayHours.opens_at;
        const [hours, minutes] = opensAtValue.split(':').map(Number);
        openingTime = hours + minutes / 60;
        // Format for display (e.g., "5:00 AM")
        const hour12 = hours % 12 || 12;
        const ampm = hours < 12 ? 'AM' : 'PM';
        openingTimeString = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } else if (todayHours && isClosed) {
        Tennis.UI.toast('The club is closed today.', { type: 'warning' });
        return;
      } else {
        // Fallback if no hours found for today
        openingTime = 0; // Allow registration if no hours configured
        openingTimeString = 'N/A';
      }
    } else {
      // No operating hours data - allow registration (API may not be returning hours)
      openingTime = 0;
      openingTimeString = 'N/A';
    }

    const currentTime = currentHour + currentMinutes / 60;

    // If too early, show alert and return
    if (currentTime < openingTime) {
      Tennis.UI.toast(
        `The club is not open yet. Court registration will be available at ${openingTimeString}.`,
        { type: 'warning' }
      );
      return;
    }

    // Validate court number
    if (!courtNumber || courtNumber < 1 || courtNumber > CONSTANTS.COURT_COUNT) {
      showAlertMessage(
        `Invalid court number. Please select a court between 1 and ${CONSTANTS.COURT_COUNT}.`
      );
      return;
    }

    // Validate group has players
    if (!currentGroup || currentGroup.length === 0) {
      showAlertMessage('No players in group. Please add players first.');
      return;
    }

    // Create arrays for validation and assignment
    // Handle both field name formats: id/name (legacy) and memberId/displayName (API)
    const players = currentGroup
      .filter((p) => !p.isGuest) // Non-guests for validation
      .map((p) => ({
        id: String(p.id || p.memberId || '').trim(),
        name: String(p.name || p.displayName || '').trim(),
      }))
      .filter((p) => p && p.id && p.name);

    const allPlayers = currentGroup // ALL players including guests for court assignment
      .map((p) => ({
        id: String(p.id || p.memberId || '').trim(),
        name: String(p.name || p.displayName || '').trim(),
        ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
        ...(p.sponsor && { sponsor: p.sponsor }),
        ...(p.memberNumber && { memberNumber: p.memberNumber }),
      }))
      .filter((p) => p && p.id && p.name);

    const guests = currentGroup.filter((p) => p.isGuest).length;

    // Domain validation (reuse the same error UI as submit)
    const { ok, errors } = validateGroupCompat(players, guests);
    if (!ok) {
      showAlertMessage(errors.join('\n'));
      return;
    }

    // Duration determined from group size (including guests)
    const Tm = window.Tennis.Domain.time || window.Tennis.Domain.Time;
    const duration = Tm.durationForGroupSize(allPlayers.length); // typically 60/90

    // Canonical group object (use allPlayers so guests appear on court)
    const group = { players: allPlayers, guests };

    // Check for upcoming block on selected court using new system
    const blockStatus = await getCourtBlockStatus(courtNumber);
    if (blockStatus && !blockStatus.isCurrent && blockStatus.startTime) {
      const now = new Date();
      const blockStart = new Date(blockStatus.startTime);
      const sessionEnd = new Date(now.getTime() + duration * 60000);

      // Check if block will start before session ends
      if (blockStart < sessionEnd) {
        const minutesUntilBlock = Math.ceil((blockStart - now) / 60000);
        const confirmMsg = `⚠️ This court has a block starting in ${minutesUntilBlock} minutes (${blockStatus.reason}). You may not get your full ${duration} minutes.\n\nDo you want to take this court anyway?`;

        const proceed = confirm(confirmMsg);
        if (!proceed) {
          showAlertMessage('Please select a different court or join the waitlist.');
          return; // Exit without assigning
        }
      }
    }

    console.log('🔵 UI preparing to assignCourt with:', {
      courtNumber,
      group,
      duration,
    });

    // If this is a waitlist group (CTA flow), use assignFromWaitlist instead
    if (currentWaitlistEntryId) {
      // Get court UUID for the waitlist assignment
      const waitlistCourt = data.courts.find((c) => c.number === courtNumber);
      if (!waitlistCourt) {
        console.error('❌ Court not found for waitlist assignment:', courtNumber);
        Tennis.UI.toast('Court not found. Please refresh and try again.', { type: 'error' });
        return;
      }

      // Get geolocation for mobile (required by backend for geofence validation)
      const waitlistMobileLocation = await getMobileGeolocation();

      try {
        const result = await backend.commands.assignFromWaitlist({
          waitlistEntryId: currentWaitlistEntryId,
          courtId: waitlistCourt.id,
          ...(waitlistMobileLocation || {}),
        });
        console.log('✅ Waitlist group assigned result:', result);

        if (!result.ok) {
          // Handle "Court occupied" race condition
          if (result.code === 'COURT_OCCUPIED') {
            Tennis.UI.toast('This court was just taken. Refreshing...', { type: 'warning' });
            setCurrentWaitlistEntryId(null);
            await backend.queries.refresh();
            return;
          }
          // Handle mobile location errors - offer QR fallback
          if (API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
            setGpsFailedPrompt(true);
            return;
          }
          Tennis.UI.toast(result.message || 'Failed to assign court from waitlist', {
            type: 'error',
          });
          setCurrentWaitlistEntryId(null);
          return;
        }

        // Clear the waitlist entry ID after successful assignment
        setCurrentWaitlistEntryId(null);
        setHasWaitlistPriority(false);
        // Also clear mobile sessionStorage waitlist entry
        sessionStorage.removeItem('mobile-waitlist-entry-id');

        // Board subscription will auto-refresh
        console.log('✅ Waitlist assignment successful, waiting for board refresh signal');

        // Update currentGroup with participant details for ball purchases
        if (result.session?.participantDetails) {
          const groupFromWaitlist = result.session.participantDetails.map((p) => ({
            memberNumber: p.memberId,
            name: p.name,
            accountId: p.accountId,
            isGuest: p.isGuest,
          }));
          setCurrentGroup(groupFromWaitlist);
        }

        // Update UI state
        setJustAssignedCourt(courtNumber);
        setAssignedSessionId(result.session?.id || null); // Capture session ID for ball purchases
        setReplacedGroup(null);
        setDisplacement(null);
        setOriginalCourtData(null);
        setIsChangingCourt(false);
        setWasOvertimeCourt(false);
        setHasAssignedCourt(true);
        setCanChangeCourt(false); // Waitlist groups typically don't get court change option
        setShowSuccess(true);

        // Mobile: notify parent on success
        if (window.__mobileSuccessHandler) {
          window.__mobileSuccessHandler(courtNumber);
        }
        if (window.UI?.__mobileSendSuccess__) {
          window.UI.__mobileSendSuccess__();
        }

        // Auto-reset timer
        if (!window.__mobileFlow) {
          clearSuccessResetTimer();
          successResetTimerRef.current = setTimeout(() => {
            successResetTimerRef.current = null;
            resetForm();
          }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
        }

        return;
      } catch (error) {
        console.error('❌ assignFromWaitlist failed:', error);
        setCurrentWaitlistEntryId(null);
        Tennis.UI.toast(error.message || 'Failed to assign court from waitlist', { type: 'error' });
        return;
      }
    }

    // Get court UUID from court number
    const court = data.courts.find((c) => c.number === courtNumber);
    if (!court) {
      console.error('❌ Court not found for number:', courtNumber);
      Tennis.UI.toast('Court not found. Please refresh and try again.', { type: 'error' });
      return;
    }

    // Determine group type from player count
    const groupType = allPlayers.length <= 2 ? 'singles' : 'doubles';

    // Get geolocation for mobile (required by backend for geofence validation)
    const mobileLocation = await getMobileGeolocation();

    const assignStartTime = performance.now();
    console.log('🔵 [T+0ms] Calling backend.commands.assignCourtWithPlayers:', {
      courtId: court.id,
      courtNumber: court.number,
      groupType,
      playerCount: allPlayers.length,
      mobileLocation: mobileLocation ? 'provided' : 'not-mobile',
    });

    setIsAssigning(true);
    let result;
    try {
      result = await backend.commands.assignCourtWithPlayers({
        courtId: court.id,
        players: allPlayers,
        groupType,
        ...(mobileLocation || {}), // Spread latitude/longitude if available
      });
      const apiDuration = Math.round(performance.now() - assignStartTime);
      console.log(`✅ [T+${apiDuration}ms] Court assigned result:`, result);
    } catch (error) {
      const apiDuration = Math.round(performance.now() - assignStartTime);
      console.error(`❌ [T+${apiDuration}ms] assignCourtWithPlayers threw error:`, error);
      Tennis.UI.toast(error.message || 'Failed to assign court. Please try again.', {
        type: 'error',
      });
      setIsAssigning(false);
      return;
    }

    if (!result.ok) {
      console.log('❌ assignCourtWithPlayers returned ok:false:', result.code, result.message);
      // Handle "Court occupied" race condition
      if (result.code === 'COURT_OCCUPIED') {
        Tennis.UI.toast('This court was just taken. Refreshing...', { type: 'warning' });
        // Board subscription will auto-refresh, but force immediate refresh
        await backend.queries.refresh();
        setIsAssigning(false);
        return;
      }
      // Handle mobile location errors - offer QR fallback
      if (API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
        setGpsFailedPrompt(true);
        setIsAssigning(false);
        return;
      }
      Tennis.UI.toast(result.message || 'Failed to assign court', { type: 'error' });
      setIsAssigning(false);
      return;
    }

    // Success - clear the assigning flag
    setIsAssigning(false);

    // Success! Board subscription will auto-refresh from signal
    const successTime = Math.round(performance.now() - assignStartTime);
    console.log(`✅ [T+${successTime}ms] Court assignment successful, updating UI state...`);

    // Determine if court change should be allowed
    // Rule: Can change if there are other free courts, OR if user took an overtime court and there are other overtime courts
    const tookOvertimeCourt = result.displacement !== null;

    // Get court availability from API-sourced state
    const courtData = getCourtData();
    const Av = Tennis.Domain.availability || Tennis.Domain.Availability;
    const currentTimestamp = new Date();

    // Get free and overtime courts from the normalized board data
    const courtInfo = Av.getFreeCourtsInfo({
      data: courtData,
      now: currentTimestamp,
      blocks: courtData?.blocks || [],
      wetSet: new Set(),
    });

    // Exclude the just-assigned court from both lists
    const otherFreeCourts = (courtInfo.free || []).filter((n) => n !== courtNumber);
    const otherOvertimeCourts = (courtInfo.overtime || []).filter((n) => n !== courtNumber);

    // If only one court was selectable when user chose, no change option
    const allowCourtChange =
      selectableCountAtSelection !== null ? selectableCountAtSelection > 1 : false;

    // Update UI state based on result
    setJustAssignedCourt(courtNumber);
    setAssignedSessionId(result.session?.id || null); // Capture session ID for ball purchases

    // Construct replacedGroup from displacement.participants for SuccessScreen messaging
    const replacedGroupFromDisplacement =
      result.displacement?.participants?.length > 0
        ? {
            players: result.displacement.participants.map((name) => ({ name })),
            endTime: result.displacement.restoreUntil,
          }
        : null;
    setReplacedGroup(replacedGroupFromDisplacement);
    setDisplacement(result.displacement); // Will be null if no overtime was displaced
    setOriginalCourtData(null);
    setIsChangingCourt(false);
    setWasOvertimeCourt(false);
    setHasAssignedCourt(true); // Track that this group has a court
    setCanChangeCourt(allowCourtChange); // Only true if alternatives exist
    setChangeTimeRemaining(CONSTANTS.CHANGE_COURT_TIMEOUT_SEC);
    setIsTimeLimited(result.isTimeLimited || result.isInheritedEndTime || false); // Track if time was limited
    setTimeLimitReason(result.timeLimitReason || (result.isTimeLimited ? 'block' : null));
    setShowSuccess(true);

    const uiUpdateTime = Math.round(performance.now() - assignStartTime);
    console.log(`✅ [T+${uiUpdateTime}ms] UI state updated, showSuccess=true`);

    // Mobile: notify parent on success
    if (window.__mobileSuccessHandler) {
      window.__mobileSuccessHandler(justAssignedCourt || courtNumber);
    }
    // Mobile: trigger success signal
    dbg('Registration: Checking mobile success signal...', !!window.UI?.__mobileSendSuccess__);
    if (window.UI?.__mobileSendSuccess__) {
      dbg('Registration: Calling mobile success signal');
      window.UI.__mobileSendSuccess__();
    }

    // Auto-reset timer for court assignment (same as waitlist)
    if (!window.__mobileFlow) {
      clearSuccessResetTimer();
      successResetTimerRef.current = setTimeout(() => {
        successResetTimerRef.current = null;
        resetForm();
      }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
    }

    if (allowCourtChange) {
      const timer = setInterval(() => {
        setChangeTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanChangeCourt(false);
            // Don't call resetForm() - let user decide when to leave
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Change court assignment
  const changeCourt = () => {
    if (!canChangeCourt || !justAssignedCourt) return;

    const data = getCourtData();

    // Store the original court data if it was an overtime court we replaced
    const currentCourtData = data.courts[justAssignedCourt - 1];
    if (replacedGroup) {
      // We had replaced an overtime court - restore the original group
      setOriginalCourtData({
        players: replacedGroup.players,
        startTime: null, // We don't have the original start time
        endTime: replacedGroup.endTime,
        assignedAt: null,
        duration: null,
      });
    }

    // Check if we're leaving an overtime court selection
    const wasOvertime = replacedGroup !== null;

    // Don't clear the court yet - just navigate to selection
    setShowSuccess(false);
    setIsChangingCourt(true);
    setWasOvertimeCourt(wasOvertime);
    setCurrentScreen('court', 'changeCourt');
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

  // Send group to waitlist
  const sendGroupToWaitlist = async (group) => {
    // Prevent double-submit
    if (isJoiningWaitlist) {
      console.log('⚠️ Waitlist join already in progress, ignoring duplicate request');
      return;
    }

    const traceId = `WL-${Date.now()}`;
    try {
      console.log(`🔴🔴🔴 [${traceId}] sendGroupToWaitlist START`);
      console.log(`🔴 [${traceId}] Raw group argument:`, JSON.stringify(group, null, 2));
      console.log(
        `🔴 [${traceId}] Current currentGroup state:`,
        JSON.stringify(currentGroup, null, 2)
      );

      if (!group || !group.length) {
        console.warn('[waitlist] no players selected');
        return;
      }

      // Build the players array (keep guests for waitlist display)
      const players = group
        .map((p) => {
          const mapped = {
            id: String(p.id || '').trim(),
            name: String(p.name || '').trim(),
            memberNumber: p.memberNumber || p.member_number || p.id,
            ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
            ...(p.sponsor && { sponsor: p.sponsor }),
          };
          console.log(
            `🔴 [${traceId}] Mapping player: ${p.name} (id=${p.id}, memberNumber=${p.memberNumber}) -> ${mapped.name} (id=${mapped.id}, memberNumber=${mapped.memberNumber})`
          );
          return mapped;
        })
        .filter((p) => p && p.id && p.name);

      const guests = group.filter((p) => p.isGuest).length;

      console.log(`🔴 [${traceId}] Final players to send:`, JSON.stringify(players, null, 2));
      console.log(
        '[waitlist] calling addToWaitlist with',
        players.map((p) => p.name),
        'guests:',
        guests
      );

      // Validation check
      const validation = validateGroupCompat(players, guests);
      if (!validation.ok) {
        try {
          Tennis.UI.toast(validation.errors.join(' '), { type: 'error' });
        } catch {
          /* Tennis.UI not available */
        }
        showAlertMessage(validation.errors.join('\n'));
        return;
      }

      // Check if any player is already playing
      for (const player of group) {
        const playerStatus = isPlayerAlreadyPlaying(player.id);
        if (playerStatus.isPlaying && playerStatus.location !== 'current') {
          showAlertMessage(`${player.name} is already registered elsewhere.`);
          return;
        }
      }

      // Determine group type from player count
      const groupType = players.length <= 2 ? 'singles' : 'doubles';

      // Get geolocation for mobile (required by backend for geofence validation)
      const mobileLocation = await getMobileGeolocation();

      const waitlistStartTime = performance.now();
      console.log('[waitlist] [T+0ms] Calling backend.commands.joinWaitlistWithPlayers:', {
        playerCount: players.length,
        groupType,
        players: players.map((p) => `${p.name}(mn=${p.memberNumber})`),
        mobileLocation: mobileLocation ? 'provided' : 'not-mobile',
      });

      setIsJoiningWaitlist(true);
      const result = await backend.commands.joinWaitlistWithPlayers({
        players,
        groupType,
        ...(mobileLocation || {}), // Spread latitude/longitude if available
      });
      const apiDuration = Math.round(performance.now() - waitlistStartTime);
      setIsJoiningWaitlist(false);
      console.log(`[waitlist] [T+${apiDuration}ms] Result:`, result);
      console.log(`[waitlist] [T+${apiDuration}ms] result.data:`, result.data);
      console.log(`[waitlist] [T+${apiDuration}ms] __mobileFlow:`, window.__mobileFlow);

      if (result.ok) {
        // Extract waitlist entry info from API response
        const waitlistEntry = result.data?.waitlist;
        const entryId = waitlistEntry?.id;
        const position = waitlistEntry?.position || result.position || 1;
        console.log(
          `[waitlist] [T+${apiDuration}ms] Extracted - entryId:`,
          entryId,
          'position:',
          position
        );

        // Store the position from response for the success screen
        if (position) {
          setWaitlistPosition(position);
          console.log(`[waitlist] [T+${apiDuration}ms] Position:`, position);
        }

        // Store waitlist entry ID in sessionStorage for mobile users
        // This enables auto-assignment when they tap a court
        if (entryId && window.__mobileFlow) {
          sessionStorage.setItem('mobile-waitlist-entry-id', entryId);
          console.log(`[waitlist] [T+${apiDuration}ms] Stored mobile waitlist entry ID:`, entryId);

          // Notify parent (MobileBridge) about waitlist join so it can broadcast state
          try {
            window.parent.postMessage({ type: 'waitlist:joined', entryId }, '*');
            console.log(`[waitlist] [T+${apiDuration}ms] Sent waitlist:joined to parent`);
          } catch (e) {
            console.warn('[waitlist] Failed to notify parent of waitlist join:', e);
          }
        } else {
          console.log(
            `[waitlist] [T+${apiDuration}ms] NOT storing entry ID - entryId:`,
            entryId,
            '__mobileFlow:',
            window.__mobileFlow
          );
        }

        // Toast and rely on board subscription for UI refresh
        Tennis?.UI?.toast?.(`Added to waiting list (position ${position})`, {
          type: 'success',
        });
        const successTime = Math.round(performance.now() - waitlistStartTime);
        console.log(`[waitlist] [T+${successTime}ms] joined ok, UI updated`);
      } else {
        console.error(`[waitlist] [T+${apiDuration}ms] Failed:`, result.code, result.message);
        // Handle mobile location errors - offer QR fallback
        if (API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
          setGpsFailedPrompt(true);
          return;
        }
        Tennis?.UI?.toast?.(result.message || 'Could not join waitlist', { type: 'error' });
      }
    } catch (e) {
      setIsJoiningWaitlist(false);
      console.error('[waitlist] failed:', e);
      Tennis?.UI?.toast?.('Could not join waitlist', { type: 'error' });
    }
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
   *
   * NOTE: This function includes navigation (setCurrentScreen) intentionally.
   * It is a verbatim extraction of the previous inline timeout sequence.
   * Do not reorder. See "Timeout Reset Parity Audit" for intentional redesign later.
   */
  function applyInactivityTimeoutExitSequence() {
    setCurrentGroup([]);
    setShowSuccess(false);
    setMemberNumber('');
    setCurrentMemberId(null);
    setJustAssignedCourt(null);
    setReplacedGroup(null);
    setDisplacement(null);
    setOriginalCourtData(null);
    setCanChangeCourt(false);
    setIsTimeLimited(false);
    setCurrentScreen('home', 'sessionTimeout');
    setSearchInput('');
    setShowSuggestions(false);
    setShowAddPlayer(false);
    setAddPlayerSearch('');
    setShowAddPlayerSuggestions(false);
    setHasWaitlistPriority(false);
    setSelectedCourtToClear(null);
    setClearCourtStep(1);
    setIsChangingCourt(false);
    setWasOvertimeCourt(false);
  }

  // Reset form
  const resetForm = () => {
    // Clear any pending success timer to prevent stale callbacks
    clearSuccessResetTimer();

    setCurrentGroup([]);
    setShowSuccess(false);
    setMemberNumber('');
    setCurrentMemberId(null);
    setJustAssignedCourt(null);
    setAssignedSessionId(null); // Clear session ID from previous assignment
    setReplacedGroup(null);
    setDisplacement(null);
    setOriginalCourtData(null);
    setCanChangeCourt(false);
    setIsTimeLimited(false);
    setCurrentScreen('home', 'resetForm');
    setSearchInput('');
    setShowSuggestions(false);
    setShowAddPlayer(false);
    setAddPlayerSearch('');
    setShowAddPlayerSuggestions(false);
    setHasWaitlistPriority(false);
    setCurrentWaitlistEntryId(null); // Clear waitlist entry ID
    setWaitlistPosition(0); // Reset API waitlist position
    // NOTE: Do NOT clear mobile-waitlist-entry-id here - user is still on waitlist
    // It should only be cleared when they successfully get assigned a court
    setSelectedCourtToClear(null);
    setClearCourtStep(1);
    setIsChangingCourt(false);
    setWasOvertimeCourt(false);
    setCourtToMove(null);
    setMoveToCourtNum(null);
    setHasAssignedCourt(false);
    frequentPartnersCacheRef.current = {};
    setShowGuestForm(false);
    setGuestName('');
    setGuestSponsor('');
    setShowGuestNameError(false);
    setShowSponsorError(false);
    // Reset uncleared session tracking
    setRegistrantStreak(0);
    setShowStreakModal(false);
    setStreakAcknowledged(false);
  };

  // Fetch frequent partners from API
  const FREQUENT_PARTNERS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  const fetchFrequentPartners = useCallback(
    async (memberId) => {
      console.log('[FP] fetchFrequentPartners called', {
        memberId,
        cacheState: frequentPartnersCacheRef.current[memberId],
        timestamp: Date.now(),
      });

      if (!memberId || !backend?.queries) {
        console.log('[FP] No memberId or backend, returning');
        return;
      }

      // Check cache status - don't refetch if loading or still fresh
      const cached = frequentPartnersCacheRef.current[memberId];
      const now = Date.now();

      if (cached?.status === 'loading') {
        console.log('[FP] Already loading, skipping');
        return; // Already in flight
      }
      if (cached?.status === 'ready' && now - cached.ts < FREQUENT_PARTNERS_CACHE_TTL_MS) {
        console.log('[FP] Cache hit, using cached data');
        setFrequentPartners(cached.data);
        return; // Use cached data (still fresh)
      }

      // Mark as loading before fetch starts
      console.log('[FP] Starting fetch, marking as loading');
      frequentPartnersCacheRef.current[memberId] = { status: 'loading', ts: Date.now() };
      setFrequentPartnersLoading(true);

      try {
        const result = await backend.queries.getFrequentPartners(memberId);
        if (result.ok && result.partners) {
          // Transform API response to expected format
          const partners = result.partners.map((p) => ({
            player: {
              id: p.member_id,
              name: p.display_name,
              memberNumber: p.member_number,
              memberId: p.member_id,
            },
            count: p.play_count,
          }));

          frequentPartnersCacheRef.current[memberId] = {
            status: 'ready',
            data: partners,
            ts: Date.now(),
          };
          setFrequentPartners(partners);
          setFrequentPartnersLoading(false);
        } else {
          frequentPartnersCacheRef.current[memberId] = { status: 'error', ts: Date.now() };
          setFrequentPartnersLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch frequent partners:', error);
        frequentPartnersCacheRef.current[memberId] = { status: 'error', ts: Date.now() };
        setFrequentPartners([]);
        setFrequentPartnersLoading(false);
      }
    },
    [backend]
  );

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
      setAlertMessage(`Group is full (max ${CONSTANTS.MAX_PLAYERS} players)`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), CONSTANTS.ALERT_DISPLAY_MS);
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

  // Get autocomplete suggestions (uses API members)
  const getAutocompleteSuggestions = (input) => {
    if (!input || input.length < 1) return [];

    const suggestions = [];
    const lowerInput = input.toLowerCase();

    // If API members haven't loaded yet, return empty
    if (apiMembers.length === 0) {
      return [];
    }

    apiMembers.forEach((apiMember) => {
      const displayName = apiMember.display_name || apiMember.name || '';
      const memberNumber = apiMember.member_number || '';

      // Split the name into parts
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts[nameParts.length - 1] || '';

      // Check if input matches the beginning of first or last name, or member number
      if (
        firstName.toLowerCase().startsWith(lowerInput) ||
        lastName.toLowerCase().startsWith(lowerInput) ||
        memberNumber.startsWith(input)
      ) {
        suggestions.push({
          memberNumber: memberNumber,
          member: {
            id: apiMember.id, // This is the UUID from API
            name: displayName,
            accountId: apiMember.account_id,
            isPrimary: apiMember.is_primary,
            unclearedStreak: apiMember.uncleared_streak || apiMember.unclearedStreak || 0,
          },
          displayText: `${displayName} (#${memberNumber})`,
        });
      }
    });

    // Sort suggestions to prioritize first name matches, then last name matches
    suggestions.sort((a, b) => {
      const aName = a.member.name.toLowerCase();
      const bName = b.member.name.toLowerCase();
      const aFirstName = aName.split(' ')[0];
      const bFirstName = bName.split(' ')[0];

      // Prioritize first name matches
      if (aFirstName.startsWith(lowerInput) && !bFirstName.startsWith(lowerInput)) return -1;
      if (!aFirstName.startsWith(lowerInput) && bFirstName.startsWith(lowerInput)) return 1;

      // Then sort alphabetically
      return aName.localeCompare(bName);
    });

    return suggestions.slice(0, CONSTANTS.MAX_AUTOCOMPLETE_RESULTS);
  };

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion) => {
    // Validate member number exists and is valid
    if (!suggestion || !suggestion.memberNumber || !suggestion.member) {
      showAlertMessage('Invalid member selection. Please try again.');
      return;
    }

    // Block selection if player is already on a court
    const memberId = suggestion.member?.id;
    if (memberId) {
      const playerStatus = isPlayerAlreadyPlaying(memberId);
      if (playerStatus.isPlaying && playerStatus.location === 'court') {
        const playerName = suggestion.member?.displayName || suggestion.member?.name || 'Player';
        Tennis.UI.toast(`${playerName} is already on Court ${playerStatus.courtNumber}`, {
          type: 'error',
        });
        setSearchInput('');
        setShowSuggestions(false);
        return;
      }
    }

    // API member already has correct id (UUID) and accountId
    const enrichedMember = {
      id: suggestion.member.id, // UUID from API
      name: suggestion.member.name,
      memberNumber: suggestion.memberNumber,
      accountId: suggestion.member.accountId,
      memberId: suggestion.member.id, // Same as id for API members
      unclearedStreak: suggestion.member.unclearedStreak || 0,
    };

    console.log('[handleSuggestionClick] suggestion.member:', suggestion.member);
    console.log('[handleSuggestionClick] enrichedMember:', enrichedMember);
    console.log('[handleSuggestionClick] unclearedStreak:', enrichedMember?.unclearedStreak);

    // Early duplicate guard - if player is already playing/waiting, stop here
    if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
      setSearchInput('');
      setShowSuggestions(false);
      return; // Don't navigate to group screen
    }

    const playerStatus = isPlayerAlreadyPlaying(suggestion.member.id);

    // Check if this player is on waitlist - show helpful message and block
    if (playerStatus.isPlaying && playerStatus.location === 'waiting') {
      const availableCourts = getAvailableCourts(false);
      const hasCourtReady =
        (playerStatus.position === 1 && availableCourts.length > 0) ||
        (playerStatus.position === 2 && availableCourts.length >= 2);

      if (hasCourtReady) {
        // Court is available for this waitlist player - direct them to use the CTA button
        Tennis.UI.toast(`A court is ready for you! Tap the green button below.`, { type: 'info' });
      } else {
        // Player is on waitlist but no court available yet
        const playerName = suggestion.member?.displayName || suggestion.member?.name || 'Player';
        Tennis.UI.toast(
          `${playerName} is already on the waitlist (position ${playerStatus.position})`,
          { type: 'error' }
        );
      }
      setSearchInput('');
      setShowSuggestions(false);
      return;
    }

    // Don't set member number if player is engaged elsewhere
    // This prevents navigation to group screen

    // Set member number and member ID now that we know player can proceed
    setMemberNumber(suggestion.memberNumber);
    setCurrentMemberId(suggestion.member.id);

    // Pre-fetch frequent partners (fire-and-forget)
    fetchFrequentPartners(suggestion.member.id);

    // Normal flow for new players - we already checked conflicts above
    setSearchInput('');
    setShowSuggestions(false);

    // Add player to current group - include all API data for proper backend lookup
    const newPlayer = {
      name: enrichedMember.name,
      memberNumber: suggestion.memberNumber,
      id: enrichedMember.id,
      memberId: enrichedMember.memberId || enrichedMember.id,
      phone: enrichedMember.phone || '',
      ranking: enrichedMember.ranking || null,
      winRate: enrichedMember.winRate || 0.5,
      // API-specific fields
      accountId: enrichedMember.accountId,
    };
    console.log('🔵 Adding player to group:', newPlayer);

    // Track registrant's uncleared streak (first player added is the registrant)
    // Fetch fresh member data to get current streak (cached apiMembers may be stale)
    if (currentGroup.length === 0) {
      let currentStreak = 0;
      try {
        // Invalidate cache to ensure fresh data
        backend.directory.invalidateAccount(suggestion.memberNumber);
        const freshMemberData = await backend.directory.getMembersByAccount(
          suggestion.memberNumber
        );
        const freshMember = freshMemberData?.find((m) => m.id === suggestion.member.id);
        currentStreak = freshMember?.unclearedStreak || freshMember?.uncleared_streak || 0;
        console.log('📊 Fresh member data:', freshMember);
        console.log('📊 Registrant streak (fresh):', currentStreak);
      } catch (error) {
        console.error('📊 Failed to fetch fresh streak, using cached:', error);
        currentStreak = enrichedMember.unclearedStreak || 0;
      }
      setRegistrantStreak(currentStreak);
      setStreakAcknowledged(false); // Reset acknowledgment for new registration
    }

    setCurrentGroup([...currentGroup, newPlayer]);

    setCurrentScreen('group', 'handleSuggestionClick');
  };

  // ============================================
  // Admin Screen Handlers
  // ============================================

  const handleClearAllCourts = async () => {
    const confirmClear = window.confirm(
      'Clear all courts? This will make all courts immediately available.'
    );
    if (confirmClear) {
      const result = await backend.admin.clearAllCourts({
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        reason: 'admin_clear_all',
      });
      if (result.ok) {
        showAlertMessage(
          `All courts cleared successfully (${result.sessionsEnded || 0} sessions ended)`
        );
      } else {
        showAlertMessage(result.message || 'Failed to clear courts');
      }
    }
  };

  const handleBlockCreate = async () => {
    if (selectedCourtsToBlock.length === 0) {
      showAlertMessage('Please select at least one court to block');
      return;
    }
    if (!blockMessage) {
      showAlertMessage('Please enter a block reason');
      return;
    }
    if (!blockEndTime) {
      showAlertMessage('Please select an end time');
      return;
    }

    setBlockingInProgress(true);

    const boardData = getCourtData();
    const currentTimeNow = new Date();

    // Calculate start time
    let startTime;
    if (blockStartTime === 'now') {
      startTime = new Date();
    } else {
      startTime = new Date();
      const [hours, minutes] = blockStartTime.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    // Calculate end time based on the selected time
    const [endHours, endMinutes] = blockEndTime.split(':');
    let endTime = new Date(startTime);
    endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

    // If end time is before start time, assume next day
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    console.log('Block times calculated:', {
      blockStartTimeInput: blockStartTime,
      currentTime: currentTimeNow.toLocaleString(),
      startTime: startTime.toLocaleString(),
      endTime: endTime.toLocaleString(),
    });

    // Map block message to block type
    const blockTypeMap = {
      'WET COURT': 'wet',
      'COURT WORK': 'maintenance',
      LESSON: 'lesson',
    };
    const blockType = blockTypeMap[blockMessage.toUpperCase()] || 'other';

    // Block selected courts via backend API
    let successCount = 0;
    let failedCourts = [];

    for (const courtNum of selectedCourtsToBlock) {
      const court = boardData.courts[courtNum - 1];
      if (!court || !court.id) {
        failedCourts.push(courtNum);
        continue;
      }

      const result = await backend.admin.createBlock({
        courtId: court.id,
        blockType: blockType,
        title: blockMessage,
        startsAt: startTime.toISOString(),
        endsAt: endTime.toISOString(),
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      });

      if (result.ok) {
        successCount++;
      } else {
        failedCourts.push(courtNum);
        console.error(`Failed to block court ${courtNum}:`, result.message);
      }
    }

    if (failedCourts.length === 0) {
      showAlertMessage(`${successCount} court(s) blocked successfully`);
    } else if (successCount > 0) {
      showAlertMessage(
        `${successCount} court(s) blocked. Failed: courts ${failedCourts.join(', ')}`
      );
    } else {
      showAlertMessage(`Failed to block courts: ${failedCourts.join(', ')}`);
    }
  };

  const handleCancelBlock = async (blockId, courtNum) => {
    const result = await backend.admin.cancelBlock({
      blockId: blockId,
      deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
    });
    if (result.ok) {
      showAlertMessage(`Court ${courtNum} unblocked`);
    } else {
      showAlertMessage(result.message || 'Failed to unblock court');
    }
  };

  const handleAdminClearCourt = async (courtNum) => {
    await clearCourt(courtNum);
    showAlertMessage(`Court ${courtNum} cleared`);
  };

  const handleMoveCourt = async (fromCourtNum, toCourtNum) => {
    try {
      const data = getCourtData();
      const fromCourt = data.courts[fromCourtNum - 1];
      const toCourt = data.courts[toCourtNum - 1];

      if (!fromCourt?.id) {
        showAlertMessage('Source court not found');
        setCourtToMove(null);
        return;
      }

      // For empty courts, get ID from API board
      let toCourtId = toCourt?.id;
      if (!toCourtId) {
        const board = await backend.queries.getBoard();
        const targetCourt = board?.courts?.find((c) => c.number === toCourtNum);
        toCourtId = targetCourt?.id;
      }

      if (!toCourtId) {
        showAlertMessage('Destination court not found');
        setCourtToMove(null);
        return;
      }

      const result = await backend.commands.moveCourt({
        fromCourtId: fromCourt.id,
        toCourtId: toCourtId,
      });

      if (result.ok) {
        showAlertMessage(`Court ${fromCourtNum} moved to Court ${toCourtNum}`);
      } else {
        showAlertMessage(result.message || 'Failed to move court');
      }
    } catch (err) {
      console.error('[moveCourt] Error:', err);
      showAlertMessage(err.message || 'Failed to move court');
    }

    setCourtToMove(null);
  };

  const handleClearWaitlist = async () => {
    const data = getCourtData();
    const confirmClear = window.confirm('Clear the waitlist? This will remove all waiting groups.');
    if (confirmClear) {
      let successCount = 0;
      let failCount = 0;

      for (const group of data.waitlist) {
        if (!group.id) {
          failCount++;
          continue;
        }

        const result = await backend.admin.removeFromWaitlist({
          waitlistEntryId: group.id,
          reason: 'admin_clear_all',
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        });

        if (result.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount === 0) {
        showAlertMessage(`Waitlist cleared (${successCount} groups removed)`);
      } else if (successCount > 0) {
        showAlertMessage(`Removed ${successCount} groups, ${failCount} failed`);
      } else {
        showAlertMessage('Failed to clear waitlist');
      }
    }
  };

  const handleRemoveFromWaitlist = async (group) => {
    if (!group.id) {
      showAlertMessage('Cannot remove: group ID not found');
      return;
    }

    const result = await backend.admin.removeFromWaitlist({
      waitlistEntryId: group.id,
      reason: 'admin_removed',
      deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
    });

    if (result.ok) {
      showAlertMessage('Group removed from waitlist');
    } else {
      showAlertMessage(result.message || 'Failed to remove group');
    }
  };

  const handleReorderWaitlist = async (fromIndex, toIndex) => {
    const data = getCourtData();
    const movedGroup = data.waitlist[fromIndex];
    const entryId = movedGroup?.id || movedGroup?.group?.id;

    if (entryId && window.Tennis?.Commands?.reorderWaitlist) {
      try {
        await window.Tennis.Commands.reorderWaitlist({
          entryId,
          newPosition: toIndex,
        });
        showAlertMessage(`Group moved to position ${toIndex + 1}`);
      } catch (err) {
        showAlertMessage(err.message || 'Failed to move group');
      }
    } else {
      console.warn('[Waitlist Reorder] API not available, action skipped');
      showAlertMessage('Waitlist reorder requires API — feature temporarily unavailable');
    }

    setWaitlistMoveFrom(null);
  };

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
      setShowPriceSuccess(true);
      setPriceError('');
      setTimeout(() => setShowPriceSuccess(false), 3000);
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

  const handleGroupSearchChange = (e) => {
    markUserTyping();
    const value = e.target.value || '';
    setSearchInput(value);

    // Check for admin code (immediate, no debounce)
    if (value === CONSTANTS.ADMIN_CODE) {
      setCurrentScreen('admin', 'adminCodeEntered');
      setSearchInput('');
      return;
    }

    setShowSuggestions(value.length > 0);
  };

  const handleGroupSearchFocus = () => {
    markUserTyping();
    setShowSuggestions(searchInput.length > 0);
  };

  const handleGroupSuggestionClick = async (suggestion) => {
    await handleSuggestionClick(suggestion);
    // For mobile flow, clear search after adding first player
    if (window.__mobileFlow) {
      setSearchInput('');
      setShowSuggestions(false);
    }
  };

  const handleAddPlayerSearchChange = (e) => {
    markUserTyping();
    setAddPlayerSearch(e.target.value || '');
    setShowAddPlayerSuggestions((e.target.value || '').length > 0);
  };

  const handleAddPlayerSearchFocus = () => {
    markUserTyping();
    setShowAddPlayerSuggestions(addPlayerSearch.length > 0);
  };

  const handleAddPlayerSuggestionClick = async (suggestion) => {
    // Validate suggestion
    if (!suggestion || !suggestion.member || !suggestion.member.id) {
      showAlertMessage('Invalid player selection. Please try again.');
      return;
    }

    // API member already has correct data
    const enrichedMember = {
      id: suggestion.member.id,
      name: suggestion.member.name,
      memberNumber: suggestion.memberNumber,
      accountId: suggestion.member.accountId,
      memberId: suggestion.member.id,
    };

    // Early duplicate guard
    if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
      setAddPlayerSearch('');
      setShowAddPlayer(false);
      setShowAddPlayerSuggestions(false);
      return;
    }

    // Check for duplicate in current group
    if (!guardAgainstGroupDuplicate(enrichedMember, currentGroup)) {
      Tennis.UI.toast(`${enrichedMember.name} is already in this group`);
      setAddPlayerSearch('');
      setShowAddPlayer(false);
      setShowAddPlayerSuggestions(false);
      return;
    }

    // Check if player is already playing or on waitlist
    if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
      setAddPlayerSearch('');
      setShowAddPlayer(false);
      setShowAddPlayerSuggestions(false);
      return; // Toast message already shown by guardAddPlayerEarly
    }

    const playerStatus = isPlayerAlreadyPlaying(suggestion.member.id);

    if (
      playerStatus.isPlaying &&
      playerStatus.location === 'waiting' &&
      playerStatus.position === 1
    ) {
      const data = getCourtData();
      const availCourts = getAvailableCourts(false);

      if (availCourts.length > 0) {
        const firstWaitlistEntry = data.waitlist[0];
        // Domain: entry.group.players
        const players = firstWaitlistEntry.group?.players || [];
        setCurrentGroup(
          players.map((p) => ({
            id: p.memberId,
            name: p.displayName || 'Unknown',
            memberNumber: findMemberNumber(p.memberId),
          }))
        );

        setHasWaitlistPriority(true);

        data.waitlist.shift();
        saveCourtData(data);

        setAddPlayerSearch('');
        setShowAddPlayer(false);
        setShowAddPlayerSuggestions(false);
        return;
      }
    }

    if (!playerStatus.isPlaying) {
      // Validate we're not exceeding max players
      if (currentGroup.length >= CONSTANTS.MAX_PLAYERS) {
        showAlertMessage(`Group is full (max ${CONSTANTS.MAX_PLAYERS} players)`);
        setAddPlayerSearch('');
        setShowAddPlayer(false);
        setShowAddPlayerSuggestions(false);
        return;
      }

      const newPlayer = {
        name: enrichedMember.name,
        memberNumber: suggestion.memberNumber,
        id: enrichedMember.id,
        memberId: enrichedMember.memberId || enrichedMember.id,
        phone: enrichedMember.phone || '',
        ranking: enrichedMember.ranking || null,
        winRate: enrichedMember.winRate || 0.5,
        accountId: enrichedMember.accountId,
      };
      console.log('🔵 Adding player to group (add player flow):', newPlayer);
      setCurrentGroup([...currentGroup, newPlayer]);
      setAddPlayerSearch('');
      setShowAddPlayer(false);
      setShowAddPlayerSuggestions(false);
    } else {
      let message = '';
      if (playerStatus.location === 'court') {
        message = `${playerStatus.playerName} is already playing on Court ${playerStatus.courtNumber}`;
      } else if (playerStatus.location === 'waiting') {
        message = `${playerStatus.playerName} is already in a group waiting for a court`;
      } else if (playerStatus.location === 'current') {
        message = `${playerStatus.playerName} is already in your group`;
      }
      setAlertMessage(message);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), CONSTANTS.ALERT_DISPLAY_MS);
    }
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

  const handleRemovePlayer = (idx) => {
    setCurrentGroup(currentGroup.filter((_, i) => i !== idx));
  };

  const handleSelectSponsor = (memberNum) => {
    setGuestSponsor(memberNum);
    setShowSponsorError(false);
  };

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
    setGuestCounter(guestCounter + 1);

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

  const handleCancelGuest = () => {
    setShowGuestForm(false);
    setGuestName('');
    setGuestSponsor('');
    setShowGuestNameError(false);
    setShowSponsorError(false);
  };

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
    console.log('[REG DEBUG] Join Waitlist clicked');
    await sendGroupToWaitlist(currentGroup);
    setShowSuccess(true);
    // Mobile: notify parent on success
    if (window.__mobileSuccessHandler) {
      window.__mobileSuccessHandler(null); // waitlist doesn't have court
    }
    // Mobile: trigger success signal
    if (window.UI?.__mobileSendSuccess__) {
      window.UI.__mobileSendSuccess__();
    }

    // Don't auto-reset in mobile flow - let the overlay handle timing
    if (!window.__mobileFlow) {
      clearSuccessResetTimer();
      successResetTimerRef.current = setTimeout(() => {
        successResetTimerRef.current = null;
        resetForm();
      }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
    }
  };

  const handleGroupGoBack = () => {
    if (window.__mobileFlow) {
      // Check if we're in Clear Court workflow - handle navigation properly
      if (currentScreen === 'clearCourt') {
        // In Clear Court, Back should go to previous step or exit
        if (clearCourtStep > 1) {
          setClearCourtStep(clearCourtStep - 1);
        } else {
          // Exit Clear Court workflow
          window.parent.postMessage({ type: 'resetRegistration' }, '*');
        }
      } else {
        // For other screens, close the registration overlay
        window.parent.postMessage({ type: 'resetRegistration' }, '*');
      }
    } else {
      // Desktop behavior - go back to home
      setCurrentGroup([]);
      setMemberNumber('');
      setCurrentMemberId(null);
      setCurrentScreen('home', 'groupGoBack');
    }
  };

  // Silent assign loading screen (mobile waitlist assignment in progress)
  if (mobileMode === 'silent-assign') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
          <p className="text-xl font-medium">Assigning court...</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    const isCourtAssignment = justAssignedCourt !== null;
    const data = getCourtData();
    // Find court by number (API may return courts in different order than array index)
    const courts = data.courts || [];
    const assignedCourt = justAssignedCourt
      ? courts.find((c) => c.number === justAssignedCourt) || courts[justAssignedCourt - 1]
      : null;

    let estimatedWait = 0;
    let position = 0;
    if (!isCourtAssignment) {
      // Position in queue - use API position if available
      position = waitlistPosition > 0 ? waitlistPosition : data.waitlist.length;

      // Calculate estimated wait time using domain functions
      try {
        const A = window.Tennis?.Domain?.Availability;
        const W = window.Tennis?.Domain?.Waitlist;

        if (A && W && A.getFreeCourtsInfo && A.getNextFreeTimes && W.estimateWaitForPositions) {
          const now = new Date();

          // Build blocks array from court-level blocks (active) and upcomingBlocks (future)
          const activeBlocks = data.courts
            .filter((c) => c?.block)
            .map((c) => ({
              courtNumber: c.number,
              startTime: c.block.startsAt || c.block.startTime,
              endTime: c.block.endsAt || c.block.endTime,
              isWetCourt: (c.block.reason || c.block.title || '').toLowerCase().includes('wet'),
            }));
          const upcomingBlocks = (data.upcomingBlocks || []).map((b) => ({
            courtNumber: b.courtNumber,
            startTime: b.startTime || b.startsAt,
            endTime: b.endTime || b.endsAt,
            isWetCourt: (b.reason || b.title || '').toLowerCase().includes('wet'),
          }));
          const allBlocks = [...activeBlocks, ...upcomingBlocks];

          // Build wetSet from currently active wet blocks
          const wetSet = new Set(
            allBlocks
              .filter(
                (b) => b.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
              )
              .map((b) => b.courtNumber)
          );

          // Convert data to domain format
          const domainData = { courts: data.courts };

          // Get availability info
          const info = A.getFreeCourtsInfo({ data: domainData, now, blocks: allBlocks, wetSet });
          const nextTimes = A.getNextFreeTimes({
            data: domainData,
            now,
            blocks: allBlocks,
            wetSet,
          });

          // Calculate ETA using domain function
          const avgGame = window.Tennis?.Config?.Timing?.AVG_GAME || CONSTANTS.AVG_GAME_TIME_MIN;
          const etas = W.estimateWaitForPositions({
            positions: [position],
            currentFreeCount: info.free?.length || 0,
            nextFreeTimes: nextTimes,
            avgGameMinutes: avgGame,
          });
          estimatedWait = etas[0] || 0;
        } else {
          // Domain functions not available - fallback to simple calculation
          estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
        }
      } catch (e) {
        console.error('Error calculating wait time:', e);
        estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
      }
    }

    return (
      <>
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />
        <SuccessScreen
          isCourtAssignment={isCourtAssignment}
          justAssignedCourt={justAssignedCourt}
          assignedCourt={assignedCourt}
          sessionId={assignedSessionId}
          replacedGroup={replacedGroup}
          canChangeCourt={canChangeCourt}
          changeTimeRemaining={changeTimeRemaining}
          position={position}
          estimatedWait={estimatedWait}
          currentGroup={currentGroup}
          mobileCountdown={window.__mobileFlow ? mobileCountdown : null}
          isMobile={!!window.__mobileFlow}
          isTimeLimited={isTimeLimited}
          timeLimitReason={timeLimitReason}
          registrantStreak={registrantStreak}
          onChangeCourt={changeCourt}
          onNewRegistration={() => {
            resetForm();
            setCurrentScreen('home', 'successNewRegistration');
          }}
          onHome={resetForm}
          ballPriceCents={ballPriceCents}
          onPurchaseBalls={async (sessionId, accountId, options) => {
            console.log('[Ball Purchase] App.jsx handler called', {
              sessionId,
              accountId,
              options,
            });
            const result = await backend.commands.purchaseBalls({
              sessionId,
              accountId,
              splitBalls: options?.splitBalls || false,
              splitAccountIds: options?.splitAccountIds || null,
            });
            console.log('[Ball Purchase] API result from backend.commands.purchaseBalls', result);
            return result;
          }}
          onLookupMemberAccount={async (memberNumber) => {
            const members = await backend.directory.getMembersByAccount(memberNumber);
            return members;
          }}
          TENNIS_CONFIG={TENNIS_CONFIG}
          getCourtBlockStatus={getCourtBlockStatus}
          upcomingBlocks={data.upcomingBlocks}
          blockWarningMinutes={blockWarningMinutes}
        />
      </>
    );
  }

  // Home screen (combined Welcome + Search)
  if (currentScreen === 'home') {
    return (
      <>
        {checkingLocation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-xl">
              <p className="text-lg">{TENNIS_CONFIG.GEOLOCATION.CHECKING_MESSAGE}</p>
            </div>
          </div>
        )}
        <HomeScreen
          // Search functionality
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          isSearching={isSearching}
          effectiveSearchInput={effectiveSearchInput}
          getAutocompleteSuggestions={getAutocompleteSuggestions}
          handleSuggestionClick={handleSuggestionClick}
          markUserTyping={markUserTyping}
          // Navigation
          setCurrentScreen={setCurrentScreen}
          setCurrentGroup={setCurrentGroup}
          setMemberNumber={setMemberNumber}
          setHasWaitlistPriority={setHasWaitlistPriority}
          setCurrentWaitlistEntryId={setCurrentWaitlistEntryId}
          findMemberNumber={findMemberNumber}
          // CTA state
          canFirstGroupPlay={canFirstGroupPlay}
          canSecondGroupPlay={canSecondGroupPlay}
          firstWaitlistEntry={firstWaitlistEntry}
          secondWaitlistEntry={secondWaitlistEntry}
          firstWaitlistEntryData={firstWaitlistEntryData}
          secondWaitlistEntryData={secondWaitlistEntryData}
          // UI state
          showAlert={showAlert}
          alertMessage={alertMessage}
          isMobileView={isMobileView}
          CONSTANTS={CONSTANTS}
          // Clear court
          onClearCourtClick={() => {
            checkLocationAndProceed(() => setCurrentScreen('clearCourt', 'homeClearCourtClick'));
          }}
        />
      </>
    );
  }

  // Admin screen
  if (currentScreen === 'admin') {
    const data = getCourtData();
    return (
      <AdminScreen
        // Data
        data={data}
        currentTime={currentTime}
        // Alert state (read only)
        showAlert={showAlert}
        alertMessage={alertMessage}
        // Block modal state
        showBlockModal={showBlockModal}
        setShowBlockModal={setShowBlockModal}
        selectedCourtsToBlock={selectedCourtsToBlock}
        setSelectedCourtsToBlock={setSelectedCourtsToBlock}
        blockMessage={blockMessage}
        setBlockMessage={setBlockMessage}
        blockStartTime={blockStartTime}
        setBlockStartTime={setBlockStartTime}
        blockEndTime={blockEndTime}
        setBlockEndTime={setBlockEndTime}
        blockingInProgress={blockingInProgress}
        setBlockingInProgress={setBlockingInProgress}
        // Move state
        courtToMove={courtToMove}
        setCourtToMove={setCourtToMove}
        waitlistMoveFrom={waitlistMoveFrom}
        setWaitlistMoveFrom={setWaitlistMoveFrom}
        // Price state
        ballPriceInput={ballPriceInput}
        setBallPriceInput={setBallPriceInput}
        priceError={priceError}
        setPriceError={setPriceError}
        showPriceSuccess={showPriceSuccess}
        setShowPriceSuccess={setShowPriceSuccess}
        // Callbacks
        onClearAllCourts={handleClearAllCourts}
        onClearCourt={handleAdminClearCourt}
        onCancelBlock={handleCancelBlock}
        onBlockCreate={handleBlockCreate}
        onMoveCourt={handleMoveCourt}
        onClearWaitlist={handleClearWaitlist}
        onRemoveFromWaitlist={handleRemoveFromWaitlist}
        onReorderWaitlist={handleReorderWaitlist}
        onPriceUpdate={handlePriceUpdate}
        onExit={handleExitAdmin}
        showAlertMessage={showAlertMessage}
        // Utilities
        getCourtBlockStatus={getCourtBlockStatus}
        CONSTANTS={CONSTANTS}
      />
    );
  }

  // Group management screen
  if (currentScreen === 'group') {
    return (
      <>
        <GroupScreen
          // Data
          data={data}
          currentGroup={currentGroup}
          memberNumber={memberNumber}
          availableCourts={availableCourts}
          frequentPartners={frequentPartners}
          frequentPartnersLoading={frequentPartnersLoading}
          // UI state
          showAlert={showAlert}
          alertMessage={alertMessage}
          showTimeoutWarning={showTimeoutWarning}
          isMobileView={isMobileView}
          // Mobile flow
          mobileFlow={mobileFlow}
          preselectedCourt={preselectedCourt}
          // Search state
          searchInput={searchInput}
          showSuggestions={showSuggestions}
          effectiveSearchInput={effectiveSearchInput}
          // Add player state
          showAddPlayer={showAddPlayer}
          addPlayerSearch={addPlayerSearch}
          showAddPlayerSuggestions={showAddPlayerSuggestions}
          effectiveAddPlayerSearch={effectiveAddPlayerSearch}
          // Guest form state
          showGuestForm={showGuestForm}
          guestName={guestName}
          guestSponsor={guestSponsor}
          showGuestNameError={showGuestNameError}
          showSponsorError={showSponsorError}
          // Callbacks
          onSearchChange={handleGroupSearchChange}
          onSearchFocus={handleGroupSearchFocus}
          onSuggestionClick={handleGroupSuggestionClick}
          onAddPlayerSearchChange={handleAddPlayerSearchChange}
          onAddPlayerSearchFocus={handleAddPlayerSearchFocus}
          onAddPlayerSuggestionClick={handleAddPlayerSuggestionClick}
          onToggleAddPlayer={handleToggleAddPlayer}
          onToggleGuestForm={handleToggleGuestForm}
          onRemovePlayer={handleRemovePlayer}
          onSelectSponsor={handleSelectSponsor}
          onGuestNameChange={handleGuestNameChange}
          onAddGuest={handleAddGuest}
          onCancelGuest={handleCancelGuest}
          onAddFrequentPartner={addFrequentPartner}
          onSelectCourt={handleGroupSelectCourt}
          onJoinWaitlist={handleGroupJoinWaitlist}
          joiningWaitlist={isJoiningWaitlist}
          onGoBack={handleGroupGoBack}
          onStartOver={resetForm}
          // Utilities
          getAutocompleteSuggestions={getAutocompleteSuggestions}
          isPlayerAlreadyPlaying={isPlayerAlreadyPlaying}
          sameGroup={sameGroup}
          CONSTANTS={CONSTANTS}
        />

        {/* Uncleared Session Streak Modal (streak >= 3) */}
        {showStreakModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Clear Court Reminder</h3>
                <p className="text-gray-600">
                  Your last {registrantStreak} sessions were ended without using &apos;Clear
                  Court&apos;. Please tap Clear Court when you finish so others can get on faster.
                </p>
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={streakAcknowledged}
                  onChange={(e) => setStreakAcknowledged(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-gray-700 font-medium">Got it</span>
              </label>

              <button
                onClick={handleStreakAcknowledge}
                disabled={!streakAcknowledged}
                className={`w-full py-3 px-6 rounded-xl font-medium transition-colors ${
                  streakAcknowledged
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Return to Select Your Court
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Court selection screen
  if (currentScreen === 'court') {
    // When a group has already been assigned a court, treat it like changing courts
    const isSelectingDifferentCourt = isChangingCourt || hasAssignedCourt;

    // Get court data from React state
    const reactData = getCourtData();
    const data = reactData;
    const courts = data.courts || [];

    // Compute court selection using centralized policy
    const courtSelection = computeRegistrationCourtSelection(courts);
    const unoccupiedCourts = courtSelection.primaryCourts;
    const overtimeCourts = courtSelection.fallbackOvertimeCourts;

    // Selectable: unoccupied first, then overtime if no unoccupied
    const selectableCourts = courtSelection.showingOvertimeCourts
      ? overtimeCourts
      : unoccupiedCourts;
    const selectable = selectableCourts.map((c) => c.number);

    const hasWaiters = (data.waitlist?.length || 0) > 0;

    // If user has waitlist priority, they should ONLY see FREE courts (not overtime)
    // Otherwise, only show courts when no one is waiting
    let availableCourts = [];
    if (hasWaitlistPriority) {
      // For waitlist priority users, prefer unoccupied courts, fallback to overtime
      const unoccupiedNumbers = unoccupiedCourts.map((c) => c.number);
      const overtimeNumbers = overtimeCourts.map((c) => c.number);

      if (unoccupiedNumbers.length > 0) {
        availableCourts = unoccupiedNumbers;
      } else if (overtimeNumbers.length > 0) {
        availableCourts = overtimeNumbers;
      }
    } else if (!hasWaiters && selectable.length > 0) {
      // Normal users get all selectable courts when no waitlist
      availableCourts = selectable;
    }

    const showCourtTiles = availableCourts.length > 0;

    console.log('[COURT SCREEN] Debug:', {
      hasWaiters,
      hasWaitlistPriority,
      selectableLength: selectable.length,
      showCourtTiles,
      availableCourtsLength: availableCourts.length,
    });

    const hasWaitlistEntries = data.waitlist.length > 0;
    const isFirstInWaitlist = currentGroup.some((player) => isPlayerNextInWaitlist(player.id));

    // Check if showing overtime courts
    // Only count truly free courts as unoccupied (not blocked or wet courts)
    const hasUnoccupiedCourts = data.courts.some((court, index) => {
      const courtNumber = index + 1;

      // Check if court is blocked or wet
      const blockStatus = getCourtBlockStatus(courtNumber);
      if (blockStatus && blockStatus.isCurrent) {
        return false; // Blocked courts are not unoccupied
      }

      // Check if court is wet (you might have wet court logic here)
      // Add wet court check if needed

      // Only count as unoccupied if it's truly free AND selectable
      // Domain format: court.session.group.players
      const isTrulyFree =
        !court ||
        court.wasCleared ||
        (!court.session && court.history) ||
        !court.session?.group?.players?.length;

      // Additional check: must also be in the selectable courts list
      const isSelectable = availableCourts.includes(courtNumber);

      return isTrulyFree && isSelectable;
    });
    const showingOvertimeCourts =
      availableCourts.length > 0 && !hasUnoccupiedCourts && !isSelectingDifferentCourt;

    return (
      <>
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />

        {/* QR Scanner modal for mobile GPS fallback */}
        {showQRScanner && (
          <QRScanner
            onScan={(token) => {
              console.log('[Mobile] QR token scanned:', token);
              setLocationToken(token);
              setShowQRScanner(false);
              setGpsFailedPrompt(false);
              Tennis.UI.toast('Location verified! You can now register.', { type: 'success' });
            }}
            onClose={() => {
              setShowQRScanner(false);
            }}
            onError={(err) => {
              console.error('[Mobile] QR scanner error:', err);
            }}
          />
        )}

        {/* GPS failed prompt for mobile */}
        {gpsFailedPrompt && API_CONFIG.IS_MOBILE && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Required</h3>
              <p className="text-gray-600 mb-4">
                We couldn&apos;t detect your location. Please scan the QR code on the kiosk screen
                to verify you&apos;re at the club.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Scan QR Code
                </button>
                <button
                  onClick={() => setGpsFailedPrompt(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <CourtSelectionScreen
          availableCourts={availableCourts}
          showingOvertimeCourts={showingOvertimeCourts}
          hasWaitingGroups={hasWaitlistEntries}
          waitingGroupsCount={data.waitlist.length}
          currentGroup={currentGroup}
          isMobileView={isMobileView}
          upcomingBlocks={data.upcomingBlocks}
          onCourtSelect={async (courtNum) => {
            // If changing courts, handle the court change
            if (isChangingCourt && justAssignedCourt) {
              // If we have displacement info, use atomic undo which ends takeover + restores displaced
              if (
                displacement &&
                displacement.displacedSessionId &&
                displacement.takeoverSessionId
              ) {
                try {
                  const undoResult = await backend.commands.undoOvertimeTakeover({
                    takeoverSessionId: displacement.takeoverSessionId,
                    displacedSessionId: displacement.displacedSessionId,
                  });
                  // If undo failed with conflict, fall back to clearCourt
                  if (!undoResult.ok) {
                    console.warn(
                      '[Displacement] Undo returned conflict, falling back to clearCourt:',
                      undoResult
                    );
                    await clearCourt(justAssignedCourt, 'Bumped');
                  }
                  // If ok: true, the undo endpoint already ended the takeover session - no clearCourt needed
                } catch (err) {
                  console.error('[Displacement] Undo takeover failed:', err);
                  // Fallback: just clear the court if undo fails
                  await clearCourt(justAssignedCourt, 'Bumped');
                }
              } else {
                // No displacement - just clear the court normally
                await clearCourt(justAssignedCourt, 'Bumped');
              }
              setDisplacement(null); // Clear ONLY after court change is complete
            }
            console.log(
              '[Change Court Debug] availableCourts at selection:',
              availableCourts,
              'length:',
              availableCourts.length
            );
            await assignCourtToGroup(courtNum, availableCourts.length);
            // setDisplacement(null) removed from here - it was clearing the state prematurely
            setIsChangingCourt(false);
            setWasOvertimeCourt(false);
          }}
          onJoinWaitlist={async () => {
            await sendGroupToWaitlist(currentGroup);
            setShowSuccess(true);
            // Mobile: notify parent on success
            if (window.__mobileSuccessHandler) {
              window.__mobileSuccessHandler(null); // waitlist doesn't have court
            }
            // Mobile: trigger success signal
            if (window.UI?.__mobileSendSuccess__) {
              window.UI.__mobileSendSuccess__();
            }
            // Don't auto-reset in mobile flow - let the overlay handle timing
            if (!window.__mobileFlow) {
              clearSuccessResetTimer();
              successResetTimerRef.current = setTimeout(() => {
                successResetTimerRef.current = null;
                resetForm();
              }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
            }
          }}
          onAssignNext={async () => {
            console.log('[ASSIGN NEXT] Button clicked');
            try {
              // Get current board state
              const board = await backend.queries.getBoard();

              // Find first waiting entry
              const firstWaiting = board?.waitlist?.find((e) => e.status === 'waiting');
              if (!firstWaiting) {
                showAlertMessage('No entries waiting in queue');
                return;
              }

              // Find first available court
              const availableCourt = board?.courts?.find((c) => c.isAvailable && !c.isBlocked);
              if (!availableCourt) {
                showAlertMessage('No courts available');
                return;
              }

              // Assign using API
              const res = await backend.commands.assignFromWaitlist({
                waitlistEntryId: firstWaiting.id,
                courtId: availableCourt.id,
              });

              if (res?.ok) {
                Tennis?.UI?.toast?.(`Assigned to Court ${availableCourt.number}`, {
                  type: 'success',
                });
                showAlertMessage(`Assigned to Court ${availableCourt.number}`);
              } else {
                Tennis?.UI?.toast?.(res?.message || 'Failed assigning next', { type: 'error' });
                showAlertMessage(res?.message || 'Failed assigning next');
              }
            } catch (err) {
              console.error('[ASSIGN NEXT] Error:', err);
              showAlertMessage(err.message || 'Failed assigning next');
            }
          }}
          onGoBack={() => {
            setCurrentScreen('group', 'courtGoBack');
            setIsChangingCourt(false);
            setWasOvertimeCourt(false);
            // If we were changing courts and had replaced an overtime court, restore it
            if (isChangingCourt && justAssignedCourt && originalCourtData) {
              try {
                const data = getCourtData();
                data.courts[justAssignedCourt - 1] = originalCourtData;
                saveCourtData(data);
                setOriginalCourtData(null);
              } catch (error) {
                console.error('Failed to restore court:', error);
              }
            }
          }}
          onStartOver={resetForm}
        />
      </>
    );
  }

  // Clear court screen
  if (currentScreen === 'clearCourt') {
    return (
      <ClearCourtScreen
        clearCourtStep={clearCourtStep}
        setClearCourtStep={setClearCourtStep}
        selectedCourtToClear={selectedCourtToClear}
        setSelectedCourtToClear={setSelectedCourtToClear}
        clearCourt={clearCourt}
        resetForm={resetForm}
        showAlert={showAlert}
        alertMessage={alertMessage}
        getCourtsOccupiedForClearing={getCourtsOccupiedForClearing}
        courtData={getCourtData()}
        CONSTANTS={CONSTANTS}
        TennisBusinessLogic={TennisBusinessLogic}
      />
    );
  }

  return null;
};

export default TennisRegistration;
