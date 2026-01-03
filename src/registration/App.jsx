// Registration App - Vite-bundled React
// Converted from inline Babel to ES module JSX
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Import shared utilities from @lib
// IMPORTANT: Import all @lib items in one import to avoid rollup circular dependency issues
import {
  STORAGE as STORAGE_SHARED,
  EVENTS as EVENTS_SHARED,
  readJSON as _sharedReadJSON,
  writeJSON as _sharedWriteJSON,
  getEmptyData as _sharedGetEmptyData,
  readDataSafe as _sharedReadDataSafe,
  COURT_COUNT,
  TennisCourtDataStore,
  getCourtBlockStatus as _sharedGetCourtBlockStatus,
  getUpcomingBlockWarning as _sharedGetUpcomingBlockWarning,
  TENNIS_CONFIG as _sharedTennisConfig,
  // Services (also from @lib)
  DataValidation,
  TennisBusinessLogic,
  tennisBusinessLogic,
} from '@lib';

// Import registration-specific services
import { GeolocationService, geolocationService } from './services';

// Import API config for mobile detection
import { API_CONFIG } from '../lib/apiConfig.js';

// Import Domain engagement helpers
import { findEngagementByMemberId, getEngagementMessage } from '../lib/domain/engagement.js';

// toLegacyBoard removed - now using pure Domain Board directly

// Import extracted UI components
import {
  Users,
  Bell,
  Clock,
  UserPlus,
  ChevronRight,
  Check,
  AlertDisplay,
  ToastHost,
  QRScanner,
} from './components';

// Import extracted screens and modals
import {
  WelcomeScreen,
  SuccessScreen,
  CourtSelectionScreen,
  SearchScreen,
  ClearCourtScreen,
} from './screens';
import { BlockWarningModal } from './modals';

// Import custom hooks
import { useDebounce } from './hooks';

// API Backend Integration
import { getTennisService } from './services/index.js';
import { getRealtimeClient } from '@lib/RealtimeClient.js';

// TennisBackend interface layer
import { createBackend, DenialCodes } from './backend/index.js';

// TennisBackend singleton instance
const backend = createBackend();

// Import utility functions
import {
  normalizeName as _utilNormalizeName,
  findEngagementFor as _utilFindEngagementFor,
  validateGuestName,
  getCourtsOccupiedForClearing as _utilGetCourtsOccupiedForClearing,
} from './utils';

// Global service aliases for backward compatibility with other scripts
window.Tennis = window.Tennis || {};
window.TennisBusinessLogic = window.TennisBusinessLogic || TennisBusinessLogic;
window.GeolocationService = window.GeolocationService || GeolocationService;

// Access window.APP_UTILS for backward compatibility
const U = window.APP_UTILS || {};

// === Shared Core Integration Flag ===
const USE_SHARED_CORE = true;
const USE_SHARED_DOMAIN = true;
const USE_DOMAIN_ETA_PREVIEW = true;
const DEBUG = false; // Gate noisy logs
const dbg = (...args) => {
  if (DEBUG) console.log(...args);
};

// Coalesce multiple update events into a single refresh
let __refreshPending = false;
function scheduleAvailabilityRefresh() {
  if (__refreshPending) return;
  __refreshPending = true;
  setTimeout(() => {
    __refreshPending = false;
    const fn = (typeof window.loadData === 'function' && window.loadData) || null;
    if (fn) fn();
  }, 0);
}

// These will be populated from window.Tennis after modules load
const Config = window.Tennis?.Config || null;
const Storage = window.Tennis?.Storage;
const Events = window.Tennis?.Events;
const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
const USE_DOMAIN_SELECTABLE = true;
let dataStore = window.Tennis?.DataStore || null;

// Domain module handles
const Time = window.Tennis?.Domain?.time || window.Tennis?.Domain?.Time;
const Avail = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
const Wait = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist;
const W = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist;

// Storage helpers from shared module
const readJSON = _sharedReadJSON;
const writeJSON = _sharedWriteJSON;
const getEmptyData = _sharedGetEmptyData;
const readDataSafe = () =>
  _sharedReadDataSafe ? _sharedReadDataSafe() : readJSON(STORAGE_SHARED?.DATA) || getEmptyData();
const STORAGE = Storage?.KEYS || STORAGE_SHARED;
const EVENTS = EVENTS_SHARED || { UPDATE: 'tennisDataUpdate' };

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
  } catch (e) {
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

// ---- Core constants (declared only; not replacing existing usages) ----
const APP = {
  COURT_COUNT: 12,
  PLAYERS: { MIN: 1, MAX: 4 },
  DURATION_MIN: { SINGLES: 60, DOUBLES: 90, MAX: 240 },
};

// ---- Dev flag & assert (no UI change) ----
const DEV = typeof location !== 'undefined' && /localhost|127\.0\.0\.1/.test(location.host);
const assert = (cond, msg, obj) => {
  if (DEV && !cond) console.warn('ASSERT:', msg, obj || '');
};

// ---- Logger (no UI change) ----
const LOG_LEVEL = DEV ? 'debug' : 'warn'; // 'debug'|'info'|'warn'|'silent'
const _PREFIX = '[Registration]';
const log = {
  debug: (...a) => {
    if (['debug'].includes(LOG_LEVEL)) console.debug(_PREFIX, ...a);
  },
  info: (...a) => {
    if (['debug', 'info'].includes(LOG_LEVEL)) console.info(_PREFIX, ...a);
  },
  warn: (...a) => {
    if (['debug', 'info', 'warn'].includes(LOG_LEVEL)) console.warn(_PREFIX, ...a);
  },
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
    recentlyCleared: [],
  }));

  // IMPORTANT: These state variables must be declared BEFORE any useEffect that references them
  // to avoid TDZ (Temporal Dead Zone) errors when the code is minified
  const [currentScreen, _setCurrentScreen] = useState('welcome');
  const setCurrentScreen = (screen, source = 'unknown') => {
    console.log(`[NAV] ${currentScreen} → ${screen} (from: ${source})`);
    console.trace('[NAV] Stack trace');
    _setCurrentScreen(screen);
  };
  const [availableCourts, setAvailableCourts] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [waitlistPosition, setWaitlistPosition] = useState(0); // Position from API response
  const [operatingHours, setOperatingHours] = useState(null); // Operating hours from API

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

      // Compute court categories using new availability flags
      // Exclude blocked courts from all selectable categories
      const unoccupiedCourts = courts.filter((c) => c.isAvailable && !c.isBlocked);
      const overtimeCourts = courts.filter((c) => c.isOvertime && !c.isBlocked);

      // Selectable courts: unoccupied first, then overtime if no unoccupied
      let selectableCourts;
      if (unoccupiedCourts.length > 0) {
        selectableCourts = unoccupiedCourts;
      } else if (overtimeCourts.length > 0) {
        selectableCourts = overtimeCourts;
      } else {
        selectableCourts = []; // No courts available, show waitlist
      }

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
  }, [getDataService]);
  window.loadData = loadData; // expose for coalescer/tests

  // Debug: log whenever availableCourts changes
  useEffect(() => {
    console.log('🔄 availableCourts state changed:', availableCourts);
  }, [availableCourts]);

  // Expose setData globally for scheduleAvailabilityRefresh
  useEffect(() => {
    window.__setRegistrationData = setData;
    return () => {
      window.__setRegistrationData = null;
    };
  }, []);

  // Cleanup success reset timer on unmount
  useEffect(() => {
    return () => {
      if (successResetTimerRef.current) {
        clearTimeout(successResetTimerRef.current);
        successResetTimerRef.current = null;
      }
    };
  }, []);

  // Expose current data globally for guardAddPlayerEarly
  useEffect(() => {
    window.__registrationData = data;
    return () => {
      window.__registrationData = null;
    };
  }, [data]);

  // PHASE1C: Redundant - subscribeToBoardChanges handles initial fetch
  // useEffect(() => {
  //   loadData();
  // }, []);

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

  // Auto-clear expired courts function
  useEffect(() => {
    // function autoClearExpiredCourts() { /* disabled per policy */ }
    const autoClearExpiredCourts = async () => {
      /* disabled per policy - players remain on-court until manual clear or bump */
    };

    // Run immediately on mount
    // autoClearExpiredCourts(); /* disabled per policy */

    // Then run every 30 seconds
    // const interval = setInterval(autoClearExpiredCourts, 30000); /* disabled per policy */

    // return () => clearInterval(interval); /* disabled per policy */
  }, []); // Empty dependency array so it only sets up once

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
  const [replacedGroup, setReplacedGroup] = useState(null);
  const [displacement, setDisplacement] = useState(null);
  // Shape: { displacedSessionId, displacedCourtId, takeoverSessionId, restoreUntil } | null
  const [originalCourtData, setOriginalCourtData] = useState(null);
  const [canChangeCourt, setCanChangeCourt] = useState(false);
  const [changeTimeRemaining, setChangeTimeRemaining] = useState(
    CONSTANTS.CHANGE_COURT_TIMEOUT_SEC
  );
  const [isTimeLimited, setIsTimeLimited] = useState(false);
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

  function __findEngagementFor(name, data) {
    const norm = __normalizeName(name);
    // 1) playing: scan courts (Domain format: session.group.players)
    const courts = Array.isArray(data?.courts) ? data.courts : [];
    for (let i = 0; i < courts.length; i++) {
      const session = courts[i]?.session;
      if (!session) continue;
      const players = Array.isArray(session.group?.players) ? session.group.players : [];
      for (const p of players) {
        if (
          __normalizeName(p) === norm ||
          __normalizeName(p?.name) === norm ||
          __normalizeName(p?.displayName) === norm
        ) {
          return { type: 'playing', court: i + 1 };
        }
      }
    }
    // 2) waitlist: scan waitlist (Domain format: group.players)
    const wg = Array.isArray(data?.waitlist) ? data.waitlist : [];
    for (let i = 0; i < wg.length; i++) {
      const players = Array.isArray(wg[i]?.group?.players) ? wg[i].group.players : [];
      for (const p of players) {
        if (
          __normalizeName(p) === norm ||
          __normalizeName(p?.name) === norm ||
          __normalizeName(p?.displayName) === norm
        ) {
          return { type: 'waitlist', position: i + 1 };
        }
      }
    }
    return null;
  }

  function guardAddPlayerEarly(player) {
    // Get memberId from player (API members have id = memberId)
    const memberId = player?.memberId || player?.id;

    // Use current board state from React
    const board = window.__registrationData || {};

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
        } catch (error) {
          setBallPriceInput(TENNIS_CONFIG.PRICING.TENNIS_BALLS.toFixed(2));
        }
      }
    };
    loadAdminSettings();
  }, [currentScreen]);

  // Simplified member database
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
            } catch {}
          }
        });
      };
    }
  }, []);

  // Expose React state for mobile guards
  useEffect(() => {
    window.__reactState = {
      currentGroup,
      currentScreen,
      showSuccess,
    };
  }, [currentGroup, currentScreen, showSuccess]);

  // Mobile: Watch for success state changes and send signal
  useEffect(() => {
    if (showSuccess && window.__mobileFlow && window.top !== window.self) {
      dbg('Registration: Success state changed to true, sending mobile signal');
      const courtNumber = window.__preselectedCourt || justAssignedCourt || null;
      dbg('Registration: Court number for success:', courtNumber);
      try {
        window.parent.postMessage({ type: 'registration:success', courtNumber: courtNumber }, '*');
        dbg('Registration: Direct success message sent');
      } catch (e) {
        if (DEBUG) console.log('Registration: Error in direct success message:', e);
      }

      // Start countdown for mobile
      setMobileCountdown(5);
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
  }, [showSuccess, justAssignedCourt]);

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
        // Reset all form state
        setCurrentGroup([]);
        setShowSuccess(false);
        setMemberNumber('');
        setJustAssignedCourt(null);
        setReplacedGroup(null);
        setDisplacement(null);
        setOriginalCourtData(null);
        setCanChangeCourt(false);
        setIsTimeLimited(false);
        setCurrentScreen('welcome', 'sessionTimeout');
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
  }, [currentScreen]); // Only depend on currentScreen, not lastActivity

  // Show alert message helper
  const showAlertMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), CONSTANTS.ALERT_DISPLAY_MS);
  };

  // Get court data using the data service (synchronous for React renders)
  const getCourtData = () => {
    // For synchronous usage, use cached data from state
    return data;

    // Check for auto-timeout courts and expired blocks
    const maxDuration = CONSTANTS.MAX_PLAY_DURATION_MS;
    const now = new Date().getTime();
    let hasChanges = false;

    data.courts = data.courts.map((court, index) => {
      if (court) {
        // Skip already cleared courts
        if (court.wasCleared) {
          return court;
        }

        // Check if court is currently blocked using new system
        const blockStatus = getCourtBlockStatus(index + 1);
        const isCurrentlyBlocked = blockStatus && blockStatus.isCurrent;

        // Get start time (Domain: session.startedAt)
        const startTime = court.session?.startedAt || court.startTime;

        // Check for overtime courts (only if not blocked and has start time)
        if (startTime && !isCurrentlyBlocked) {
          const startTimeMs = new Date(startTime).getTime();
          const timePlayed = now - startTimeMs;

          if (timePlayed > maxDuration) {
            // Auto-clear this court using the same logic as manual clear
            console.log(
              `Auto-clearing court ${index + 1} after ${CONSTANTS.MAX_PLAY_DURATION_MIN / 60} hours`
            );
            hasChanges = true;

            // Handle Domain structure when clearing
            if (court.session) {
              // Domain structure - clear session
              court.session = null;
              if (!court.history) court.history = [];
              // Could add to history here if needed
            } else {
              // Legacy structure - mark as cleared
              court.endTime = new Date().toISOString();
              court.wasCleared = true;
            }

            return court;
          }
        }
      }
      return court;
    });

    // Clean up expired recentlyCleared sessions (keep for 4 hours after clearing)
    if (data.recentlyCleared && data.recentlyCleared.length > 0) {
      const originalLength = data.recentlyCleared.length;
      const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000); // 4 hours ago

      data.recentlyCleared = data.recentlyCleared.filter((session) => {
        // Keep sessions that were cleared less than 4 hours ago
        return new Date(session.clearedAt).getTime() > fourHoursAgo.getTime();
      });

      if (data.recentlyCleared.length !== originalLength) {
        hasChanges = true;
      }
    }

    // NOTE: saveData removed — auto-expire cleanup now handled by API/server
    // hasChanges flag preserved for potential future use or logging

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

  const assignCourtToGroup = async (courtNumber) => {
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
      try {
        // Try to infer the variables you use in this scope:
        const playersVar =
          typeof selectedPlayers !== 'undefined'
            ? selectedPlayers
            : typeof groupPlayers !== 'undefined'
              ? groupPlayers
              : typeof players !== 'undefined'
                ? players
                : [];

        const hasGuestFlag =
          typeof hasGuest !== 'undefined'
            ? hasGuest
            : typeof includeGuest !== 'undefined'
              ? includeGuest
              : typeof guest !== 'undefined'
                ? guest
                : false;

        // Heuristics to detect a guest row in the list
        const playersArr = Array.isArray(playersVar) ? playersVar.filter(Boolean) : [];
        const guestRows = playersArr.filter(
          (p) =>
            p?.isGuest === true ||
            (typeof p?.type === 'string' && p.type.toLowerCase() === 'guest') ||
            (typeof p?.name === 'string' && p.name.trim().toLowerCase() === 'guest')
        );

        // What the current code thinks the size is (best guess: try common expressions)
        let sizeRaw = NaN;
        try {
          if (typeof size !== 'undefined') sizeRaw = size;
        } catch {}
        if (Number.isNaN(sizeRaw)) {
          try {
            sizeRaw = playersArr.length + (hasGuestFlag ? 1 : 0);
          } catch {}
        }

        console.warn('[GroupSizeDiag] about to show MAX SIZE error — details:', {
          playersCount: playersArr.length,
          guestRowsCount: guestRows.length,
          hasGuestFlag: !!hasGuestFlag,
          sizeRaw,
        });
        console.warn(
          '[GroupSizeDiag] players snapshot:',
          playersArr.map((p) => ({
            name: p?.name ?? null,
            isGuest: !!p?.isGuest,
            type: p?.type ?? null,
            memberNumber: p?.memberNumber ?? null,
          }))
        );
      } catch (e) {
        console.warn('[GroupSizeDiag] logging failed:', e);
      }
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

        // Board subscription will auto-refresh
        console.log('✅ Waitlist assignment successful, waiting for board refresh signal');

        // Update UI state
        setJustAssignedCourt(courtNumber);
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

    // Allow change if:
    // 1. There are other free courts available, OR
    // 2. User took an overtime court AND there are other overtime courts to switch to
    const allowCourtChange =
      otherFreeCourts.length > 0 || (tookOvertimeCourt && otherOvertimeCourts.length > 0);

    // Update UI state based on result
    console.log('[Displacement] API response displacement:', result.displacement);
    setJustAssignedCourt(courtNumber);

    // Construct replacedGroup from displacement.participants for SuccessScreen messaging
    const replacedGroupFromDisplacement =
      result.displacement?.participants?.length > 0
        ? {
            players: result.displacement.participants.map((name) => ({ name })),
            endTime: result.displacement.restoreUntil,
          }
        : null;
    setReplacedGroup(replacedGroupFromDisplacement);
    console.log('[Displacement] Setting displacement state:', result.displacement);
    setDisplacement(result.displacement); // Will be null if no overtime was displaced
    setOriginalCourtData(null);
    setIsChangingCourt(false);
    setWasOvertimeCourt(false);
    setHasAssignedCourt(true); // Track that this group has a court
    setCanChangeCourt(allowCourtChange); // Only true if alternatives exist
    setChangeTimeRemaining(CONSTANTS.CHANGE_COURT_TIMEOUT_SEC);
    setIsTimeLimited(result.isTimeLimited || false); // Track if time was limited
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
        } catch {}
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

      if (result.ok) {
        // Store the position from response for the success screen
        if (result.position) {
          setWaitlistPosition(result.position);
          console.log(`[waitlist] [T+${apiDuration}ms] Position:`, result.position);
        }
        // Toast and rely on board subscription for UI refresh
        Tennis?.UI?.toast?.(`Added to waiting list (position ${result.position})`, {
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

  // Reset form
  const resetForm = () => {
    // Clear any pending success timer to prevent stale callbacks
    clearSuccessResetTimer();

    setCurrentGroup([]);
    setShowSuccess(false);
    setMemberNumber('');
    setJustAssignedCourt(null);
    setReplacedGroup(null);
    setDisplacement(null);
    setOriginalCourtData(null);
    setCanChangeCourt(false);
    setIsTimeLimited(false);
    setCurrentScreen('welcome', 'resetForm');
    setSearchInput('');
    setShowSuggestions(false);
    setShowAddPlayer(false);
    setAddPlayerSearch('');
    setShowAddPlayerSuggestions(false);
    setHasWaitlistPriority(false);
    setCurrentWaitlistEntryId(null); // Clear waitlist entry ID
    setWaitlistPosition(0); // Reset API waitlist position
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
  };

  // Get all members
  const getAllMembers = () => {
    const allMembers = {};
    Object.values(memberDatabase).forEach((member) => {
      member.familyMembers.forEach((player) => {
        allMembers[player.id] = player;
      });
    });
    return allMembers;
  };

  // Get frequent partners (uses API members)
  const getFrequentPartners = (memberNumber) => {
    if (apiMembers.length === 0) {
      return [];
    }

    // Find the current member to exclude them
    const currentMember = apiMembers.find((m) => m.member_number === memberNumber);
    if (!currentMember) {
      return [];
    }

    // Use member_number as seed for consistent random generation
    const seed = parseInt(memberNumber) || 0;

    // Get all potential partners (excluding self and family members on same account)
    const potentialPartners = [];

    apiMembers.forEach((apiMember) => {
      // Skip self and family members (same account_id)
      if (apiMember.id === currentMember.id || apiMember.account_id === currentMember.account_id) {
        return;
      }

      // Check if this player is currently playing (use UUID)
      const playerStatus = isPlayerAlreadyPlaying(apiMember.id);
      if (!playerStatus.isPlaying) {
        // Generate a consistent "play count" based on both member numbers
        const partnerSeed = parseInt(apiMember.member_number) || 0;
        const combinedSeed = seed + partnerSeed;
        const playCount = (combinedSeed * 9301 + 49297) % 233280;
        const normalizedCount = (playCount % 10) + 1;

        // Build player object with API data
        const player = {
          id: apiMember.id, // UUID from API
          name: apiMember.display_name || apiMember.name || '',
          memberNumber: apiMember.member_number,
          accountId: apiMember.account_id,
          memberId: apiMember.id,
          isPrimary: apiMember.is_primary,
        };

        potentialPartners.push({
          player: player,
          count: normalizedCount,
        });
      }
    });

    // Sort by play count and return top 6
    return potentialPartners
      .sort((a, b) => b.count - a.count)
      .slice(0, CONSTANTS.MAX_FREQUENT_PARTNERS);
  };

  // Check if player is already playing with detailed info
  const isPlayerAlreadyPlaying = (playerId) => {
    const data = getCourtData();
    return TennisBusinessLogic.isPlayerAlreadyPlaying(playerId, data, currentGroup);
  };

  // Generate player status message
  const getPlayerStatusMessage = (playerStatus) => {
    if (!playerStatus.isPlaying) return null;

    switch (playerStatus.location) {
      case 'court':
        return `${playerStatus.playerName} is already playing on Court ${playerStatus.courtNumber}`;
      case 'waiting':
        return `${playerStatus.playerName} is already in a group waiting for a court`;
      case 'current':
        return `${playerStatus.playerName} is already in your group`;
      default:
        return `${playerStatus.playerName} is already registered`;
    }
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
    if (!guardAddPlayerEarly(enriched)) {
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

    // API member already has correct id (UUID) and accountId
    const enrichedMember = {
      id: suggestion.member.id, // UUID from API
      name: suggestion.member.name,
      memberNumber: suggestion.memberNumber,
      accountId: suggestion.member.accountId,
      memberId: suggestion.member.id, // Same as id for API members
    };

    // Early duplicate guard - if player is already playing/waiting, stop here
    if (!guardAddPlayerEarly(enrichedMember)) {
      setSearchInput('');
      setShowSuggestions(false);
      return; // Don't navigate to group screen
    }

    const playerStatus = isPlayerAlreadyPlaying(suggestion.member.id);

    // Don't set member number if player is engaged elsewhere
    // This prevents navigation to group screen

    // Set member number now that we know player can proceed
    setMemberNumber(suggestion.memberNumber);

    // Check if this player is in the first waiting group and courts are available
    if (
      playerStatus.isPlaying &&
      playerStatus.location === 'waiting' &&
      playerStatus.position === 1
    ) {
      const data = getCourtData();
      const availableCourts = getAvailableCourts(false);

      if (availableCourts.length > 0) {
        // Player is in first waiting group and courts are available
        const firstWaitlistEntry = data.waitlist[0];

        // Load the entire waiting group - Domain: entry.group.players
        const players = firstWaitlistEntry.group?.players || [];
        setCurrentGroup(
          players.map((p) => ({
            id: p.memberId,
            name: p.displayName || 'Unknown',
            memberNumber: findMemberNumber(p.memberId),
          }))
        );

        // Remove the group from waitlist
        data.waitlist.shift();
        const key = 'tennisClubData';
        const prev = Tennis.Storage?.readDataSafe
          ? Tennis.Storage.readDataSafe()
          : JSON.parse(localStorage.getItem(key) || 'null') || {};
        const merged = window.APP_UTILS.preservePromotions(prev, data);
        await dataStore.set(key, merged, { immediate: true });
        if (USE_SHARED_CORE && Events) {
          Events.emitDom('tennisDataUpdate', {});
        } else {
          window.dispatchEvent(new Event('tennisDataUpdate'));
        }

        setSearchInput('');
        setShowSuggestions(false);
        setCurrentScreen('court', 'waitlistPos1FastTrack'); // Go directly to court selection since group is already complete
        return;
      }
    }

    // Check if player is in position 2 and there are 2+ courts available
    if (
      playerStatus.isPlaying &&
      playerStatus.location === 'waiting' &&
      playerStatus.position === 2
    ) {
      const data = getCourtData();
      const availableCourts = getAvailableCourts(false);

      if (availableCourts.length >= 2) {
        // Player is in second waiting group and there are at least 2 courts
        const secondWaitlistEntry = data.waitlist[1];

        // Load the entire waiting group - Domain: entry.group.players
        const players = secondWaitlistEntry.group?.players || [];
        setCurrentGroup(
          players.map((p) => ({
            id: p.memberId,
            name: p.displayName || 'Unknown',
            memberNumber: findMemberNumber(p.memberId),
          }))
        );

        // Remove the group from waitlist
        data.waitlist.splice(1, 1); // Remove second entry
        const key = 'tennisClubData';
        const prev = Tennis.Storage?.readDataSafe
          ? Tennis.Storage.readDataSafe()
          : JSON.parse(localStorage.getItem(key) || 'null') || {};
        const merged = window.APP_UTILS.preservePromotions(prev, data);
        await dataStore.set(key, merged, { immediate: true });
        if (USE_SHARED_CORE && Events) {
          Events.emitDom('tennisDataUpdate', {});
        } else {
          window.dispatchEvent(new Event('tennisDataUpdate'));
        }

        setSearchInput('');
        setShowSuggestions(false);
        setCurrentScreen('court', 'waitlistPos2FastTrack'); // Go directly to court selection since group is already complete
        return;
      }
    }

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
    setCurrentGroup([...currentGroup, newPlayer]);

    setCurrentScreen('group', 'handleSuggestionClick');
  };

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

      // Calculate estimated wait time based on court end times
      try {
        const now = currentTime.getTime();

        // Collect end times from sessions and blocks (courts that are occupied/blocked)
        // Convert ISO strings to milliseconds for comparison
        const parseEndTime = (timeVal) => {
          if (!timeVal) return null;
          const ms = typeof timeVal === 'string' ? new Date(timeVal).getTime() : timeVal;
          return isNaN(ms) ? null : ms;
        };

        const courtEndTimes = data.courts
          .map((court) => {
            if (!court) return null;
            // Session end time (scheduledEndAt from API)
            const sessionEnd = parseEndTime(
              court.session?.scheduledEndAt || court.session?.endTime
            );
            if (sessionEnd && sessionEnd > now) {
              return sessionEnd;
            }
            // Block end time (court is blocked)
            const blockEnd = parseEndTime(court.block?.endTime);
            if (blockEnd && blockEnd > now) {
              return blockEnd;
            }
            // Fallback: top-level endTime
            const topEnd = parseEndTime(court.endTime);
            if (topEnd && topEnd > now) {
              return topEnd;
            }
            return null;
          })
          .filter((endTime) => endTime !== null)
          .sort((a, b) => a - b);

        if (courtEndTimes.length === 0) {
          // No courts occupied - either available immediately or fallback to avg time
          estimatedWait = position === 1 ? 0 : (position - 1) * CONSTANTS.AVG_GAME_TIME_MIN;
        } else if (position <= courtEndTimes.length) {
          // Position N means wait for the Nth court to free up
          const waitMs = courtEndTimes[position - 1] - now;
          estimatedWait = Math.max(0, Math.ceil(waitMs / 60000));
        } else {
          // More waitlist positions than courts - estimate additional cycles
          const avgGameTime = CONSTANTS.AVG_GAME_TIME_MIN;
          const lastEndTime = courtEndTimes[courtEndTimes.length - 1];
          const baseWait = Math.max(0, Math.ceil((lastEndTime - now) / 60000));
          const extraCycles = Math.ceil(
            (position - courtEndTimes.length) / Math.max(courtEndTimes.length, 1)
          );
          estimatedWait = baseWait + extraCycles * avgGameTime;
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
          replacedGroup={replacedGroup}
          canChangeCourt={canChangeCourt}
          changeTimeRemaining={changeTimeRemaining}
          position={position}
          estimatedWait={estimatedWait}
          currentGroup={currentGroup}
          mobileCountdown={window.__mobileFlow ? mobileCountdown : null}
          isMobile={!!window.__mobileFlow}
          isTimeLimited={isTimeLimited}
          onChangeCourt={changeCourt}
          onNewRegistration={() => {
            resetForm();
            setCurrentScreen('search', 'successNewRegistration');
          }}
          onHome={resetForm}
          dataStore={dataStore}
          onPurchaseBalls={async (sessionId, accountId, options) => {
            return backend.commands.purchaseBalls({
              sessionId,
              accountId,
              splitBalls: options?.splitBalls || false,
              splitAccountIds: options?.splitAccountIds || null,
            });
          }}
          onLookupMemberAccount={async (memberNumber) => {
            const members = await backend.directory.getMembersByAccount(memberNumber);
            return members;
          }}
          TENNIS_CONFIG={TENNIS_CONFIG}
          getCourtBlockStatus={getCourtBlockStatus}
        />
      </>
    );
  }

  // Welcome screen
  if (currentScreen === 'welcome') {
    return (
      <>
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />
        {checkingLocation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-xl">
              <p className="text-lg">{TENNIS_CONFIG.GEOLOCATION.CHECKING_MESSAGE}</p>
            </div>
          </div>
        )}
        <WelcomeScreen
          onRegisterClick={() => {
            checkLocationAndProceed(() => setCurrentScreen('search', 'welcomeRegisterClick'));
          }}
          onClearCourtClick={() => {
            checkLocationAndProceed(() => setCurrentScreen('clearCourt', 'welcomeClearCourtClick'));
          }}
        />
      </>
    );
  }

  // Admin screen
  if (currentScreen === 'admin') {
    const data = getCourtData();
    const now = new Date();
    // Domain format: court.session.group.players, court.session.scheduledEndAt
    const occupiedCourts = data.courts.filter(
      (court) => court !== null && court.session?.group?.players?.length > 0 && !court.wasCleared
    );
    const overtimeCourts = data.courts.filter(
      (court) =>
        court &&
        court.session?.group?.players?.length > 0 &&
        !court.wasCleared &&
        new Date(court.session?.scheduledEndAt) <= currentTime
    );

    // Count only currently blocked courts
    const blockedCourts = data.courts.filter((court) => {
      if (!court || !court.blocked || !court.blocked.startTime || !court.blocked.endTime)
        return false;
      const blockStartTime = new Date(court.blocked.startTime);
      const blockEndTime = new Date(court.blocked.endTime);
      return now >= blockStartTime && now < blockEndTime;
    });

    // Handle price update
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
      } catch (error) {
        setPriceError('Failed to save price');
      }
    };

    console.log('Admin data loaded:', {
      totalCourts: data.courts.length,
      occupied: occupiedCourts.length,
      blocked: blockedCourts.length,
      blockedDetails: blockedCourts,
    });

    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-8 flex items-center justify-center">
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-6xl h-full max-h-[95vh] overflow-y-auto scrollbar-hide">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-400 text-sm sm:text-base">System management and controls</p>
          </div>

          {/* Court Management */}
          <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Court Management
                <span className="text-sm sm:text-lg font-normal text-gray-400 block sm:inline sm:ml-3">
                  ({occupiedCourts.length} occupied, {overtimeCourts.length} overtime)
                </span>
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setShowBlockModal(true);
                    setSelectedCourtsToBlock([]);
                    setBlockMessage('');
                    setBlockStartTime('');
                    setBlockEndTime('');
                    setBlockingInProgress(false);
                  }}
                  className="bg-yellow-700 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-yellow-800 transition-colors flex-1 sm:flex-initial"
                >
                  Block Courts
                </button>
                <button
                  onClick={async () => {
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
                  }}
                  className="bg-orange-600 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-700 transition-colors flex-1 sm:flex-initial"
                >
                  Clear All Courts
                </button>
              </div>
            </div>
            {/* Block Courts Modal */}
            {showBlockModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto modal-mobile-full">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Block Courts</h3>

                  {/* Court Selection */}
                  <div className="mb-4">
                    <label className="block text-white mb-2 text-sm sm:text-base">
                      Select Courts to Block
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
                      {[...Array(CONSTANTS.COURT_COUNT)].map((_, index) => {
                        const courtNum = index + 1;
                        const isSelected = selectedCourtsToBlock.includes(courtNum);

                        return (
                          <button
                            key={courtNum}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCourtsToBlock(
                                  selectedCourtsToBlock.filter((c) => c !== courtNum)
                                );
                              } else {
                                setSelectedCourtsToBlock([...selectedCourtsToBlock, courtNum]);
                              }
                              setBlockingInProgress(false); // Reset when courts change
                            }}
                            className={`py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Court {courtNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => {
                        if (selectedCourtsToBlock.length === CONSTANTS.COURT_COUNT) {
                          setSelectedCourtsToBlock([]);
                        } else {
                          setSelectedCourtsToBlock(
                            [...Array(CONSTANTS.COURT_COUNT)].map((_, i) => i + 1)
                          );
                        }
                        setBlockingInProgress(false); // Reset when selection changes
                      }}
                      className="text-yellow-400 text-xs sm:text-sm hover:text-yellow-300"
                    >
                      {selectedCourtsToBlock.length === CONSTANTS.COURT_COUNT
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  {/* Message Selection */}
                  <div className="mb-4">
                    <label className="block text-white mb-2 text-sm sm:text-base">
                      Block Reason
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        onClick={() => {
                          setBlockMessage('WET COURT');
                          setBlockingInProgress(false);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                          blockMessage === 'WET COURT'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        WET COURT
                      </button>
                      <button
                        onClick={() => {
                          setBlockMessage('COURT WORK');
                          setBlockingInProgress(false);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                          blockMessage === 'COURT WORK'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        COURT WORK
                      </button>
                      <button
                        onClick={() => {
                          setBlockMessage('LESSON');
                          setBlockingInProgress(false);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                          blockMessage === 'LESSON'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        LESSON
                      </button>
                    </div>
                    <input
                      type="text"
                      value={blockMessage}
                      onChange={(e) => {
                        setBlockMessage(e.target.value);
                        setBlockingInProgress(false);
                      }}
                      placeholder="Or enter custom message..."
                      className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none text-sm sm:text-base"
                    />
                  </div>

                  {/* Time Selection */}
                  <div className="mb-4">
                    <label className="block text-white mb-2 text-sm sm:text-base">Start Time</label>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => {
                          setBlockStartTime('now');
                          setBlockingInProgress(false);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                          blockStartTime === 'now'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        Now
                      </button>
                      <input
                        type="time"
                        value={blockStartTime === 'now' ? '' : blockStartTime}
                        onChange={(e) => {
                          setBlockStartTime(e.target.value);
                          setBlockingInProgress(false);
                        }}
                        className="p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div className="mb-4 sm:mb-6">
                    <label className="block text-white mb-2 text-sm sm:text-base">End Time</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <button
                        onClick={() => {
                          const end = new Date();
                          if (blockStartTime && blockStartTime !== 'now') {
                            const [hours, minutes] = blockStartTime.split(':');
                            end.setHours(parseInt(hours), parseInt(minutes));
                          }
                          end.setHours(end.getHours() + 1);
                          const endHours = end.getHours().toString().padStart(2, '0');
                          const endMinutes = end.getMinutes().toString().padStart(2, '0');
                          setBlockEndTime(`${endHours}:${endMinutes}`);
                          setBlockingInProgress(false);
                        }}
                        className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
                      >
                        +1 hour
                      </button>
                      <button
                        onClick={() => {
                          const end = new Date();
                          if (blockStartTime && blockStartTime !== 'now') {
                            const [hours, minutes] = blockStartTime.split(':');
                            end.setHours(parseInt(hours), parseInt(minutes));
                          }
                          end.setHours(end.getHours() + 2);
                          const endHours = end.getHours().toString().padStart(2, '0');
                          const endMinutes = end.getMinutes().toString().padStart(2, '0');
                          setBlockEndTime(`${endHours}:${endMinutes}`);
                        }}
                        className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
                      >
                        +2 hours
                      </button>
                      <button
                        onClick={() => {
                          const end = new Date();
                          if (blockStartTime && blockStartTime !== 'now') {
                            const [hours, minutes] = blockStartTime.split(':');
                            end.setHours(parseInt(hours), parseInt(minutes));
                          }
                          end.setHours(end.getHours() + 4);
                          const endHours = end.getHours().toString().padStart(2, '0');
                          const endMinutes = end.getMinutes().toString().padStart(2, '0');
                          setBlockEndTime(`${endHours}:${endMinutes}`);
                        }}
                        className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
                      >
                        +4 hours
                      </button>
                    </div>
                    <input
                      type="time"
                      value={blockEndTime}
                      onChange={(e) => {
                        setBlockEndTime(e.target.value);
                        setBlockingInProgress(false);
                      }}
                      required
                      className="p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none w-full text-sm sm:text-base"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowBlockModal(false)}
                      className="px-4 sm:px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm sm:text-base"
                    >
                      Close
                    </button>
                    <button
                      onClick={async () => {
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

                        // Set blocking in progress
                        setBlockingInProgress(true);

                        const boardData = getCourtData();
                        const currentTime = new Date(); // Use different name to avoid scope conflict

                        // Calculate start time
                        let startTime;
                        if (blockStartTime === 'now') {
                          startTime = new Date();
                        } else {
                          // Create a date with today's date and the selected time
                          startTime = new Date();
                          const [hours, minutes] = blockStartTime.split(':');
                          startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                          // Don't automatically adjust to tomorrow - let admin set past times if needed
                        }

                        // Calculate end time based on the selected time
                        const [endHours, endMinutes] = blockEndTime.split(':');
                        let endTime = new Date(startTime); // Start from the same date as start time
                        endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

                        // If end time is before start time, assume next day
                        if (endTime <= startTime) {
                          endTime.setDate(endTime.getDate() + 1);
                        }

                        console.log('Block times calculated:', {
                          blockStartTimeInput: blockStartTime,
                          currentTime: currentTime.toLocaleString(),
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
                      }}
                      disabled={blockingInProgress}
                      className={`px-4 sm:px-6 py-2 rounded transition-colors text-sm sm:text-base ${
                        blockingInProgress
                          ? 'bg-yellow-400 text-white cursor-not-allowed'
                          : 'bg-yellow-600 text-white hover:bg-yellow-700'
                      }`}
                    >
                      {blockingInProgress ? 'Applied' : 'Apply Blocks'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Move Court UI */}
            {courtToMove && (
              <div className="mb-4 p-3 sm:p-4 bg-blue-900/30 border-2 border-blue-600 rounded-lg">
                <p className="text-white font-medium mb-3 text-sm sm:text-base">
                  Moving players from Court {courtToMove} to:
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                  {[...Array(CONSTANTS.COURT_COUNT)].map((_, index) => {
                    const targetCourtNum = index + 1;
                    const isOccupied = data.courts[index] !== null;
                    const isCurrent = targetCourtNum === courtToMove;

                    return (
                      <button
                        key={targetCourtNum}
                        disabled={isOccupied || isCurrent}
                        onClick={async () => {
                          try {
                            // Get court IDs from court numbers
                            const fromCourt = data.courts[courtToMove - 1];
                            const toCourt = data.courts[targetCourtNum - 1];

                            if (!fromCourt?.id) {
                              showAlertMessage('Source court not found');
                              setCourtToMove(null);
                              return;
                            }

                            // For empty courts, get ID from API board
                            let toCourtId = toCourt?.id;
                            if (!toCourtId) {
                              const board = await backend.queries.getBoard();
                              const targetCourt = board?.courts?.find(
                                (c) => c.number === targetCourtNum
                              );
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
                              showAlertMessage(
                                `Court ${courtToMove} moved to Court ${targetCourtNum}`
                              );
                            } else {
                              showAlertMessage(result.message || 'Failed to move court');
                            }
                          } catch (err) {
                            console.error('[moveCourt] Error:', err);
                            showAlertMessage(err.message || 'Failed to move court');
                          }

                          setCourtToMove(null);
                        }}
                        className={`py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                          isCurrent
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : isOccupied
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Court {targetCourtNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCourtToMove(null)}
                  className="bg-gray-600 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(12)].map((_, index) => {
                const court = data.courts[index];
                const courtNum = index + 1;
                const now = new Date();

                // Check block status using unified system only
                let blockStatus = null;
                const blockStatusResult = getCourtBlockStatus(courtNum);

                if (blockStatusResult && blockStatusResult.isBlocked) {
                  blockStatus = blockStatusResult.isCurrent ? 'current' : 'future';
                }

                const isBlocked = blockStatus === 'current';
                const isFutureBlock = blockStatus === 'future';
                const isCleared = court && court.wasCleared;
                // Domain format: court.session.group.players, court.session.scheduledEndAt
                const sessionPlayers = court?.session?.group?.players;
                const sessionEndTime = court?.session?.scheduledEndAt;
                const isOccupied = court && sessionPlayers?.length > 0 && !isCleared;
                const isOvertime =
                  court &&
                  sessionEndTime &&
                  !isBlocked &&
                  !isCleared &&
                  new Date(sessionEndTime) <= currentTime;
                const timeRemaining =
                  court && sessionEndTime && !isBlocked && !isCleared
                    ? Math.max(
                        0,
                        Math.floor(
                          (new Date(sessionEndTime).getTime() - currentTime.getTime()) / 60000
                        )
                      )
                    : 0;

                return (
                  <div
                    key={courtNum}
                    className={`p-3 sm:p-4 rounded-lg border-2 ${
                      isBlocked
                        ? 'bg-red-900 border-red-700'
                        : isFutureBlock
                          ? 'bg-yellow-900 border-yellow-700'
                          : !court
                            ? 'bg-gray-700 border-gray-600'
                            : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-4 mb-2">
                          <h3 className="text-base sm:text-lg font-bold text-white">
                            Court {courtNum}
                          </h3>
                          {isOccupied && !isBlocked && (
                            <span className={`text-xs sm:text-sm font-medium text-gray-400`}>
                              {isOvertime ? 'Overtime' : `${timeRemaining} min remaining`}
                            </span>
                          )}
                        </div>
                        {isBlocked ? (
                          <div>
                            <p className="text-red-400 font-medium text-sm sm:text-base">
                              🚫 {blockStatusResult ? blockStatusResult.reason : 'BLOCKED'}
                            </p>

                            <p className="text-gray-400 text-xs sm:text-sm">
                              Until{' '}
                              {new Date(blockStatusResult.endTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ) : isFutureBlock ? (
                          <div>
                            <p className="text-yellow-400 font-medium text-sm sm:text-base">
                              Future: {blockStatusResult.reason}
                            </p>
                            <p className="text-gray-400 text-xs sm:text-sm">
                              {new Date(blockStatusResult.startTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(blockStatusResult.endTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ) : isOccupied ? (
                          <div>
                            <div className="flex flex-col">
                              {sessionPlayers.map((player, idx) => (
                                <span key={idx} className="text-gray-300 text-xs sm:text-sm">
                                  {player.name?.split(' ').pop() ||
                                    player.displayName?.split(' ').pop() ||
                                    'Unknown'}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : isCleared ? (
                          <p className="text-gray-500 text-xs sm:text-sm">
                            Available (History Preserved)
                          </p>
                        ) : (
                          <p className="text-gray-500 text-xs sm:text-sm">Available</p>
                        )}
                      </div>
                      {(isOccupied || isBlocked || isFutureBlock) && (
                        <div className="flex flex-col gap-1 ml-2">
                          {!isBlocked && !isFutureBlock && isOccupied && (
                            <button
                              onClick={() => setCourtToMove(courtNum)}
                              className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-700 transition-colors"
                            >
                              Move
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              // Check if court has an active block from API data
                              if (court && court.block && court.block.id) {
                                // Cancel the block via backend
                                const result = await backend.admin.cancelBlock({
                                  blockId: court.block.id,
                                  deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
                                });
                                if (result.ok) {
                                  showAlertMessage(`Court ${courtNum} unblocked`);
                                } else {
                                  showAlertMessage(result.message || 'Failed to unblock court');
                                }
                              } else if (isOccupied) {
                                // Clear the session
                                await clearCourt(courtNum);
                                showAlertMessage(`Court ${courtNum} cleared`);
                              } else {
                                showAlertMessage(`Court ${courtNum} has nothing to clear`);
                              }
                            }}
                            className="bg-orange-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-orange-700 transition-colors"
                          >
                            {court && court.block ? 'Unblock' : 'Clear'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Waitlist Management */}
          <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Waitlist Management
                <span className="text-sm sm:text-lg font-normal text-gray-400 block sm:inline sm:ml-3">
                  ({data.waitlist.length} groups waiting)
                </span>
              </h2>
              {data.waitlist.length > 0 && (
                <button
                  onClick={async () => {
                    const confirmClear = window.confirm(
                      'Clear the waitlist? This will remove all waiting groups.'
                    );
                    if (confirmClear) {
                      // Remove all waitlist entries via backend
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
                  }}
                  className="bg-orange-600 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-700 transition-colors w-full sm:w-auto"
                >
                  Clear Waitlist
                </button>
              )}
            </div>
            {data.waitlist.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm sm:text-base">
                No groups in waitlist
              </p>
            ) : (
              <div className="space-y-3">
                {waitlistMoveFrom !== null && (
                  <div className="mb-4 p-3 sm:p-4 bg-blue-900/30 border-2 border-blue-600 rounded-lg">
                    <p className="text-white font-medium mb-3 text-sm sm:text-base">
                      Moving group from position {waitlistMoveFrom + 1} to:
                    </p>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {data.waitlist.map((_, index) => {
                        const position = index + 1;
                        const isCurrentPosition = index === waitlistMoveFrom;

                        return (
                          <button
                            key={position}
                            disabled={isCurrentPosition}
                            onClick={async () => {
                              // Reorder the waitlist
                              // TODO: Replace with TennisCommands.reorderWaitlist({ entryId, newPosition })
                              const movedGroup = data.waitlist[waitlistMoveFrom];
                              const entryId = movedGroup?.id || movedGroup?.group?.id;

                              if (entryId && window.Tennis?.Commands?.reorderWaitlist) {
                                try {
                                  await window.Tennis.Commands.reorderWaitlist({
                                    entryId,
                                    newPosition: index,
                                  });
                                  showAlertMessage(`Group moved to position ${position}`);
                                } catch (err) {
                                  showAlertMessage(err.message || 'Failed to move group');
                                }
                              } else {
                                // Fallback: localStorage persistence removed
                                console.warn(
                                  '[Waitlist Reorder] API not available, action skipped'
                                );
                                showAlertMessage(
                                  'Waitlist reorder requires API — feature temporarily unavailable'
                                );
                              }

                              setWaitlistMoveFrom(null);
                            }}
                            className={`py-2 px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                              isCurrentPosition
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            Position {position}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setWaitlistMoveFrom(null)}
                      className="bg-gray-600 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {data.waitlist.map((group, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm sm:text-base">
                        Position {index + 1}:{' '}
                        {(group.group?.players || [])
                          .map((p) => p.displayName || 'Unknown')
                          .join(', ')}
                      </p>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        {(group.group?.players || []).length} player
                        {(group.group?.players || []).length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setWaitlistMoveFrom(index)}
                        className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                      >
                        Move
                      </button>
                      <button
                        onClick={async () => {
                          // Use waitlist entry ID from API data
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
                        }}
                        className="bg-orange-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-orange-700 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Settings */}
          <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">System Settings</h2>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-white">Tennis Ball Price</h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Set the price for tennis ball purchases
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.50"
                      max="50.00"
                      value={ballPriceInput}
                      onChange={(e) => {
                        setBallPriceInput(e.target.value);
                        setPriceError('');
                        setShowPriceSuccess(false);
                      }}
                      className="pl-8 pr-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none w-full sm:w-24"
                    />
                  </div>

                  <button
                    onClick={handlePriceUpdate}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Save
                  </button>
                </div>
              </div>

              {showPriceSuccess && (
                <div className="mt-2 text-green-400 text-xs sm:text-sm flex items-center gap-2">
                  <Check size={14} className="sm:w-4 sm:h-4" />
                  Price updated successfully
                </div>
              )}

              {priceError && (
                <div className="mt-2 text-red-400 text-xs sm:text-sm">{priceError}</div>
              )}
            </div>
          </div>

          {/* Exit Admin */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setCurrentScreen('welcome', 'exitAdminPanel');
                setSearchInput('');
              }}
              className="bg-gray-600 text-white py-2 sm:py-3 px-6 sm:px-8 rounded-xl text-base sm:text-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Exit Admin Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Search screen
  if (currentScreen === 'search') {
    return (
      <SearchScreen
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        isSearching={isSearching}
        effectiveSearchInput={effectiveSearchInput}
        getAutocompleteSuggestions={getAutocompleteSuggestions}
        handleSuggestionClick={handleSuggestionClick}
        markUserTyping={markUserTyping}
        setCurrentScreen={setCurrentScreen}
        setCurrentGroup={setCurrentGroup}
        setMemberNumber={setMemberNumber}
        setHasWaitlistPriority={setHasWaitlistPriority}
        setCurrentWaitlistEntryId={setCurrentWaitlistEntryId}
        findMemberNumber={findMemberNumber}
        canFirstGroupPlay={canFirstGroupPlay}
        canSecondGroupPlay={canSecondGroupPlay}
        firstWaitlistEntry={firstWaitlistEntry}
        secondWaitlistEntry={secondWaitlistEntry}
        firstWaitlistEntryData={firstWaitlistEntryData}
        secondWaitlistEntryData={secondWaitlistEntryData}
        data={data}
        showAlert={showAlert}
        alertMessage={alertMessage}
        isMobileView={isMobileView}
        CONSTANTS={CONSTANTS}
      />
    );
  }

  // Group management screen
  if (currentScreen === 'group') {
    // Get frequent partners with caching using ref
    let frequentPartners = [];
    if (memberNumber) {
      if (!frequentPartnersCacheRef.current[memberNumber]) {
        frequentPartnersCacheRef.current[memberNumber] = getFrequentPartners(memberNumber);
      }
      frequentPartners = frequentPartnersCacheRef.current[memberNumber] || [];
    }

    return (
      <div
        className={`w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex ${window.__mobileFlow ? 'items-start pt-[15vh]' : 'items-center justify-center'}`}
      >
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />
        {showTimeoutWarning && (
          <div className="fixed top-4 sm:top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white p-3 sm:p-4 rounded-xl shadow-lg z-50 text-base sm:text-lg animate-pulse">
            Session will expire in 30 seconds due to inactivity
          </div>
        )}
        <div
          className={`bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-5xl h-full ${window.__mobileFlow ? 'max-h-[70vh]' : 'max-h-[95vh]'} flex flex-col relative overflow-hidden`}
        >
          {/* Mobile-specific UI when no player added yet */}
          {window.__mobileFlow && currentGroup.length === 0 ? (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 rounded-xl text-center">
              <p className="text-lg sm:text-2xl text-green-800 font-semibold">
                Court {window.__preselectedCourt} Selected
              </p>
            </div>
          ) : (
            /* Normal UI for desktop or when player exists */
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-lg sm:text-2xl text-blue-800">
                Welcome
                {currentGroup[0]?.name ? (
                  <>
                    , <strong>{currentGroup[0]?.name}</strong>
                  </>
                ) : (
                  ''
                )}
                !
              </p>
              <p className="text-base sm:text-lg text-gray-600 mt-1 sm:mt-2">
                {currentGroup.length === 0
                  ? 'Search for players to add to your group'
                  : currentGroup.length === 1
                    ? isMobileView
                      ? ''
                      : 'Add more players to your group or select a court'
                    : `${currentGroup.length} players in your group`}
              </p>
            </div>
          )}
          <div
            className="flex-1 overflow-y-auto pb-24 sm:pb-32"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          >
            {/* Only show Current Group section if there are players or not in mobile flow */}
            {(currentGroup.length > 0 || !window.__mobileFlow) && (
              <>
                {!window.__mobileFlow && (
                  <h3 className="text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Current Group</h3>
                )}
                <div className={`space-y-2 ${!window.__mobileFlow ? 'mb-3 sm:mb-4' : ''}`}>
                  {currentGroup.map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 p-2.5 sm:p-3 rounded-xl"
                    >
                      <div>
                        <span className="font-medium text-base sm:text-lg">{player.name}</span>
                        {player.isGuest && (
                          <span className="text-xs sm:text-sm text-blue-600 ml-2 sm:ml-3 font-medium">
                            (Guest{player.sponsor ? ` of ${player.sponsor}` : ''})
                          </span>
                        )}
                        {!player.isGuest && player.ranking && (
                          <span className="text-xs sm:text-sm text-blue-600 ml-2 sm:ml-3">
                            Rank #{player.ranking}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setCurrentGroup(currentGroup.filter((_, i) => i !== idx));
                        }}
                        className="text-red-500 hover:bg-red-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Mobile flow: Show search input when no players, otherwise show Add Another Player button */}
            {window.__mobileFlow && currentGroup.length === 0 ? (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
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
                    }}
                    onFocus={() => {
                      markUserTyping();
                      setShowSuggestions(searchInput.length > 0);
                    }}
                    placeholder={
                      isMobileView ? 'Enter Name or Number' : 'Enter your name or Member #'
                    }
                    className={`w-full ${isMobileView ? 'p-3 text-base input--compact' : 'p-4 sm:p-5 text-xl sm:text-2xl'} border-2 rounded-xl focus:border-green-500 focus:outline-none`}
                    id="mobile-group-search-input"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck="false"
                  />
                </div>

                {/* Search suggestions dropdown */}
                {showSuggestions && (
                  <div
                    className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    style={{ maxHeight: '400px', overflowY: 'auto' }}
                  >
                    {getAutocompleteSuggestions(effectiveSearchInput).length > 0 ? (
                      getAutocompleteSuggestions(effectiveSearchInput).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={async () => {
                            await handleSuggestionClick(suggestion);
                            // For mobile flow, clear search after adding first player
                            if (window.__mobileFlow) {
                              setSearchInput('');
                              setShowSuggestions(false);
                            }
                          }}
                          className="w-full p-4 text-left hover:bg-blue-50 flex items-center border-b border-gray-100"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-lg">
                              {suggestion.member.name}
                              {suggestion.member.isGuest && (
                                <span className="text-sm text-blue-600 ml-2">(Guest)</span>
                              )}
                            </div>
                            {suggestion.type === 'member' && (
                              <div className="text-sm text-gray-600">
                                Member #{suggestion.member.id}
                              </div>
                            )}
                          </div>
                          {suggestion.type === 'member' && suggestion.member.ranking && (
                            <div className="text-sm text-blue-600 font-medium">
                              Rank #{suggestion.member.ranking}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        {searchInput.length < 2 ? 'Keep typing...' : 'No members found'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              currentGroup.length < CONSTANTS.MAX_PLAYERS && (
                <div className="flex gap-2 sm:gap-3 mb-3">
                  <button
                    onClick={() => {
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
                    }}
                    className="flex-1 bg-green-500 text-white py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-base sm:text-xl hover:bg-green-600 transition-colors"
                  >
                    Add Another Player
                  </button>
                  <button
                    onClick={() => {
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
                        // Set default sponsor if only one member in group
                        if (currentGroup.length === 1 && !currentGroup[0].isGuest) {
                          setGuestSponsor(currentGroup[0].memberNumber);
                        }
                      }
                    }}
                    className="bg-blue-50 text-blue-600 border border-blue-600 py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-base sm:text-xl hover:bg-blue-100 transition-colors"
                  >
                    + Guest
                  </button>
                </div>
              )
            )}

            {showAddPlayer && !showGuestForm && (
              <div className="mb-4 relative">
                <div className="relative">
                  <input
                    type="text"
                    value={addPlayerSearch}
                    onChange={(e) => {
                      markUserTyping();
                      setAddPlayerSearch(e.target.value || '');
                      setShowAddPlayerSuggestions((e.target.value || '').length > 0);
                    }}
                    onFocus={() => {
                      markUserTyping();
                      setShowAddPlayerSuggestions(addPlayerSearch.length > 0);
                    }}
                    placeholder="Enter name or member number..."
                    className="w-full p-2.5 sm:p-3 text-lg sm:text-xl border-2 rounded-xl focus:border-green-500 focus:outline-none"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck="false"
                  />
                </div>

                {showAddPlayerSuggestions && (
                  <div
                    className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {getAutocompleteSuggestions(effectiveAddPlayerSearch).length > 0 ? (
                      getAutocompleteSuggestions(effectiveAddPlayerSearch).map(
                        (suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={async () => {
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
                              if (!guardAddPlayerEarly(enrichedMember)) {
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
                              if (!guardAddPlayerEarly(enrichedMember)) {
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
                                const availableCourts = getAvailableCourts(false);

                                if (availableCourts.length > 0) {
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
                                  showAlertMessage(
                                    `Group is full (max ${CONSTANTS.MAX_PLAYERS} players)`
                                  );
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
                                console.log(
                                  '🔵 Adding player to group (add player flow):',
                                  newPlayer
                                );
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
                            }}
                            className="w-full p-2.5 sm:p-3 text-left hover:bg-green-50 border-b last:border-b-0 transition-colors block"
                          >
                            <div className="font-medium text-base sm:text-lg">
                              {suggestion.member.name}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              Member #{suggestion.memberNumber}
                            </div>
                          </button>
                        )
                      )
                    ) : addPlayerSearch.length >= 2 ? (
                      <button
                        onClick={() => {
                          setGuestName(addPlayerSearch);
                          setShowGuestForm(true);
                          setShowAddPlayerSuggestions(false);
                          setAddPlayerSearch('');
                          // Set default sponsor if only one member in group
                          if (currentGroup.length === 1 && !currentGroup[0].isGuest) {
                            setGuestSponsor(currentGroup[0].memberNumber);
                          }
                        }}
                        className="w-full p-2.5 sm:p-3 text-left hover:bg-blue-50 transition-colors block"
                      >
                        <div className="font-medium text-base sm:text-lg text-blue-600">
                          Add "{addPlayerSearch}" as guest?
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          No member found with this name
                        </div>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Guest Form */}
            {showAddPlayer && showGuestForm && (
              <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Add Guest Player</h4>

                <div className="mb-2 sm:mb-3">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => {
                      markUserTyping();
                      setGuestName(e.target.value);
                      setShowGuestNameError(false);
                    }}
                    placeholder="Enter first and last name"
                    className="w-full p-2 text-base sm:text-lg border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  {showGuestNameError && (
                    <p className="text-red-500 text-xs sm:text-sm mt-1">
                      Please enter your guest's full name
                    </p>
                  )}
                </div>

                {/* Only show sponsor selection if there are multiple members */}
                {currentGroup.filter((p) => !p.isGuest).length > 1 && (
                  <div className="mb-2 sm:mb-3">
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1 ${
                        showSponsorError ? 'text-red-500' : 'text-gray-700'
                      }`}
                    >
                      {showSponsorError
                        ? "Please choose your guest's sponsoring member"
                        : 'Sponsoring Member'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentGroup
                        .filter((p) => !p.isGuest)
                        .map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setGuestSponsor(member.memberNumber);
                              setShowSponsorError(false);
                            }}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-colors text-xs sm:text-sm ${
                              guestSponsor === member.memberNumber
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            {member.memberNumber === memberNumber ? 'My Guest' : member.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
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
                      if (!guardAddPlayerEarly(guestName.trim())) {
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
                        guestSponsor ||
                        currentGroup.filter((p) => !p.isGuest)[0]?.memberNumber ||
                        memberNumber;

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
                        (function deferUpdateAfterSuccess() {
                          const isOnSuccess = window.__regScreen === 'success';
                          const DISPATCH_DELAY_MS = 1500; // small delay so Success screen is stable

                          const doDispatch = () => {
                            window.dispatchEvent(
                              new CustomEvent('tennisDataUpdate', {
                                detail: { source: 'guest-charge' },
                              })
                            );
                            console.log('📡 Dispatched update event (source=guest-charge)');
                          };

                          if (isOnSuccess) {
                            setTimeout(doDispatch, DISPATCH_DELAY_MS);
                            console.log(
                              '[SuccessHold-lite] Deferred tennisDataUpdate by',
                              DISPATCH_DELAY_MS,
                              'ms'
                            );
                          } else {
                            doDispatch();
                          }
                        })();
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
                    }}
                    className="bg-blue-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
                  >
                    Add Guest
                  </button>
                  <button
                    onClick={() => {
                      setShowGuestForm(false);
                      setGuestName('');
                      setGuestSponsor('');
                      setShowGuestNameError(false);
                      setShowSponsorError(false);
                    }}
                    className="bg-gray-300 text-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Frequent partners */}
            {memberNumber &&
              frequentPartners &&
              frequentPartners.length > 0 &&
              currentGroup.length < CONSTANTS.MAX_PLAYERS && (
                <div className="p-3 sm:p-4 bg-yellow-50 rounded-xl">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {frequentPartners
                      .slice(0, CONSTANTS.MAX_FREQUENT_PARTNERS)
                      .map((partner, idx) => {
                        const names = partner.player.name.split(' ');
                        const displayName =
                          names.join(' ').length > 15
                            ? `${names[0].charAt(0)}. ${names[1] || names[0]}`
                            : partner.player.name;

                        return (
                          <button
                            key={idx}
                            onClick={() => addFrequentPartner(partner.player)}
                            disabled={isPlayerAlreadyPlaying(partner.player.id).isPlaying}
                            className="bg-white p-2 sm:p-3 rounded-lg hover:bg-yellow-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="font-medium text-xs sm:text-sm">{displayName}</div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
          </div>
          <div
            className={`absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex ${isMobileView ? 'justify-between' : 'justify-between gap-2'} items-end bottom-nav-buttons`}
          >
            <button
              onClick={() => {
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
                  // Desktop behavior - go back to search
                  setCurrentGroup([]);
                  setMemberNumber('');
                  setCurrentScreen('search', 'groupGoBack');
                }
              }}
              className="bg-gray-300 text-gray-700 py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-sm sm:text-lg hover:bg-gray-400 transition-colors relative z-10"
            >
              {isMobileView ? 'Back' : 'Go Back'}
            </button>

            {currentGroup.length >= 1 && (
              <div className={isMobileView ? 'flex-1 flex justify-center' : ''}>
                {(() => {
                  // Check if there's a waitlist and if this group is not the first waiting group
                  const waitlistEntries = data?.waitlist || [];
                  const hasWaitlist = waitlistEntries.length > 0;

                  // Check if current group is in the allowed positions (1st or 2nd when 2+ courts)
                  let groupWaitlistPosition = 0;
                  for (let i = 0; i < waitlistEntries.length; i++) {
                    if (sameGroup(waitlistEntries[i]?.players || [], currentGroup)) {
                      groupWaitlistPosition = i + 1; // 1-based position
                      break;
                    }
                  }

                  // Use availableCourts state (already set from API data)
                  const courtsToCheck = availableCourts;

                  // Check if there are actually any courts available to select
                  const hasAvailableCourts = courtsToCheck && courtsToCheck.length > 0;
                  const availableCourtCount = courtsToCheck?.length || 0;

                  // Show "Select a Court" if:
                  // 1. No waitlist and courts available OR
                  // 2. Group is position 1 and courts available OR
                  // 3. Group is position 2 and 2+ courts available
                  const showSelectCourt =
                    hasAvailableCourts &&
                    (!hasWaitlist ||
                      groupWaitlistPosition === 1 ||
                      (groupWaitlistPosition === 2 && availableCourtCount >= 2));

                  return showSelectCourt;
                })() ? (
                  <button
                    onClick={() => {
                      // Mobile: Skip court selection if we have a preselected court
                      if (window.__mobileFlow && window.__preselectedCourt) {
                        assignCourtToGroup(window.__preselectedCourt);
                      } else {
                        setCurrentScreen('court', 'selectCourtButton');
                      }
                    }}
                    className={`${isMobileView ? 'px-6' : ''} bg-blue-500 text-white py-2 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl hover:bg-blue-600 transition-colors`}
                  >
                    {isMobileView
                      ? window.__mobileFlow && window.__preselectedCourt
                        ? `Take Court ${window.__preselectedCourt}`
                        : 'Continue'
                      : window.__mobileFlow && window.__preselectedCourt
                        ? `Register for Court ${window.__preselectedCourt}`
                        : 'Select a Court'}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
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
                    }}
                    className={`${isMobileView ? 'px-6' : ''} bg-orange-500 text-white py-2 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl hover:bg-orange-600 transition-colors`}
                  >
                    Join Waitlist
                  </button>
                )}
              </div>
            )}

            {!isMobileView && (
              <button
                onClick={resetForm}
                className="bg-red-500 text-white py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-sm sm:text-lg hover:bg-red-600 transition-colors"
              >
                Start Over
              </button>
            )}
          </div>

          {!showSuccess && (
            <div
              id="etaPreview"
              aria-live="polite"
              style={{ marginTop: '8px', fontSize: '0.95rem', opacity: '0.9' }}
            ></div>
          )}
        </div>
      </div>
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

    // Compute court categories using availability flags
    const unoccupiedCourts = courts.filter((c) => c.isAvailable);
    const overtimeCourts = courts.filter((c) => c.isOvertime);

    // Selectable: unoccupied first, then overtime if no unoccupied
    let selectable = [];
    if (unoccupiedCourts.length > 0) {
      selectable = unoccupiedCourts.map((c) => c.number);
    } else if (overtimeCourts.length > 0) {
      selectable = overtimeCourts.map((c) => c.number);
    }

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
                We couldn't detect your location. Please scan the QR code on the kiosk screen to
                verify you're at the club.
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
          getUpcomingBlockWarning={getUpcomingBlockWarning}
          onCourtSelect={async (courtNum) => {
            console.log('[Displacement] onCourtSelect fired:', {
              courtNum,
              isChangingCourt,
              displacement,
              justAssignedCourt,
            });

            // If changing courts, handle the court change
            if (isChangingCourt && justAssignedCourt) {
              console.log('[Displacement] Change court path - displacement:', displacement);
              // If we have displacement info, use atomic undo which ends takeover + restores displaced
              if (
                displacement &&
                displacement.displacedSessionId &&
                displacement.takeoverSessionId
              ) {
                try {
                  console.log('[Displacement] Attempting undo takeover:', {
                    takeoverSessionId: displacement.takeoverSessionId,
                    displacedSessionId: displacement.displacedSessionId,
                  });
                  const undoResult = await backend.commands.undoOvertimeTakeover({
                    takeoverSessionId: displacement.takeoverSessionId,
                    displacedSessionId: displacement.displacedSessionId,
                  });
                  console.log('[Displacement] Undo takeover result:', undoResult);
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
            await assignCourtToGroup(courtNum);
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
