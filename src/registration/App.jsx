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
  TennisDataService,
  tennisDataService,
  setTennisBusinessLogic,
  TennisBusinessLogic,
  tennisBusinessLogic
} from '@lib';

// Import registration-specific services
import {
  GeolocationService,
  geolocationService
} from './services';

// Import extracted UI components
import {
  Users,
  Bell,
  Clock,
  UserPlus,
  ChevronRight,
  Check,
  AlertDisplay,
  ToastHost
} from './components';

// Import extracted screens and modals
import { WelcomeScreen, SuccessScreen, CourtSelectionScreen, SearchScreen, ClearCourtScreen } from './screens';
import { BlockWarningModal } from './modals';

// Import custom hooks
import { useDebounce } from './hooks';

// API Backend Integration
import { getTennisService } from './services/index.js';
import { getRealtimeClient } from '@lib/RealtimeClient.js';

// Phase 1C: TennisBackend interface layer
import { createBackend, DenialCodes } from './backend/index.js';

// Flag to enable API backend (set to true to use new backend)
const USE_API_BACKEND = true;

// TennisBackend singleton instance
const backend = createBackend();

// Set global flag for cta-live.js to check
if (USE_API_BACKEND) {
  window.NOLTC_USE_API_BACKEND = true;
  // Stop any running cta-live interval (in case it started before flag was set)
  if (typeof window.stopCtaLive === 'function') {
    window.stopCtaLive();
  }
}

// Import utility functions
import {
  normalizeName as _utilNormalizeName,
  findEngagementFor as _utilFindEngagementFor,
  validateGuestName,
  computeOccupiedCourts as _utilComputeOccupiedCourts,
  getCourtsOccupiedForClearing as _utilGetCourtsOccupiedForClearing
} from './utils';

// Global service aliases for backward compatibility with other scripts
window.Tennis = window.Tennis || {};
window.Tennis.DataService = window.Tennis.DataService || TennisDataService;
window.TennisDataService = window.TennisDataService || window.Tennis.DataService;
window.WaitlistDataService = window.WaitlistDataService || window.TennisDataService;
window.TennisBusinessLogic = window.TennisBusinessLogic || TennisBusinessLogic;
window.GeolocationService = window.GeolocationService || GeolocationService;

// Wire up TennisBusinessLogic to TennisDataService for circular dependency
setTennisBusinessLogic(TennisBusinessLogic);

// Access window.APP_UTILS for backward compatibility
const U = window.APP_UTILS || {};

// === Shared Core Integration Flag ===
const USE_SHARED_CORE = true;
const USE_SHARED_DOMAIN = true;
const USE_DOMAIN_ETA_PREVIEW = true;
const DEBUG = false; // Gate noisy logs
const dbg = (...args) => { if (DEBUG) console.log(...args); };

// Coalesce multiple update events into a single refresh
let __refreshPending = false;
function scheduleAvailabilityRefresh() {
  if (__refreshPending) return;
  __refreshPending = true;
  setTimeout(() => {
    __refreshPending = false;
    const fn =
      (typeof window.loadData === 'function' && window.loadData) ||
      null;
    if (fn) fn();
  }, 0);
}

// These will be populated from window.Tennis after modules load
const Config  = window.Tennis?.Config || null;
const Storage = window.Tennis?.Storage;
const Events  = window.Tennis?.Events;
const A       = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
const USE_DOMAIN_SELECTABLE = true;
let dataStore = window.Tennis?.DataStore || null;

// Domain module handles
const Time    = window.Tennis?.Domain?.time || window.Tennis?.Domain?.Time;
const Avail   = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
const Wait    = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist;
const W       = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist;

// Storage helpers from shared module
const readJSON = _sharedReadJSON;
const writeJSON = _sharedWriteJSON;
const getEmptyData = _sharedGetEmptyData;
const readDataSafe = () => _sharedReadDataSafe ? _sharedReadDataSafe() : (readJSON(STORAGE_SHARED?.DATA) || getEmptyData());
const STORAGE = Storage?.KEYS || STORAGE_SHARED;
const EVENTS = EVENTS_SHARED || { UPDATE: 'tennisDataUpdate' };

    // --- Robust validation wrapper: always returns { ok, errors[] }
    function validateGroupCompat(players, guests) {
      const W = (window.Tennis?.Domain?.waitlist) || (window.Tennis?.Domain?.Waitlist) || null;
      const norm = (ok, errs) => ({ ok: !!ok, errors: Array.isArray(errs) ? errs : (errs ? [errs] : []) });

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
  ? players.filter(p => p && p.isGuest === true).length
  : 0;

// Parse the separate guests field
const gVal = Number.isFinite(guests) ? guests : parseInt(guests || 0, 10);

// Count non-guest players
const namedPlayers = Array.isArray(players)
  ? players.filter(p => p && !p.isGuest && String(p?.name ?? p ?? '').trim())
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
      DURATION_MIN: { SINGLES: 60, DOUBLES: 90, MAX: 240 }
    };
    
    // ---- Dev flag & assert (no UI change) ----
    const DEV = (typeof location !== 'undefined') && /localhost|127\.0\.0\.1/.test(location.host);
    const assert = (cond, msg, obj) => { if (DEV && !cond) console.warn('ASSERT:', msg, obj||''); };
    
    // ---- Logger (no UI change) ----
    const LOG_LEVEL = (DEV ? 'debug' : 'warn'); // 'debug'|'info'|'warn'|'silent'
    const _PREFIX = '[Registration]';
    const log = {
      debug: (...a)=> { if (['debug'].includes(LOG_LEVEL)) console.debug(_PREFIX, ...a); },
      info:  (...a)=> { if (['debug','info'].includes(LOG_LEVEL)) console.info(_PREFIX, ...a); },
      warn:  (...a)=> { if (['debug','info','warn'].includes(LOG_LEVEL)) console.warn(_PREFIX, ...a); },
    };

// ============================================================
// Section: Data access & persistence
// ============================================================

// ---- TennisCourtDataStore: NOW IMPORTED FROM window.APP_UTILS ----
// REMOVED: local TennisCourtDataStore class (~96 lines)
// The class is now imported via destructuring at the top of the script

// Initialize DataStore using the shared class (dataStore already set via window.Tennis.DataStore above)

// Boot data assertion
const _bootData = (U.readDataSafe ? U.readDataSafe() : (readJSON(STORAGE.DATA) || getEmptyData()));
assert(!_bootData || Array.isArray(_bootData.courts), 'Expected data.courts array on boot', _bootData);


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
    waitingGroups: [],
    recentlyCleared: []
  }));

  // IMPORTANT: These state variables must be declared BEFORE any useEffect that references them
  // to avoid TDZ (Temporal Dead Zone) errors when the code is minified
  const [currentScreen, setCurrentScreen] = useState("welcome");
  const [availableCourts, setAvailableCourts] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [waitlistPosition, setWaitlistPosition] = useState(0); // Position from API response
  const [operatingHours, setOperatingHours] = useState(null); // Operating hours from API

  // Get the appropriate data service based on USE_API_BACKEND flag
  const getDataService = useCallback(() => {
    if (USE_API_BACKEND) {
      return getTennisService({
        deviceId: 'a0000000-0000-0000-0000-000000000001',
        deviceType: 'kiosk',
      });
    }
    return window.Tennis?.DataService || window.TennisDataService || TennisDataService;
  }, []);

  // Define loadData function to refresh data (handles both API and legacy backends)
  const loadData = useCallback(async () => {
    console.log('🎯 loadData called', new Date().toISOString());
    try {
      if (USE_API_BACKEND) {
        const service = getDataService();
        const initialData = await service.loadInitialData();

        // Transform API data to legacy format
        const courts = initialData.courts || [];
        const waitingGroups = initialData.waitlist || [];

        const updatedData = {
          courts: courts,
          waitingGroups: waitingGroups,
          recentlyCleared: data.recentlyCleared || [],
        };

        setData(updatedData);

        // Store operating hours from API
        if (initialData.operatingHours) {
          setOperatingHours(initialData.operatingHours);
        }

        // Store API members for autocomplete search
        if (initialData.members && Array.isArray(initialData.members)) {
          console.log('🔵 Loaded', initialData.members.length, 'members from API');
          console.log('🔵 First 3 members:', initialData.members.slice(0, 3).map(m => m.display_name));
          setApiMembers(initialData.members);
        } else {
          console.error('❌ No members returned from API!', initialData);
        }

        // Compute court categories using new availability flags
        const unoccupiedCourts = courts.filter(c => c.isUnoccupied);
        const overtimeCourts = courts.filter(c => c.isOvertime);
        const activeCourts = courts.filter(c => c.isActive);
        const blockedCourts = courts.filter(c => c.isBlocked);

        // Selectable courts: unoccupied first, then overtime if no unoccupied
        let selectableCourts;
        if (unoccupiedCourts.length > 0) {
          selectableCourts = unoccupiedCourts;
        } else if (overtimeCourts.length > 0) {
          selectableCourts = overtimeCourts;
        } else {
          selectableCourts = []; // No courts available, show waitlist
        }

        const selectableNumbers = selectableCourts.map(c => c.number);
        setAvailableCourts(selectableNumbers);
        setApiError(null);

        // Emit CTA state for API backend
        if (USE_API_BACKEND) {
          console.log('🎯 API CTA: Starting emission, waitlist:', initialData.waitlist?.length, 'selectable:', selectableCourts?.length);
          const waitlistGroups = initialData.waitlist || [];
          const firstGroup = waitlistGroups[0] || null;
          const secondGroup = waitlistGroups[1] || null;

          const gateCount = selectableCourts.length;
          const canFirstGroupPlay = gateCount >= 1 && firstGroup !== null;
          const canSecondGroupPlay = gateCount >= 2 && secondGroup !== null;

          console.log('🎯 CTA State (API):', {
            gateCount,
            selectableCourts: selectableCourts.map(c => c.number),
            waitlistCount: waitlistGroups.length,
            canFirstGroupPlay,
            canSecondGroupPlay,
            firstGroup,
            secondGroup,
          });

          console.log('🎯 Dispatching cta:state event...');
          window.dispatchEvent(new CustomEvent('cta:state', {
            detail: {
              live1: canFirstGroupPlay,
              live2: canSecondGroupPlay,
              first: firstGroup ? {
                players: (firstGroup.players || []).map((p, i) => ({
                  id: `wl-${firstGroup.id}-${i}`,
                  name: typeof p === 'string' ? p : (p.name || p.display_name || 'Unknown'),
                  memberNumber: typeof p === 'object' ? (p.member_number || String(firstGroup.position)) : String(firstGroup.position),
                })),
                id: firstGroup.id,
                position: firstGroup.position,
              } : null,
              second: secondGroup ? {
                players: (secondGroup.players || []).map((p, i) => ({
                  id: `wl-${secondGroup.id}-${i}`,
                  name: typeof p === 'string' ? p : (p.name || p.display_name || 'Unknown'),
                  memberNumber: typeof p === 'object' ? (p.member_number || String(secondGroup.position)) : String(secondGroup.position),
                })),
                id: secondGroup.id,
                position: secondGroup.position,
              } : null,
              selectable: selectableCourts.map(c => c.number),
            }
          }));
          console.log('🎯 cta:state event dispatched');
        }

        // Debug logging
        console.log('🎾 Court categories:', {
          unoccupied: unoccupiedCourts.map(c => c.number),
          overtime: overtimeCourts.map(c => c.number),
          active: activeCourts.map(c => c.number),
          blocked: blockedCourts.map(c => c.number),
          selectable: selectableNumbers,
        });

        return updatedData;
      } else {
        // Legacy localStorage loading
        const updatedData = await TennisDataService.loadData();
        setData(updatedData);

        // Compute strict selectable courts after data update
        const Av = window.Tennis?.Domain?.availability;
        const S = window.Tennis?.Storage;
        if (Av && S) {
          const storageData = S.readDataSafe();
          const blocks = S.readJSON(S.STORAGE.BLOCKS) || [];
          const wetSet = new Set();
          const now = new Date();
          const selectable = [...Av.getSelectableCourtsStrict({ data: storageData, now, blocks, wetSet })];
          setAvailableCourts(selectable);
        }

        return updatedData;
      }
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

  // Expose current data globally for guardAddPlayerEarly (API backend mode)
  useEffect(() => {
    if (USE_API_BACKEND) {
      window.__registrationData = data;
    }
    return () => {
      window.__registrationData = null;
    };
  }, [data]);

  // PHASE1C: Redundant - subscribeToBoardChanges handles initial fetch
  // useEffect(() => {
  //   loadData();
  // }, []);

  // Real-time synchronization with other apps
  useEffect(() => {
    // Debounced handlers to prevent rapid bouncing
    let updateTimeout = null;
    
    const handleStorageUpdate = async (event) => {
      // Skip localStorage-based updates when using API backend
      if (USE_API_BACKEND) {
        dbg('Skipping localStorage update - using API backend');
        return;
      }

      if (event.detail && event.detail.key === TENNIS_CONFIG.STORAGE.KEY) {
        // Don't trigger updates if we're in the middle of a screen transition
        if (currentScreen === "search" || currentScreen === "group") {
          console.log('Skipping storage update during screen transition');
          return;
        }

        // Clear any pending update and debounce
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
          const updatedData = await TennisDataService.loadData();
          setData(updatedData);
          dbg('Data synchronized from external update');
        }, 500); // Increased debounce delay
      }
    };

    const handleStorageEvent = async (event) => {
      // Skip localStorage events when using API backend
      if (USE_API_BACKEND) {
        dbg('Skipping storage event - using API backend');
        return;
      }

      // Handle storage events from localStorage changes
      if (event.key === TENNIS_CONFIG.STORAGE.KEY && event.newValue) {
        // Don't trigger updates if we're in the middle of a screen transition
        if (currentScreen === "search" || currentScreen === "group") {
          dbg('Skipping localStorage update during screen transition');
          return;
        }

        // Clear any pending update and debounce
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
          const updatedData = await TennisDataService.loadData();
          setData(updatedData);
          console.log('Data synchronized from localStorage change');
        }, 500); // Increased debounce delay
      }
    };

    // Listen for custom events from DataStore
    window.addEventListener(EVENTS.UPDATE, scheduleAvailabilityRefresh);
    window.addEventListener('DATA_UPDATED', scheduleAvailabilityRefresh);
    
    // Listen for storage events from other windows/tabs
    window.addEventListener('storage', handleStorageEvent);

    // Refresh clear screen on updates
    const refreshClearScreen = () => {
      if (currentScreen === "clearCourt") {
        // Force re-render by updating state
        setCurrentScreen("clearCourt");
      }
    };
    document.addEventListener('tennisDataUpdate', refreshClearScreen);
    document.addEventListener('DATA_UPDATED', refreshClearScreen);

    return () => {
      clearTimeout(updateTimeout);
      window.removeEventListener(EVENTS.UPDATE, scheduleAvailabilityRefresh);
      window.removeEventListener('DATA_UPDATED', scheduleAvailabilityRefresh);
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('tennisDataUpdate', refreshClearScreen);
      document.removeEventListener('DATA_UPDATED', refreshClearScreen);
    };
  }, []);

  // TennisBackend Real-time subscription
  useEffect(() => {
    console.log('[TennisBackend] Setting up board subscription...');
    
    const unsubscribe = backend.queries.subscribeToBoardChanges((board) => {
      console.log('[TennisBackend] Board update received:', {
        serverNow: board.serverNow,
        courts: board.courts?.length,
        waitlist: board.waitlist?.length,
      });
      
      // Update courts and waitlist state
      setData(prev => ({
        ...prev,
        courts: board.courts || [],
        waitingGroups: board.waitlist || [],
      }));
      
      // Update operating hours
      if (board.operatingHours) {
        setOperatingHours(board.operatingHours);
      }
      
      // Update available courts (for court selection UI)
      const selectable = (board.courts || [])
        .filter(c => c.isUnoccupied || c.isOvertime)
        .map(c => c.number);
      setAvailableCourts(selectable);
      
      // Emit cta:state event for external components
      window.dispatchEvent(new CustomEvent('cta:state', {
        detail: {
          courts: board.courts || [],
          waitlist: board.waitlist || [],
          serverNow: board.serverNow,
        }
      }));
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

  // Update available courts only - CTA state now handled by cta:state event
  // NOTE: Skip this when using API backend - availableCourts is set by loadData()
  useEffect(() => {
    // When using API backend, don't overwrite availableCourts with localStorage data
    if (USE_API_BACKEND) {
      if (DEBUG) {
        console.log("useEffect: Skipping localStorage court update - using API backend");
      }
      return;
    }

    const updateAvailableCourts = () => {
      try {
        if (DEBUG) {
          console.log("useEffect: Updating available courts from localStorage...");
        }

        // Use the new gating logic - this useEffect is now mainly for updating available courts
        const courts = getAvailableCourts(false);
        if (DEBUG) {
          console.log("useEffect: Available courts from getAvailableCourts:", courts);
        }
        setAvailableCourts(courts);

        // NOTE: CTA state (canFirstGroupPlay, canSecondGroupPlay, etc.) is now
        // managed by the cta:state event listener above, not here
      } catch (error) {
        console.error('Error updating available courts:', error);
        setAvailableCourts([]);
      }
    };

    updateAvailableCourts();
  }, [currentScreen]); // Re-run when screen changes

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


// Historical Data Protection System
// This backs up court game data for analytics and reporting purposes in Admin.html
// It does NOT restore data automatically - it only saves historical records
useEffect(() => {
  const protectCourtHistory = async () => {
    const data = await TennisDataService.loadData();
    const now = new Date();
    
    // Create backup of all court history
    for (let index = 0; index < data.courts.length; index++) {
      const court = data.courts[index];
      if (court && ((court.current && court.current.players) || (court.players))) {
        const courtNumber = index + 1;
        const backupKey = `courtHistory_${courtNumber}`;
        
        // Get existing backup
        let courtBackup = await dataStore.get(backupKey) || [];
        
        // Get current game data
        const players = court.current?.players || court.players;
        const startTime = court.current?.startTime || court.startTime;
        const endTime = court.current?.endTime || court.endTime;
        
        if (players && players.length > 0 && startTime) {
          // Check if this game is already backed up
          const gameId = `${startTime}_${players.map(p => p.id).join('_')}`;
          const alreadyBacked = courtBackup.some(backup => backup.gameId === gameId);
          
          if (!alreadyBacked) {
            // Add to backup
            courtBackup.push({
              gameId: gameId,
              players: players,
              startTime: startTime,
              endTime: endTime,
              backedUpAt: now.toISOString(),
              courtNumber: courtNumber
            });
            
            // Save backup
            await dataStore.set(backupKey, courtBackup, { immediate: true });
            console.log(`Backed up game history for court ${courtNumber}`);
          }
        }
      }
    }
  };
  
  // Run backup every 10 seconds
  // DISABLED: protectCourtHistory is redundant now that StorageGuard prevents clobbering
  // protectCourtHistory();
  // const backupInterval = setInterval(protectCourtHistory, 10000);
  
  // return () => clearInterval(backupInterval);
}, []);

// REMOVED: Historical Data Restoration System
// This was causing issues where cleared data would be automatically restored every 15 seconds.
// We keep the Historical Data Protection System above for analytics purposes,
// but we don't want to automatically restore cleared courts.

// Auto-cleanup expired blocks weekly
useEffect(() => {
  const runBlockCleanup = () => {
    const removed = TennisDataService.cleanupExpiredBlocks();
    if (removed > 0) {
      console.log(`🧹 Weekly cleanup removed ${removed} expired blocks at ${new Date().toLocaleDateString()}`);
    }
  };
  
  // Run cleanup on app startup
  runBlockCleanup();
  
  // Run cleanup once a week (every 7 days)
  const interval = setInterval(runBlockCleanup, 7 * 24 * 60 * 60 * 1000); // 7 days
  
  return () => clearInterval(interval);
}, []); 

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
      DOUBLES_MIN: TENNIS_CONFIG.TIMING.DOUBLES_DURATION_MIN
    },
    MEMBER_COUNT: 40,
    MEMBER_ID_START: 1000,
    MAX_AUTOCOMPLETE_RESULTS: TENNIS_CONFIG.DISPLAY.MAX_AUTOCOMPLETE_RESULTS,
    MAX_FREQUENT_PARTNERS: TENNIS_CONFIG.DISPLAY.MAX_FREQUENT_PARTNERS,
    MAX_WAITING_DISPLAY: TENNIS_CONFIG.DISPLAY.MAX_WAITING_DISPLAY,
    AVG_GAME_TIME_MIN: TENNIS_CONFIG.TIMING.AVG_GAME_TIME_MIN,
    POLL_INTERVAL_MS: TENNIS_CONFIG.TIMING.POLL_INTERVAL_MS,
    UPDATE_INTERVAL_MS: TENNIS_CONFIG.TIMING.UPDATE_INTERVAL_MS
  };

  const [currentGroup, setCurrentGroup] = useState([]);
  const [memberNumber, setMemberNumber] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  // NOTE: availableCourts moved to top of component (line ~236) to avoid TDZ errors
  const [canFirstGroupPlay, _setCanFirstGroupPlay] = useState(false);
  const setCanFirstGroupPlay = (val) => {
    console.log('🎯 setCanFirstGroupPlay:', val, 'stack:', new Error().stack.split('\n')[2]);
    _setCanFirstGroupPlay(val);
  };
  const [firstWaitingGroup, setFirstWaitingGroup] = useState(null);
  const [waitingGroupDisplay, setWaitingGroupDisplay] = useState("");
  const [canSecondGroupPlay, _setCanSecondGroupPlay] = useState(false);
  const setCanSecondGroupPlay = (val) => {
    console.log('🎯 setCanSecondGroupPlay:', val, 'stack:', new Error().stack.split('\n')[2]);
    _setCanSecondGroupPlay(val);
  };
  const [secondWaitingGroup, setSecondWaitingGroup] = useState(null);
  const [secondWaitingGroupDisplay, setSecondWaitingGroupDisplay] = useState("");
  // State for CTA data from global recompute
  const [firstWaitingGroupData, setFirstWaitingGroupData] = useState(null);
  const [secondWaitingGroupData, setSecondWaitingGroupData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mobileCountdown, setMobileCountdown] = useState(5);
  const [justAssignedCourt, setJustAssignedCourt] = useState(null);
  const [replacedGroup, setReplacedGroup] = useState(null);
  const [originalCourtData, setOriginalCourtData] = useState(null);
  const [canChangeCourt, setCanChangeCourt] = useState(false);
  const [changeTimeRemaining, setChangeTimeRemaining] = useState(CONSTANTS.CHANGE_COURT_TIMEOUT_SEC);
  const [isTimeLimited, setIsTimeLimited] = useState(false);
  // NOTE: currentScreen moved to top of component (line ~235) to avoid TDZ errors
  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerSearch, setAddPlayerSearch] = useState("");
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
  const frequentPartnersCacheRef = useRef({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [courtToMove, setCourtToMove] = useState(null);
  const [moveToCourtNum, setMoveToCourtNum] = useState(null);
  const [hasAssignedCourt, setHasAssignedCourt] = useState(false);
  const [hasWaitlistPriority, setHasWaitlistPriority] = useState(false);
  const [currentWaitlistEntryId, setCurrentWaitlistEntryId] = useState(null);

  const [waitlistMoveFrom, setWaitlistMoveFrom] = useState(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestSponsor, setGuestSponsor] = useState("");
  const [guestCounter, setGuestCounter] = useState(1);
  const [showGuestNameError, setShowGuestNameError] = useState(false);
  const [showSponsorError, setShowSponsorError] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingInProgress, setBlockingInProgress] = useState(false);
  const [selectedCourtsToBlock, setSelectedCourtsToBlock] = useState([]);
  const [blockMessage, setBlockMessage] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("now");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [isSearching, setIsSearching] = useState(false); // Add searching state
  
  // Admin panel state - moved to top level
  const [ballPriceInput, setBallPriceInput] = useState('');
  const [showPriceSuccess, setShowPriceSuccess] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Debouncing hooks - MUST be at top level
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const debouncedAddPlayerSearch = useDebounce(addPlayerSearch, 300);
  
  // Determine which search value to use based on input type
  const shouldDebounceMainSearch = !/^\d+$/.test(searchInput);
  const effectiveSearchInput = shouldDebounceMainSearch ? debouncedSearchInput : searchInput;
  
  // Subscribe to CTA state updates from global recompute
  useEffect(() => {
    const onCta = (e) => {
      try {
        const d = e?.detail || {};

        // Ignore old format from cta-live.js (has liveFirst/freeCourts instead of live1/live2)
        if ('liveFirst' in d || 'freeCourts' in d) {
          console.log('🎯 Ignoring old CTA format event:', d);
          return;
        }

        console.log('🎯 CTA event received (API format):', d);
        // API mode uses: live1/live2/first/second
        const live1 = d.live1 ?? false;
        const live2 = d.live2 ?? false;
        const firstGroup = d.first ?? null;
        const secondGroup = d.second ?? null;

        console.log('🎯 CTA state parsed:', { live1, live2, firstGroup, secondGroup });
        console.log('🎯 Setting CTA button state:', { canFirstGroupPlay: !!live1, canSecondGroupPlay: !!live2 });

        setCanFirstGroupPlay(!!live1);
        setCanSecondGroupPlay(!!live2);
        setFirstWaitingGroupData(firstGroup);
        setSecondWaitingGroupData(secondGroup);
        
        // Update display names based on the new data
        if (live1 && firstGroup?.players) {
          const names = firstGroup.players.map(p => p.name.split(' ').pop());
          if (names.length <= 3) {
            setWaitingGroupDisplay(names.join(", "));
          } else {
            setWaitingGroupDisplay(`${names.slice(0, 3).join(", ")}, etc`);
          }
        } else {
          setWaitingGroupDisplay("");
        }

        if (live2 && secondGroup?.players) {
          const names = secondGroup.players.map(p => p.name.split(' ').pop());
          if (names.length <= 3) {
            setSecondWaitingGroupDisplay(names.join(", "));
          } else {
            setSecondWaitingGroupDisplay(`${names.slice(0, 3).join(", ")}, etc`);
          }
        } else {
          setSecondWaitingGroupDisplay("");
        }

        // Also sync the legacy state variables for compatibility
        setFirstWaitingGroup(firstGroup);
        setSecondWaitingGroup(secondGroup);
      } catch {}
    };
    window.addEventListener('cta:state', onCta, { passive: true });

    // Kick once on mount (in case recompute already ran)
    try { window.recomputeCtaLive && window.recomputeCtaLive(); } catch {}

    return () => window.removeEventListener('cta:state', onCta);
  }, []);
  
  const shouldDebounceAddPlayer = !/^\d+$/.test(addPlayerSearch);
  const effectiveAddPlayerSearch = shouldDebounceAddPlayer ? debouncedAddPlayerSearch : addPlayerSearch;

// Helper function to get occupied courts from domain status
function computeOccupiedCourts() {
  const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
  const S = window.Tennis?.Storage;
  const now = new Date();
  const data = S.readDataSafe();
  const blocks = S.readJSON(S.STORAGE?.BLOCKS) || [];
  const wetSet = new Set(
    (blocks||[])
      .filter(b => b?.isWetCourt && new Date(b.startTime ?? b.start) <= now && now < new Date(b.endTime ?? b.end))
      .map(b => b.courtNumber)
  );
  const statuses = A.getCourtStatuses({ data, now, blocks, wetSet });
  // Only true in-use courts
  const occupied = statuses.filter(s => s.status === 'occupied').map(s => s.courtNumber);
  return { occupied, data };
}

// Helper function to get courts that can be cleared (occupied or overtime)
function getCourtsOccupiedForClearing() {
  // For API backend, use React state data
  if (USE_API_BACKEND) {
    const reactData = getCourtData();
    const courts = reactData.courts || [];
    const now = new Date();

    const clearableCourts = courts
      .filter(c => {
        // Court has a session (is occupied)
        if (c.session || c.current || c.isOccupied) {
          // Not blocked
          if (c.isBlocked) return false;
          return true;
        }
        return false;
      })
      .map(c => c.number)
      .sort((a, b) => a - b);

    console.log('[getCourtsOccupiedForClearing] API courts:', clearableCourts);
    return clearableCourts;
  }

  // Legacy localStorage path
  const Av  = Tennis.Domain.availability || Tennis.Domain.Availability;
  const now = new Date();
  const S   = Tennis.Storage;
  const data   = S.readDataSafe();
  const blocks = S.readJSON(S.STORAGE.BLOCKS) || [];
  const wetSet = new Set(
    blocks
      .filter(b => b?.isWetCourt && new Date(b.startTime ?? b.start) <= now && now < new Date(b.endTime ?? b.end))
      .map(b => b.courtNumber)
  );

  const statuses = Av.getCourtStatuses({ data, now, blocks, wetSet });
  const clearableCourts = statuses
    .filter(s => (s.isOccupied || s.isOvertime) && !s.isBlocked)   // include occupied + overtime, but NOT blocked courts
    .map(s => s.courtNumber)
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
  // 1) playing: scan courts
  const courts = Array.isArray(data?.courts) ? data.courts : [];
  for (let i = 0; i < courts.length; i++) {
    const cur = courts[i]?.current;
    if (!cur) continue;
    const players = Array.isArray(cur.players) ? cur.players : [];
    for (const p of players) {
      if (__normalizeName(p) === norm || __normalizeName(p?.name) === norm) {
        return { type: 'playing', court: i + 1 };
      }
    }
  }
  // 2) waitlist: scan waitingGroups
  const wg = Array.isArray(data?.waitingGroups) ? data.waitingGroups : [];
  for (let i = 0; i < wg.length; i++) {
    const players = Array.isArray(wg[i]?.players) ? wg[i].players : [];
    for (const p of players) {
      if (__normalizeName(p) === norm || __normalizeName(p?.name) === norm) {
        return { type: 'waitlist', position: i + 1 };
      }
    }
  }
  return null;
}

function guardAddPlayerEarly(player) {
  const S = window.Tennis?.Storage;
  const R = window.Tennis?.Domain?.roster;

  // Use API data from React state when available, otherwise fall back to localStorage
  const data = (USE_API_BACKEND && window.__registrationData)
    ? window.__registrationData
    : (S?.readDataSafe?.() || {});

  // Enrich the player with memberId if possible
  const enriched = R?.enrichPlayersWithIds ? R.enrichPlayersWithIds([player], window.__memberRoster)[0] : player;

  // Use hybrid detection
  const engagement = R?.findEngagementFor ? R.findEngagementFor(enriched, data) : __findEngagementFor(player, data);

  if (DEBUG) {
    console.log('[guardAddPlayerEarly] Checking player:', player);
    console.log('[guardAddPlayerEarly] Enriched player:', enriched);
    console.log('[guardAddPlayerEarly] Data source:', USE_API_BACKEND ? 'API' : 'localStorage');
    console.log('[guardAddPlayerEarly] Data:', data);
    console.log('[guardAddPlayerEarly] Engagement found:', engagement);
  }

  if (!engagement) return true;

  const display = (enriched?.name || player?.name || player || '').toString().trim();
  if (engagement.type === 'playing') {
    Tennis.UI.toast(`${display} is already playing on Court ${engagement.court}`);
    return false;
  } else if (engagement.type === 'waitlist') {
    // Check if waitlist member can register based on available courts
    // For API backend, use availableCourts from the data directly
    if (USE_API_BACKEND) {
      const courts = Array.isArray(data?.courts) ? data.courts : [];
      const unoccupiedCount = courts.filter(c => c.isUnoccupied).length;
      const overtimeCount = courts.filter(c => c.isOvertime).length;
      const totalAvailable = unoccupiedCount > 0 ? unoccupiedCount : overtimeCount;
      const maxAllowedPosition = totalAvailable >= 2 ? 2 : 1;

      if (engagement.position <= maxAllowedPosition) {
        return true; // Allow this waitlist member to register
      }
    } else {
      // Legacy localStorage path
      const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
      if (A?.getFreeCourtsInfo) {
        try {
          const now = new Date();
          const blocks = S.readJSON(S.STORAGE.BLOCKS) || [];
          const wetSet = new Set();
          const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
          const freeCount = info.free?.length || 0;
          const overtimeCount = info.overtime?.length || 0;
          const totalAvailable = freeCount > 0 ? freeCount : overtimeCount;
          const maxAllowedPosition = totalAvailable >= 2 ? 2 : 1;

          if (engagement.position <= maxAllowedPosition) {
            return true; // Allow this waitlist member to register
          }
        } catch (error) {
          console.warn('Error checking waitlist eligibility:', error);
        }
      }
    }

    Tennis.UI.toast(`${display} is already on the waitlist (position ${engagement.position})`);
    return false;
  }
  return false;
}

function guardAgainstGroupDuplicate(player, playersArray) {
  const R = window.Tennis?.Domain?.roster;
  const nm = R?.normalizeName ? R.normalizeName(player?.name || player || '') : __normalizeName(player);
  const pid = player?.memberId || null;
  
  return !playersArray.some(p => {
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

  // Track when main search is in progress
  useEffect(() => {
    if (shouldDebounceMainSearch && searchInput !== debouncedSearchInput && searchInput.length > 0) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchInput, debouncedSearchInput, shouldDebounceMainSearch]);

  // Load current ball price when entering admin screen
  useEffect(() => {
    const loadAdminSettings = async () => {
      if (currentScreen === "admin") {
        try {
          const settings = await dataStore.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY);
          if (settings) {
            const parsed = settings || {};
            setBallPriceInput((parsed.tennisBallPrice || TENNIS_CONFIG.PRICING.TENNIS_BALLS).toFixed(2));
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
      "Novak Djokovic", "Carlos Alcaraz", "Jannik Sinner", "Daniil Medvedev", 
      "Alexander Zverev", "Andrey Rublev", "Casper Ruud", "Hubert Hurkacz",
      "Taylor Fritz", "Alex de Minaur", "Iga Swiatek", "Aryna Sabalenka",
      "Coco Gauff", "Elena Rybakina", "Jessica Pegula", "Ons Jabeur",
      "Marketa Vondrousova", "Karolina Muchova", "Beatriz Haddad Maia", "Petra Kvitova",
      "Stefanos Tsitsipas", "Felix Auger-Aliassime", "Cameron Norrie", "Karen Khachanov",
      "Frances Tiafoe", "Tommy Paul", "Lorenzo Musetti", "Ben Shelton",
      "Nicolas Jarry", "Sebastian Korda", "Madison Keys", "Victoria Azarenka",
      "Daria Kasatkina", "Belinda Bencic", "Caroline Garcia", "Simona Halep",
      "Elina Svitolina", "Maria Sakkari", "Liudmila Samsonova", "Zheng Qinwen"
    ];
    
    memberDatabase[id.toString()] = {
      familyMembers: [{
        id: id,
        name: names[i - 1] || `Player ${i}`,
        phone: `555-${String(i).padStart(4, '0')}`,
        ranking: ((i - 1) % 20) + 1,
        winRate: 0.5 + (Math.random() * 0.4)
      }],
      playingHistory: [],
      lastGame: null
    };
  }

  // Create roster from memberDatabase and ensure member IDs
  const memberRoster = React.useMemo(() => {
    const roster = [];
    Object.entries(memberDatabase).forEach(([memberNum, data]) => {
      data.familyMembers.forEach(member => {
        roster.push({
          id: member.id,
          name: member.name,
          memberNumber: memberNum,
          phone: member.phone,
          ranking: member.ranking,
          winRate: member.winRate
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
        setCurrentScreen('group');
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
      showSuccess
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
      } catch(e) {
        if (DEBUG) console.log('Registration: Error in direct success message:', e);
      }
      
      // Start countdown for mobile
      setMobileCountdown(5);
      const countdownInterval = setInterval(() => {
        setMobileCountdown(prev => {
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

  // Update available courts when current group changes
  // NOTE: Skip this when using API backend - availableCourts is set by loadData()
  useEffect(() => {
    // When using API backend, don't overwrite availableCourts with localStorage data
    if (USE_API_BACKEND) {
      console.log("useEffect (currentGroup): Skipping localStorage update - using API backend");
      return;
    }

    const updateAvailableCourts = () => {
      try {
        const data = getCourtData();
        const tempAvailableCourts = getAvailableCourts(false); // Get courts without waitlist check
        const hasUnoccupiedCourts = data.courts.some((court, index) => {
          const courtNumber = index + 1;
          const blockStatus = getCourtBlockStatus(courtNumber);
          if (blockStatus && blockStatus.isCurrent) return false;

          return !court || court.wasCleared || (court.current === null && court.history) ||
                 ((!court.players || court.players.length === 0) &&
                  (!court.current || !court.current.players || court.current.players.length === 0));
        });

        // If there are available courts but no unoccupied courts, these must be overtime courts
        const shouldBypassWaitlistPriority = tempAvailableCourts.length > 0 && !hasUnoccupiedCourts;

        console.log("🔍 useEffect (currentGroup) DEBUG:");
        console.log("  - tempAvailableCourts:", tempAvailableCourts);
        console.log("  - hasUnoccupiedCourts:", hasUnoccupiedCourts);
        console.log("  - shouldBypassWaitlistPriority:", shouldBypassWaitlistPriority);
        console.log("  - waitlist length:", data.waitingGroups.length);

        // Use the synchronous getAvailableCourts function with appropriate priority setting
        const courts = getAvailableCourts(!shouldBypassWaitlistPriority);
        console.log("useEffect (currentGroup): Available courts:", courts);
        setAvailableCourts(courts);
      } catch (error) {
        console.error('Error updating available courts:', error);
        setAvailableCourts([]);
      }
    };
    
    if (currentGroup.length > 0) {
      updateAvailableCourts();
    }
  }, [currentGroup]);

  // Wire up event listeners for availability updates (once only)
  // NOTE: Skip this when using API backend - these events update from localStorage
  useEffect(() => {
    // When using API backend, don't wire up localStorage-based event listeners
    if (USE_API_BACKEND) {
      console.log("useEffect: Skipping localStorage event listeners - using API backend");
      return;
    }

    if (!window.__wiredAvailabilityEvents) {
      const refreshAvailability = () => {
        // This is called by both events, reusing the existing updateAvailableCourts logic
        if (currentGroup.length > 0) {
          const updateAvailableCourts = () => {
            try {
              const data = getCourtData();
              const tempAvailableCourts = getAvailableCourts(false);
              const hasUnoccupiedCourts = data.courts.some((court, index) => {
                const courtNumber = index + 1;
                const blockStatus = getCourtBlockStatus(courtNumber);
                if (blockStatus && blockStatus.isCurrent) return false;

                return !court || court.wasCleared || (court.current === null && court.history) ||
                  (court.history && court.history.length > 0 && (!court.players || court.players.length === 0));
              });

              if (hasUnoccupiedCourts) {
                setAvailableCourts(tempAvailableCourts);
              } else {
                setAvailableCourts([]);
              }
            } catch (error) {
              console.error('Error updating available courts:', error);
              setAvailableCourts([]);
            }
          };
          updateAvailableCourts();
        }
      };

      window.addEventListener('tennisDataUpdate', refreshAvailability);
      window.addEventListener('DATA_UPDATED', refreshAvailability);
      window.addEventListener('BLOCKS_UPDATED', refreshAvailability, { passive: true });
      window.__wiredAvailabilityEvents = true;
    }
    
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup]); // getCourtData, getAvailableCourts, getCourtBlockStatus are stable module-level functions

  // Activity tracking for timeout
  const updateActivity = () => {
    setLastActivity(Date.now());
    setShowTimeoutWarning(false);
    
    // Clear and restart timers when there's activity
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    
    if (currentScreen === "group") {
      // Set warning timer
      warningTimerRef.current = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, CONSTANTS.SESSION_WARNING_MS);

      // Set timeout timer
      timeoutTimerRef.current = setTimeout(() => {
        showAlertMessage("Session timed out due to inactivity");
        // Reset all form state
        setCurrentGroup([]);
        setShowSuccess(false);
        setMemberNumber("");
        setJustAssignedCourt(null);
        setReplacedGroup(null);
        setOriginalCourtData(null);
        setCanChangeCourt(false);
        setIsTimeLimited(false);
        setCurrentScreen("welcome");
        setSearchInput("");
        setShowSuggestions(false);
        setShowAddPlayer(false);
        setAddPlayerSearch("");
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
    if (currentScreen === "group") {
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

// Get start time from either structure (new or old)
const startTime = court.current?.startTime || court.startTime;

// Check for overtime courts (only if not blocked and has start time)
if (startTime && !isCurrentlyBlocked) {
  const startTimeMs = new Date(startTime).getTime();
  const timePlayed = now - startTimeMs;
  
  if (timePlayed > maxDuration) {
    // Auto-clear this court using the same logic as manual clear
    console.log(`Auto-clearing court ${index + 1} after ${CONSTANTS.MAX_PLAY_DURATION_MIN / 60} hours`);
    hasChanges = true;
    
    // Handle both structures when clearing
    if (court.current) {
      // New structure - preserve history
      court.current = null;
      if (!court.history) court.history = [];
      // Could add to history here if needed
    } else {
      // Old structure - mark as cleared
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
      
      data.recentlyCleared = data.recentlyCleared.filter(session => {
        // Keep sessions that were cleared less than 4 hours ago
        return new Date(session.clearedAt).getTime() > fourHoursAgo.getTime();
      });
      
      if (data.recentlyCleared.length !== originalLength) {
        hasChanges = true;
      }
    }
    
    // Save changes if any courts were auto-cleared or sessions expired
    if (hasChanges) {
      TennisDataService.saveData(data);
    }
    
    return data;
  };

  // Save court data using the data service
  const saveCourtData = async (data) => {
    const result = await TennisDataService.saveData(data);
    
    if (!result.success) {
      showAlertMessage(result.error || 'Failed to save data');
    }
    
    return result.success;
  };

  // Check if player is next in waitlist
  const isPlayerNextInWaitlist = (playerId) => {
    const data = getCourtData();
    if (data.waitingGroups.length > 0) {
      const firstGroup = data.waitingGroups[0];
      return firstGroup.players.some(player => player.id === playerId);
    }
    return false;
  };

// Get available courts (strict selectable API - single source of truth)
const getAvailableCourts = (checkWaitlistPriority = true, includeOvertimeIfChanging = false, excludeCourtNumber = null) => {
  const Av = Tennis.Domain.availability || Tennis.Domain.Availability;
  if (!Av?.getSelectableCourtsStrict || !Av?.getFreeCourtsInfo) {
    console.warn('Availability functions not available');
    return [];
  }

  try {
    const data = Tennis.Storage.readDataSafe();
    const now = new Date();
    const blocks = Tennis.Storage.readJSON(Tennis.Storage.STORAGE.BLOCKS) || [];
    const wetSet = new Set();

    let selectable = [];

    if (checkWaitlistPriority) {
      // Waitlist priority mode: ONLY show truly free courts (no overtime fallback)
      const info = Av.getFreeCourtsInfo({ data, now, blocks, wetSet });
      selectable = info.free || [];
      dbg("Waitlist priority mode - free courts only:", selectable);
    } else {
      // Non-waitlist mode: use standard selectable logic (free first, then overtime fallback)
      selectable = Av.getSelectableCourtsStrict({ data, now, blocks, wetSet });
      dbg("Standard selectable courts:", selectable);
    }
    
    // Apply excludeCourtNumber filter if specified
    const filtered = excludeCourtNumber 
      ? selectable.filter(n => n !== excludeCourtNumber)
      : selectable;
      
    return filtered;
  } catch (error) {
    console.error('Error in getAvailableCourts:', error);
    return [];
  }
};
  

// ✅ NEW WRAPPER FUNCTION
const tryAssignCourtToGroup = () => {
  const groupId = currentGroup.map(p => p.id).sort().join("-");
  const data = TennisDataService.loadData();
  const courts = data.courts;

  for (let i = 0; i < courts.length; i++) {
    const courtNumber = i + 1;

    // Skip if group declined this court
    if (declinedCourts[groupId]?.includes(courtNumber)) {
      continue;
    }

    // Check if court is fully occupied or blocked right now
    const court = courts[i];
    const isOccupied = court?.current && new Date(court.current.endTime) > new Date();
    const isBlocked = court?.blocked && new Date(court.blocked.startTime) <= new Date();

    if (!isOccupied && !isBlocked) {
      // Found an available court - assign it to the group
      assignCourtToGroup(courtNumber);
      return;
    }
  }

  showAlertMessage("No suitable courts available at this time.");
};


const assignCourtToGroup = async (courtNumber) => {
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

  // Get opening time from API or use fallback
  let openingTime;
  let openingTimeString;

  if (USE_API_BACKEND && operatingHours && Array.isArray(operatingHours)) {
    // Find today's operating hours from API
    const todayHours = operatingHours.find(h => h.day_of_week === dayOfWeek);
    if (todayHours && !todayHours.is_closed) {
      // Parse opens_at (format: "HH:MM:SS")
      const [hours, minutes] = todayHours.opens_at.split(':').map(Number);
      openingTime = hours + (minutes / 60);
      // Format for display (e.g., "5:00 AM")
      const hour12 = hours % 12 || 12;
      const ampm = hours < 12 ? 'AM' : 'PM';
      openingTimeString = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else if (todayHours && todayHours.is_closed) {
      Tennis.UI.toast('The club is closed today.', { type: 'warning' });
      return;
    } else {
      // Fallback if no hours found
      openingTime = 7;
      openingTimeString = "7:00 AM";
    }
  } else {
    // Legacy fallback: hardcoded hours
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    openingTime = isWeekend ? 7 : 6.5;
    openingTimeString = isWeekend ? "7:00 AM" : "6:30 AM";
  }

  const currentTime = currentHour + (currentMinutes / 60);

  // If too early, show alert and return
  if (currentTime < openingTime) {
    Tennis.UI.toast(`The club is not open yet. Court registration will be available at ${openingTimeString}.`, { type: 'warning' });
    return;
  }
  
  // Validate court number
  if (!courtNumber || courtNumber < 1 || courtNumber > CONSTANTS.COURT_COUNT) {
    showAlertMessage(`Invalid court number. Please select a court between 1 and ${CONSTANTS.COURT_COUNT}.`);
    return;
  }
  
  // Validate group has players
  if (!currentGroup || currentGroup.length === 0) {
    showAlertMessage("No players in group. Please add players first.");
    return;
  }
  
  // Create arrays for validation and assignment
const players = currentGroup
  .filter(p => !p.isGuest)  // Non-guests for validation
  .map(p => ({
    id: String(p.id || '').trim(),
    name: String(p.name || '').trim()
  }))
  .filter(p => p && p.id && p.name);

const allPlayers = currentGroup  // ALL players including guests for court assignment
  .map(p => ({
    id: String(p.id || '').trim(),
    name: String(p.name || '').trim(),
    ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
    ...(p.sponsor && { sponsor: p.sponsor }),
    ...(p.memberNumber && { memberNumber: p.memberNumber })
  }))
  .filter(p => p && p.id && p.name);

const guests = currentGroup.filter(p => p.isGuest).length;

// Domain validation (reuse the same error UI as submit)
const { ok, errors } = validateGroupCompat(players, guests);
if (!ok) {
  try {
    // Try to infer the variables you use in this scope:
    const playersVar =
      (typeof selectedPlayers !== 'undefined' ? selectedPlayers :
      (typeof groupPlayers !== 'undefined' ? groupPlayers :
      (typeof players !== 'undefined' ? players : [])));

    const hasGuestFlag =
      (typeof hasGuest !== 'undefined' ? hasGuest :
      (typeof includeGuest !== 'undefined' ? includeGuest :
      (typeof guest !== 'undefined' ? guest : false)));

    // Heuristics to detect a guest row in the list
    const playersArr = Array.isArray(playersVar) ? playersVar.filter(Boolean) : [];
    const guestRows = playersArr.filter(p =>
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
      try { sizeRaw = playersArr.length + (hasGuestFlag ? 1 : 0); } catch {}
    }

    console.warn('[GroupSizeDiag] about to show MAX SIZE error — details:', {
      playersCount: playersArr.length,
      guestRowsCount: guestRows.length,
      hasGuestFlag: !!hasGuestFlag,
      sizeRaw
    });
    console.warn('[GroupSizeDiag] players snapshot:', playersArr.map(p => ({
      name: p?.name ?? null,
      isGuest: !!p?.isGuest,
      type: p?.type ?? null,
      memberNumber: p?.memberNumber ?? null
    })));
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
  const sessionEnd = new Date(now.getTime() + (duration * 60000));
  
  // Check if block will start before session ends
  if (blockStart < sessionEnd) {
    const minutesUntilBlock = Math.ceil((blockStart - now) / 60000);
    const confirmMsg = `⚠️ This court has a block starting in ${minutesUntilBlock} minutes (${blockStatus.reason}). You may not get your full ${duration} minutes.\n\nDo you want to take this court anyway?`;

    const proceed = confirm(confirmMsg);
    if (!proceed) {
      showAlertMessage("Please select a different court or join the waitlist.");
      return; // Exit without assigning
    }
  }
}

console.log('🔵 UI preparing to assignCourt with:', {
  courtNumber,
  group,
  duration
});

// If this is a waitlist group (CTA flow), use assignFromWaitlist instead
if (currentWaitlistEntryId) {
  // Get court UUID for the waitlist assignment
  const waitlistCourt = data.courts.find(c => c.number === courtNumber);
  if (!waitlistCourt) {
    console.error('❌ Court not found for waitlist assignment:', courtNumber);
    Tennis.UI.toast('Court not found. Please refresh and try again.', { type: 'error' });
    return;
  }

  console.log('🎯 Using backend.commands.assignFromWaitlist:', {
    waitlistEntryId: currentWaitlistEntryId,
    courtId: waitlistCourt.id,
    courtNumber,
  });

  try {
    const result = await backend.commands.assignFromWaitlist({
      waitlistEntryId: currentWaitlistEntryId,
      courtId: waitlistCourt.id,
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
      Tennis.UI.toast(result.message || 'Failed to assign court from waitlist', { type: 'error' });
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
      setTimeout(() => {
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
const court = data.courts.find(c => c.number === courtNumber);
if (!court) {
  console.error('❌ Court not found for number:', courtNumber);
  Tennis.UI.toast('Court not found. Please refresh and try again.', { type: 'error' });
  return;
}

// Determine group type from player count
const groupType = allPlayers.length <= 2 ? 'singles' : 'doubles';

console.log('🔵 Calling backend.commands.assignCourtWithPlayers:', {
  courtId: court.id,
  courtNumber: court.number,
  groupType,
  playerCount: allPlayers.length,
});

let result;
try {
  result = await backend.commands.assignCourtWithPlayers({
    courtId: court.id,
    players: allPlayers,
    groupType,
  });
  console.log('✅ Court assigned result:', result);
} catch (error) {
  console.error('❌ assignCourtWithPlayers threw error:', error);
  Tennis.UI.toast(error.message || 'Failed to assign court. Please try again.', { type: 'error' });
  return;
}

if (!result.ok) {
  console.log('❌ assignCourtWithPlayers returned ok:false:', result.code, result.message);
  // Handle "Court occupied" race condition
  if (result.code === 'COURT_OCCUPIED') {
    Tennis.UI.toast('This court was just taken. Refreshing...', { type: 'warning' });
    // Board subscription will auto-refresh, but force immediate refresh
    await backend.queries.refresh();
    return;
  }
  Tennis.UI.toast(result.message || 'Failed to assign court', { type: 'error' });
  return;
}

// Success! Board subscription will auto-refresh from signal
console.log('✅ Court assignment successful, waiting for board refresh signal');

  // Check if there were other courts available at time of assignment
  const availableAtAssignment = getAvailableCourts(
    !isChangingCourt, 
    false,
    courtNumber  // Exclude the court we're about to assign
  );
  
  // Only allow court changes if there were other options
  const allowCourtChange = availableAtAssignment.length > 0;
  
  // Update UI state based on result
  setJustAssignedCourt(courtNumber);
  setReplacedGroup(result.replacedGroup);
  setOriginalCourtData(null);
  setIsChangingCourt(false);
  setWasOvertimeCourt(false);
  setHasAssignedCourt(true);  // Track that this group has a court
  setCanChangeCourt(allowCourtChange);  // Only true if alternatives exist
  setChangeTimeRemaining(CONSTANTS.CHANGE_COURT_TIMEOUT_SEC);
  setIsTimeLimited(result.isTimeLimited || false);  // Track if time was limited
  setShowSuccess(true);
  
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
    setTimeout(() => {
      resetForm();
    }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
  }

  if (allowCourtChange) {
    const timer = setInterval(() => {
      setChangeTimeRemaining(prev => {
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
        duration: null
      });
    }
    
    // Check if we're leaving an overtime court selection
    const wasOvertime = replacedGroup !== null;
    
    // Don't clear the court yet - just navigate to selection
    setShowSuccess(false);
    setIsChangingCourt(true);
    setWasOvertimeCourt(wasOvertime);
    setCurrentScreen("court");
  };

  // Clear a court via TennisBackend
  async function clearViaService(courtNumber, clearReason) {
    // Get court UUID from court number
    const court = data.courts.find(c => c.number === courtNumber);
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
    console.log(`[Registration UI] clearCourt called for court ${courtNumber} with reason: ${clearReason}`);
    
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
    const traceId = `WL-${Date.now()}`;
    try {
      console.log(`🔴🔴🔴 [${traceId}] sendGroupToWaitlist START`);
      console.log(`🔴 [${traceId}] Raw group argument:`, JSON.stringify(group, null, 2));
      console.log(`🔴 [${traceId}] Current currentGroup state:`, JSON.stringify(currentGroup, null, 2));

      if (!group || !group.length) {
        console.warn('[waitlist] no players selected');
        return;
      }

      // Build the players array (keep guests for waitlist display)
      const players = group
        .map(p => {
          const mapped = {
            id: String(p.id || '').trim(),
            name: String(p.name || '').trim(),
            memberNumber: p.memberNumber || p.member_number || p.id,
            ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
            ...(p.sponsor && { sponsor: p.sponsor })
          };
          console.log(`🔴 [${traceId}] Mapping player: ${p.name} (id=${p.id}, memberNumber=${p.memberNumber}) -> ${mapped.name} (id=${mapped.id}, memberNumber=${mapped.memberNumber})`);
          return mapped;
        })
        .filter(p => p && p.id && p.name);

      const guests = group.filter(p => p.isGuest).length;

      console.log(`🔴 [${traceId}] Final players to send:`, JSON.stringify(players, null, 2));
      console.log('[waitlist] calling addToWaitlist with', players.map(p=>p.name), 'guests:', guests);
      
      // Validation check
      const validation = validateGroupCompat(players, guests);
      if (!validation.ok) {
        try { Tennis.UI.toast(validation.errors.join(' '), { type: 'error' }); } catch {}
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

      console.log('[waitlist] Calling backend.commands.joinWaitlistWithPlayers:', {
        playerCount: players.length,
        groupType,
        players: players.map(p => `${p.name}(mn=${p.memberNumber})`),
      });

      const result = await backend.commands.joinWaitlistWithPlayers({
        players,
        groupType,
      });
      console.log('[waitlist] Result:', result);

      if (result.ok) {
        // Store the position from response for the success screen
        if (result.position) {
          setWaitlistPosition(result.position);
          console.log('[waitlist] Position:', result.position);
        }
        // Toast and rely on board subscription for UI refresh
        Tennis?.UI?.toast?.(`Added to waiting list (position ${result.position})`, { type: 'success' });
        console.debug('[waitlist] joined ok');
      } else {
        console.error('[waitlist] Failed:', result.code, result.message);
        Tennis?.UI?.toast?.(result.message || 'Could not join waitlist', { type: 'error' });
      }
    } catch (e) {
      console.error('[waitlist] failed:', e);
      Tennis?.UI?.toast?.('Could not join waitlist', { type: 'error' });
    }
  };

  // Reset form
  const resetForm = () => {
    
    setCurrentGroup([]);
    setShowSuccess(false);
    setMemberNumber("");
    setJustAssignedCourt(null);
    setReplacedGroup(null);
    setOriginalCourtData(null);
    setCanChangeCourt(false);
    setIsTimeLimited(false);
    setCurrentScreen("welcome");
    setSearchInput("");
    setShowSuggestions(false);
    setShowAddPlayer(false);
    setAddPlayerSearch("");
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
    setGuestName("");
    setGuestSponsor("");
    setShowGuestNameError(false);
    setShowSponsorError(false);
  };

  // Get all members
  const getAllMembers = () => {
    const allMembers = {};
    Object.values(memberDatabase).forEach(member => {
      member.familyMembers.forEach(player => {
        allMembers[player.id] = player;
      });
    });
    return allMembers;
  };

  // Get frequent partners
  const getFrequentPartners = (memberNumber) => {
    // When API backend is enabled, use apiMembers
    if (USE_API_BACKEND) {
      if (apiMembers.length === 0) {
        console.warn('⚠️ API members not loaded yet, frequent partners unavailable');
        return [];
      }

      // Find the current member to exclude them
      const currentMember = apiMembers.find(m => m.member_number === memberNumber);
      if (!currentMember) {
        console.warn('⚠️ Current member not found in API members');
        return [];
      }

      // Use member_number as seed for consistent random generation
      const seed = parseInt(memberNumber) || 0;

      // Get all potential partners (excluding self and family members on same account)
      const potentialPartners = [];

      apiMembers.forEach(apiMember => {
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
            count: normalizedCount
          });
        }
      });

      // Sort by play count and return top 6
      return potentialPartners
        .sort((a, b) => b.count - a.count)
        .slice(0, CONSTANTS.MAX_FREQUENT_PARTNERS);
    }

    // Legacy: Use hardcoded memberDatabase
    const member = memberDatabase[memberNumber];
    if (!member || !member.familyMembers || member.familyMembers.length === 0) return [];

    // Use member ID as seed for consistent random generation
    const seed = member.familyMembers[0].id;

    const allMembers = getAllMembers();
    const memberIds = Object.keys(allMembers);

    // Get all potential partners (excluding self)
    const potentialPartners = [];

    memberIds.forEach((partnerId, index) => {
      if (partnerId != member.familyMembers[0].id) {
        const player = allMembers[partnerId];
        if (player) {
          // Check if this player is currently playing
          const playerStatus = isPlayerAlreadyPlaying(parseInt(partnerId));
          if (!playerStatus.isPlaying) {
            // Generate a consistent "play count" based on both IDs
            const combinedSeed = seed + parseInt(partnerId);
            const playCount = (combinedSeed * 9301 + 49297) % 233280;
            const normalizedCount = (playCount % 10) + 1;

            potentialPartners.push({
              player: player,
              count: normalizedCount
            });
          }
        }
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
    return words.every(word => word.length >= 2 && /^[a-zA-Z]+$/.test(word));
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
      showAlertMessage("Invalid player data. Please try again.");
      return;
    }

    // For API backend, player should already have all data from apiMembers
    // For legacy, enrich from roster
    let enriched;
    if (USE_API_BACKEND) {
      // Player from getFrequentPartners already has API data
      enriched = player;
    } else {
      const R = window.Tennis?.Domain?.roster;
      enriched = R?.enrichPlayersWithIds ? R.enrichPlayersWithIds([player], memberRoster)[0] : player;
    }

    // Ensure player has at least a name
    if (!enriched?.name && !player?.name) {
      showAlertMessage("Player must have a name");
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
    window.computeEtaPreview();
  };

  // Find member number
  const findMemberNumber = (playerId) => {
    // First check if the playerId itself is a member number
    if (memberDatabase[playerId]) {
      return playerId;
    }
    
    // Then check family members
    for (const [memberNum, member] of Object.entries(memberDatabase)) {
      if (member.familyMembers.some(m => String(m.id) === String(playerId))) {
        return memberNum;
      }
    }
    return "";
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
    return A.every((x,i)=>x===B[i]);
  };

  // Get autocomplete suggestions
  const getAutocompleteSuggestions = (input) => {
    if (!input || input.length < 1) return [];

    const suggestions = [];
    const lowerInput = input.toLowerCase();

    // When API backend is enabled, ONLY use API members - never fall back to hardcoded data
    if (USE_API_BACKEND) {
      // If API members haven't loaded yet, return empty (user will see no suggestions until loaded)
      if (apiMembers.length === 0) {
        console.warn('⚠️ API members not loaded yet, autocomplete unavailable');
        return [];
      }

      apiMembers.forEach(apiMember => {
        const displayName = apiMember.display_name || apiMember.name || '';
        const memberNumber = apiMember.member_number || '';

        // Split the name into parts
        const nameParts = displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts[nameParts.length - 1] || '';

        // Check if input matches the beginning of first or last name, or member number
        if (firstName.toLowerCase().startsWith(lowerInput) ||
            lastName.toLowerCase().startsWith(lowerInput) ||
            memberNumber.startsWith(input)) {
          suggestions.push({
            memberNumber: memberNumber,
            member: {
              id: apiMember.id, // This is the UUID from API
              name: displayName,
              accountId: apiMember.account_id,
              isPrimary: apiMember.is_primary,
            },
            displayText: `${displayName} (#${memberNumber})`
          });
        }
      });
    } else {
      // Legacy: Use hardcoded memberDatabase (only when API backend is disabled)
      Object.entries(memberDatabase).forEach(([memberNum, data]) => {
        data.familyMembers.forEach(member => {
          // Split the name into parts
          const nameParts = member.name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts[nameParts.length - 1] || '';

          // Check if input matches the beginning of first or last name, or member number
          if (firstName.toLowerCase().startsWith(lowerInput) ||
              lastName.toLowerCase().startsWith(lowerInput) ||
              memberNum.startsWith(input)) {
            suggestions.push({
              memberNumber: memberNum,
              member: member,
              displayText: `${member.name} (#${memberNum})`
            });
          }
        });
      });
    }

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
      showAlertMessage("Invalid member selection. Please try again.");
      return;
    }

    // For API backend, member is already validated from API data
    // For legacy, validate member is in hardcoded database
    if (!USE_API_BACKEND && !memberDatabase[suggestion.memberNumber]) {
      showAlertMessage("Member number not found in database.");
      return;
    }

    // Enrich member - for API mode, use the API data directly
    let enrichedMember;
    if (USE_API_BACKEND) {
      // API member already has correct id (UUID) and accountId
      enrichedMember = {
        id: suggestion.member.id, // UUID from API
        name: suggestion.member.name,
        memberNumber: suggestion.memberNumber,
        accountId: suggestion.member.accountId,
        memberId: suggestion.member.id, // Same as id for API members
      };
      console.log('🔵 handleSuggestionClick - API enriched member:', enrichedMember);
    } else {
      // Legacy: enrich from local roster
      const R = window.Tennis?.Domain?.roster;
      enrichedMember = R?.enrichPlayersWithIds ? R.enrichPlayersWithIds([suggestion.member], memberRoster)[0] : suggestion.member;
    }
    
    // Early duplicate guard - if player is already playing/waiting, stop here
    if (!guardAddPlayerEarly(enrichedMember)) {
      setSearchInput("");
      setShowSuggestions(false);
      return; // Don't navigate to group screen
    }
    
    const playerStatus = isPlayerAlreadyPlaying(suggestion.member.id);
    
    // Don't set member number if player is engaged elsewhere
    // This prevents navigation to group screen
    
    // Set member number now that we know player can proceed
    setMemberNumber(suggestion.memberNumber);
    
    // Check if this player is in the first waiting group and courts are available
    if (playerStatus.isPlaying && playerStatus.location === 'waiting' && playerStatus.position === 1) {
      const data = getCourtData();
      const availableCourts = getAvailableCourts(false);
      
      if (availableCourts.length > 0) {
        // Player is in first waiting group and courts are available
        const firstWaitingGroup = data.waitingGroups[0];
        
        // Load the entire waiting group
        setCurrentGroup(firstWaitingGroup.players.map(player => ({
          ...player,
          memberNumber: findMemberNumber(player.id)
        })));
        
        
        // Remove the group from waitlist
        data.waitingGroups.shift();
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
        
        setSearchInput("");
        setShowSuggestions(false);
        setCurrentScreen("court"); // Go directly to court selection since group is already complete
        return;
      }
    }
    
    // Check if player is in position 2 and there are 2+ courts available
    if (playerStatus.isPlaying && playerStatus.location === 'waiting' && playerStatus.position === 2) {
      const data = getCourtData();
      const availableCourts = getAvailableCourts(false);
      
      if (availableCourts.length >= 2) {
        // Player is in second waiting group and there are at least 2 courts
        const secondWaitingGroup = data.waitingGroups[1];
        
        // Load the entire waiting group
        setCurrentGroup(secondWaitingGroup.players.map(player => ({
          ...player,
          memberNumber: findMemberNumber(player.id)
        })));
        
        
        // Remove the group from waitlist
        data.waitingGroups.splice(1, 1); // Remove second group
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
        
        setSearchInput("");
        setShowSuggestions(false);
        setCurrentScreen("court"); // Go directly to court selection since group is already complete
        return;
      }
    }

    // Normal flow for new players - we already checked conflicts above
    setSearchInput("");
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

    setCurrentScreen("group");
  };

  // Success screen
  if (showSuccess) {
    const isCourtAssignment = justAssignedCourt !== null;
    const data = getCourtData();
    // Find court by number (API may return courts in different order than array index)
    const courts = data.courts || [];
    const assignedCourt = justAssignedCourt
      ? (courts.find(c => c.number === justAssignedCourt) || courts[justAssignedCourt - 1])
      : null;
    
    let estimatedWait = 0;
    let position = 0;
    if (!isCourtAssignment) {
      // Position in queue - use API position if available, otherwise count from state
      if (USE_API_BACKEND && waitlistPosition > 0) {
        position = waitlistPosition;
        console.log('[SuccessScreen] Using API waitlist position:', position);
      } else {
        position = data.waitingGroups.length;
        console.log('[SuccessScreen] Using state waitlist length as position:', position);
      }
      
      // Calculate estimated wait time based on court end times
      if (USE_API_BACKEND) {
        // API backend: use court session and block data directly
        try {
          const now = currentTime.getTime();

          // Collect end times from sessions and blocks (courts that are occupied/blocked)
          const courtEndTimes = data.courts
            .map(court => {
              if (!court) return null;
              // Session end time
              if (court.session?.endTime && court.session.endTime > now) {
                return court.session.endTime;
              }
              // Block end time (court is blocked)
              if (court.block?.endTime && court.block.endTime > now) {
                return court.block.endTime;
              }
              // Fallback: top-level endTime
              if (court.endTime && court.endTime > now) {
                return court.endTime;
              }
              return null;
            })
            .filter(endTime => endTime !== null)
            .sort((a, b) => a - b);

          console.log('[SuccessScreen] Court end times:', courtEndTimes.map(t => new Date(t).toLocaleTimeString()));
          console.log('[SuccessScreen] Position:', position, 'Courts with end times:', courtEndTimes.length);

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
            const extraCycles = Math.ceil((position - courtEndTimes.length) / Math.max(courtEndTimes.length, 1));
            estimatedWait = baseWait + (extraCycles * avgGameTime);
          }
          console.log('[SuccessScreen] API estimated wait:', estimatedWait, 'minutes');
        } catch (e) {
          console.error('Error calculating wait time:', e);
          estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
        }
      } else {
        // localStorage backend: use domain-based calculation
        try {
          const Avail = window.Tennis.Domain.availability || window.Tennis.Domain.Availability;
          const Wait = window.Tennis.Domain.waitlist || window.Tennis.Domain.Waitlist;
          const Storage = window.Tennis.Storage;

          const now = new Date();
          const blocks = Storage.readJSON(Storage.STORAGE.BLOCKS) || [];
          const wetSet = new Set(
            blocks.filter(b => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
                  .map(b => b.courtNumber)
          );

          // Get availability info same as CourtBoard
          const nextTimes = Avail.getNextFreeTimes({ data, now, blocks });
          const info = Avail.getFreeCourtsInfo({ data, now, blocks, wetSet });

          // Calculate wait time using proper domain logic
          const etas = Wait.estimateWaitForPositions({
            positions: [position],
            currentFreeCount: info.free.length,
            nextFreeTimes: nextTimes,
            avgGameMinutes: CONSTANTS.AVG_GAME_TIME_MIN
          });

          estimatedWait = etas[0] || 0;
        } catch (e) {
          console.error('Error calculating wait time:', e);
          // Fallback to simple calculation if domain logic fails
          const courtEndTimes = data.courts
            .filter(court => court && court.current && new Date(court.current.endTime) >= currentTime)
            .map(court => new Date(court.current.endTime).getTime())
            .sort((a, b) => a - b);

          if (courtEndTimes.length === 0 && position === 1) {
            estimatedWait = 0;
          } else if (position <= courtEndTimes.length) {
            estimatedWait = Math.ceil((courtEndTimes[position - 1] - currentTime.getTime()) / 60000);
          } else {
            estimatedWait = TennisBusinessLogic.calculateEstimatedWaitTime(
              position,
              data.courts,
              currentTime,
              CONSTANTS.AVG_GAME_TIME_MIN
            );
          }
        }
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
            setCurrentScreen("search");
          }}
          onHome={resetForm}
          dataStore={dataStore}
          dataService={USE_API_BACKEND ? getDataService() : null}
          TENNIS_CONFIG={TENNIS_CONFIG}
          getCourtBlockStatus={getCourtBlockStatus}
        />
      </>
    );
  }

// Welcome screen
if (currentScreen === "welcome") {
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
          checkLocationAndProceed(() => setCurrentScreen("search"));
        }}
        onClearCourtClick={() => {
          checkLocationAndProceed(() => setCurrentScreen("clearCourt"));
        }}
      />
    </>
  );
}

  // Admin screen
  if (currentScreen === "admin") {
    const data = getCourtData();
    const now = new Date();
    const occupiedCourts = data.courts.filter(court => court !== null && court.players && court.players.length > 0 && !court.wasCleared);
    const overtimeCourts = data.courts.filter(court => court && court.players && court.players.length > 0 && !court.wasCleared && new Date(court.endTime) <= currentTime);
    
    // Count only currently blocked courts
    const blockedCourts = data.courts.filter(court => {
      if (!court || !court.blocked || !court.blocked.startTime || !court.blocked.endTime) return false;
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
      
      if (price < 0.50 || price > 50.00) {
        setPriceError('Price must be between $0.50 and $50.00');
        return;
      }
      
      // Save to localStorage
      try {
        const parsed = await dataStore.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY) || {};
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
      blockedDetails: blockedCourts
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
                    setBlockMessage("");
                    setBlockStartTime("");
                    setBlockEndTime("");
                    setBlockingInProgress(false);
                  }}
                  className="bg-yellow-700 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-yellow-800 transition-colors flex-1 sm:flex-initial"
                >
                  Block Courts
                </button>
                <button
                  onClick={async () => {
                    const confirmClear = window.confirm("Clear all courts? This will make all courts immediately available.");
                    if (confirmClear) {
                      const result = await TennisDataService.clearAllCourts();
                      if (result.success) {
                        showAlertMessage("All courts cleared successfully");
                      } else {
                        showAlertMessage(result.error || "Failed to clear courts");
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
                    <label className="block text-white mb-2 text-sm sm:text-base">Select Courts to Block</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
                      {[...Array(CONSTANTS.COURT_COUNT)].map((_, index) => {
                        const courtNum = index + 1;
                        const isSelected = selectedCourtsToBlock.includes(courtNum);
                        
                        return (
                          <button
                            key={courtNum}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCourtsToBlock(selectedCourtsToBlock.filter(c => c !== courtNum));
                              } else {
                                setSelectedCourtsToBlock([...selectedCourtsToBlock, courtNum]);
                              }
                              setBlockingInProgress(false); // Reset when courts change
                            }}
                            className={`py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-yellow-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
                          setSelectedCourtsToBlock([...Array(CONSTANTS.COURT_COUNT)].map((_, i) => i + 1));
                        }
                        setBlockingInProgress(false); // Reset when selection changes
                      }}
                      className="text-yellow-400 text-xs sm:text-sm hover:text-yellow-300"
                    >
                      {selectedCourtsToBlock.length === CONSTANTS.COURT_COUNT ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  
                  {/* Message Selection */}
                  <div className="mb-4">
                    <label className="block text-white mb-2 text-sm sm:text-base">Block Reason</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        onClick={() => {
                          setBlockMessage("WET COURT");
                          setBlockingInProgress(false);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                          blockMessage === "WET COURT" 
                            ? "bg-yellow-600 text-white" 
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        WET COURT
                      </button>
                      <button
                        onClick={() => {
                          setBlockMessage("COURT WORK");
                          setBlockingInProgress(false);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                          blockMessage === "COURT WORK" 
                            ? "bg-yellow-600 text-white" 
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        COURT WORK
                      </button>
                      <button
                        onClick={() => {
                          setBlockMessage("LESSON");
                          setBlockingInProgress(false);
                        }}
                        className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                          blockMessage === "LESSON" 
                            ? "bg-yellow-600 text-white" 
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
                         setBlockStartTime("now");
                         setBlockingInProgress(false);
                       }}
                       className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                         blockStartTime === "now"
                           ? "bg-yellow-600 text-white"
                           : "bg-gray-600 text-white hover:bg-gray-700"
                       }`}
                     >
                       Now
                     </button>
                     <input
                       type="time"
                       value={blockStartTime === "now" ? "" : blockStartTime}
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
                         if (blockStartTime && blockStartTime !== "now") {
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
                         if (blockStartTime && blockStartTime !== "now") {
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
                         if (blockStartTime && blockStartTime !== "now") {
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
                     onClick={() => {
                       if (selectedCourtsToBlock.length === 0) {
                         showAlertMessage("Please select at least one court to block");
                         return;
                       }
                       if (!blockMessage) {
                         showAlertMessage("Please enter a block reason");
                         return;
                       }
                       if (!blockEndTime) {
                         showAlertMessage("Please select an end time");
                         return;
                       }
                       
                       // Set blocking in progress
                       setBlockingInProgress(true);
                       
                       const data = getCourtData();
                       const currentTime = new Date(); // Use different name to avoid scope conflict
                       
                       // Calculate start time
                       let startTime;
                       if (blockStartTime === "now") {
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
                         endTime: endTime.toLocaleString()
                       });
                       

                    // Block selected courts
selectedCourtsToBlock.forEach(courtNum => {
 // Use the new block system
 TennisDataService.addCourtBlock(
   courtNum,
   blockMessage,
   startTime.toISOString(),
   endTime.toISOString()
 );
});

showAlertMessage(`${selectedCourtsToBlock.length} court(s) blocked successfully`);
                       
                      
                       // Don't reset the form, just set blocking state
                       // This allows multiple blocks to be applied
                       // setTimeout removed - keep state immediately
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
                         const result = await TennisDataService.moveCourt(courtToMove, targetCourtNum);
                         
                         if (result.success) {
                           showAlertMessage(`Court ${courtToMove} moved to Court ${targetCourtNum}`);
                         } else {
                           showAlertMessage(result.error || 'Failed to move court');
                         }
                         
                         setCourtToMove(null);
                       }}
                       className={`py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                         isCurrent
                           ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                           : isOccupied
                           ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                           : "bg-blue-600 text-white hover:bg-blue-700"
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
               const isOccupied = court && court.players && court.players.length > 0 && !isCleared;
               const isOvertime = court && court.endTime && !isBlocked && !isCleared && new Date(court.endTime) <= currentTime;
               const timeRemaining = court && court.endTime && !isBlocked && !isCleared
                 ? Math.max(0, Math.floor((new Date(court.endTime).getTime() - currentTime.getTime()) / 60000))
                 : 0;
               
               return (
                 <div
                   key={courtNum}
                   className={`p-3 sm:p-4 rounded-lg border-2 ${
                     isBlocked
                       ? "bg-red-900 border-red-700"
                       : isFutureBlock
                       ? "bg-yellow-900 border-yellow-700"
                       : !court 
                       ? "bg-gray-700 border-gray-600" 
                       : "bg-gray-700 border-gray-600"
                   }`}
                 >
                   <div className="flex justify-between items-start">
                     <div className="flex-1">
                       <div className="flex items-center gap-2 sm:gap-4 mb-2">
                         <h3 className="text-base sm:text-lg font-bold text-white">Court {courtNum}</h3>
                         {isOccupied && !isBlocked && (
                           <span className={`text-xs sm:text-sm font-medium text-gray-400`}>
                             {isOvertime ? 'Overtime' : `${timeRemaining} min remaining`}
                           </span>
                         )}
                       </div>
                       {isBlocked ? (
                         <div>

                          <p className="text-red-400 font-medium text-sm sm:text-base">
  🚫 {blockStatusResult ? blockStatusResult.reason : "BLOCKED"}
</p>

<p className="text-gray-400 text-xs sm:text-sm">
  Until {new Date(blockStatusResult.endTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
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
        hour: "2-digit",
        minute: "2-digit"
      })} - {new Date(blockStatusResult.endTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}
    </p>
  </div>


                       ) : isOccupied ? (
                         <div>
                           <div className="flex flex-col">
                             {court.players.map((player, idx) => (
                               <span key={idx} className="text-gray-300 text-xs sm:text-sm">
                                 {player.name.split(' ').pop()}
                               </span>
                             ))}
                           </div>

                         </div>
                       ) : isCleared ? (
                         <p className="text-gray-500 text-xs sm:text-sm">Available (History Preserved)</p>
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
                             await clearCourt(courtNum);
                             showAlertMessage(`Court ${courtNum} ${isBlocked || isFutureBlock ? 'unblocked' : 'cleared'}`);
                           }}
                           className="bg-orange-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-orange-700 transition-colors"
                         >
                           Clear
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
                 ({data.waitingGroups.length} groups waiting)
               </span>
             </h2>
             {data.waitingGroups.length > 0 && (
               <button
                 onClick={async () => {
                   const confirmClear = window.confirm("Clear the waitlist? This will remove all waiting groups.");
                   if (confirmClear) {
                     const result = await TennisDataService.clearWaitlist();
                     if (result.success) {
                       showAlertMessage("Waitlist cleared successfully");
                     } else {
                       showAlertMessage(result.error || "Failed to clear waitlist");
                     }
                   }
                 }}
                 className="bg-orange-600 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-700 transition-colors w-full sm:w-auto"
               >
                 Clear Waitlist
               </button>
             )}
           </div>
           {data.waitingGroups.length === 0 ? (
             <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No groups in waitlist</p>
           ) : (
             <div className="space-y-3">
               {waitlistMoveFrom !== null && (
                 <div className="mb-4 p-3 sm:p-4 bg-blue-900/30 border-2 border-blue-600 rounded-lg">
                   <p className="text-white font-medium mb-3 text-sm sm:text-base">
                     Moving group from position {waitlistMoveFrom + 1} to:
                   </p>
                   <div className="flex gap-2 flex-wrap mb-3">
                     {data.waitingGroups.map((_, index) => {
                       const position = index + 1;
                       const isCurrentPosition = index === waitlistMoveFrom;
                       
                       return (
                         <button
                           key={position}
                           disabled={isCurrentPosition}
                           onClick={async () => {
                             // Reorder the waitlist
                             const newWaitlist = [...data.waitingGroups];
                             const [movedGroup] = newWaitlist.splice(waitlistMoveFrom, 1);
                             newWaitlist.splice(index, 0, movedGroup);
                             
                             const result = await TennisDataService.saveData({
                               ...data,
                               waitingGroups: newWaitlist
                             });
                             
                             if (result.success) {
                               showAlertMessage(`Group moved to position ${position}`);
                             } else {
                               showAlertMessage(result.error || 'Failed to move group');
                             }
                             
                             setWaitlistMoveFrom(null);
                           }}
                           className={`py-2 px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                             isCurrentPosition
                               ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                               : "bg-blue-600 text-white hover:bg-blue-700"
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
               {data.waitingGroups.map((group, index) => (
                 <div key={index} className="bg-gray-700 p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                   <div className="flex-1">
                     <p className="text-white font-medium text-sm sm:text-base">
                       Position {index + 1}: {group.players.map(p => p.name).join(", ")}
                     </p>
                     <p className="text-gray-400 text-xs sm:text-sm">
                       {group.players.length} player{group.players.length > 1 ? 's' : ''}
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
                         const result = await TennisDataService.removeFromWaitlist(index);
                         
                         if (result.success) {
                           showAlertMessage("Group removed from waitlist");
                         } else {
                           showAlertMessage(result.error || "Failed to remove group");
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
                 <p className="text-xs sm:text-sm text-gray-400">Set the price for tennis ball purchases</p>
               </div>
               
               <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="relative flex-1 sm:flex-initial">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
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
               <div className="mt-2 text-red-400 text-xs sm:text-sm">
                 {priceError}
               </div>
             )}
           </div>
         </div>
         
         {/* Exit Admin */}
         <div className="flex justify-center">
           <button
             onClick={() => {
               setCurrentScreen("welcome");
               setSearchInput("");
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
 if (currentScreen === "search") {
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
       firstWaitingGroup={firstWaitingGroup}
       secondWaitingGroup={secondWaitingGroup}
       firstWaitingGroupData={firstWaitingGroupData}
       secondWaitingGroupData={secondWaitingGroupData}
       data={data}
       showAlert={showAlert}
       alertMessage={alertMessage}
       isMobileView={isMobileView}
       CONSTANTS={CONSTANTS}
     />
   );
 }

 // Group management screen
 if (currentScreen === "group") {
   // Get frequent partners with caching using ref
   let frequentPartners = [];
   if (memberNumber) {
     if (!frequentPartnersCacheRef.current[memberNumber]) {
       frequentPartnersCacheRef.current[memberNumber] = getFrequentPartners(memberNumber);
     }
     frequentPartners = frequentPartnersCacheRef.current[memberNumber] || [];
   }

   return (
     <div className={`w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex ${window.__mobileFlow ? 'items-start pt-[15vh]' : 'items-center justify-center'}`}>
       <ToastHost />
       <AlertDisplay show={showAlert} message={alertMessage} />
       {showTimeoutWarning && (
         <div className="fixed top-4 sm:top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white p-3 sm:p-4 rounded-xl shadow-lg z-50 text-base sm:text-lg animate-pulse">
           Session will expire in 30 seconds due to inactivity
         </div>
       )}
       <div className={`bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-5xl h-full ${window.__mobileFlow ? 'max-h-[70vh]' : 'max-h-[95vh]'} flex flex-col relative overflow-hidden`}>
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
               Welcome{currentGroup[0]?.name ? <>, <strong>{currentGroup[0]?.name}</strong></> : ''}!
             </p>
             <p className="text-base sm:text-lg text-gray-600 mt-1 sm:mt-2">
               {currentGroup.length === 0
                 ? "Search for players to add to your group"
                 : currentGroup.length === 1 
                 ? (isMobileView ? "" : "Add more players to your group or select a court")
                 : `${currentGroup.length} players in your group`}
             </p>
           </div>
         )}
         <div className="flex-1 overflow-y-auto pb-24 sm:pb-32" style={{maxHeight: 'calc(100vh - 280px)'}}>
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
                     <span className="text-xs sm:text-sm text-blue-600 ml-2 sm:ml-3">Rank #{player.ranking}</span>
                   )}
                 </div>
                 <button
                   onClick={() => {
                     setCurrentGroup(currentGroup.filter((_, i) => i !== idx));
                     window.computeEtaPreview();
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
                     const value = e.target.value || "";
                     setSearchInput(value);
                     
                     // Check for admin code (immediate, no debounce)
                     if (value === CONSTANTS.ADMIN_CODE) {
                       setCurrentScreen("admin");
                       setSearchInput("");
                       return;
                     }
                     
                     setShowSuggestions(value.length > 0);
                   }}
                   onFocus={() => {
                     markUserTyping();
                     setShowSuggestions(searchInput.length > 0);
                   }}
                   placeholder={isMobileView ? "Enter Name or Number" : "Enter your name or Member #"}
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
                 <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden" style={{maxHeight: '400px', overflowY: 'auto'}}>
                   {getAutocompleteSuggestions(effectiveSearchInput).length > 0 ? (
                     getAutocompleteSuggestions(effectiveSearchInput).map((suggestion, idx) => (
                       <button
                         key={idx}
                         onClick={async () => {
                           await handleSuggestionClick(suggestion);
                           // For mobile flow, clear search after adding first player
                           if (window.__mobileFlow) {
                             setSearchInput("");
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
                             <div className="text-sm text-gray-600">Member #{suggestion.member.id}</div>
                           )}
                         </div>
                         {suggestion.type === 'member' && suggestion.member.ranking && (
                           <div className="text-sm text-blue-600 font-medium">Rank #{suggestion.member.ranking}</div>
                         )}
                       </button>
                     ))
                   ) : (
                     <div className="p-4 text-center text-gray-500">
                       {searchInput.length < 2 ? "Keep typing..." : "No members found"}
                     </div>
                   )}
                 </div>
               )}
             </div>
           ) : currentGroup.length < CONSTANTS.MAX_PLAYERS && (
  <div className="flex gap-2 sm:gap-3 mb-3">
    <button
      onClick={() => {
        if (showGuestForm) {
          // If guest form is showing, close it and reset
          setShowGuestForm(false);
          setGuestName("");
          setGuestSponsor("");
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
          setGuestName("");
          setGuestSponsor("");
          setShowGuestNameError(false);
          setShowSponsorError(false);
          setShowAddPlayer(false);
        } else {
          // Open guest form
          setShowGuestForm(true);
          setShowAddPlayer(true);
          setShowAddPlayerSuggestions(false);
          setAddPlayerSearch("");
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
)}


           {showAddPlayer && !showGuestForm && (
             <div className="mb-4 relative">
               <div className="relative">
                 <input
                   type="text"
                   value={addPlayerSearch}
                   
                   onChange={(e) => {
  markUserTyping();
  setAddPlayerSearch(e.target.value || "");
  setShowAddPlayerSuggestions((e.target.value || "").length > 0);
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
                 <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                   {getAutocompleteSuggestions(effectiveAddPlayerSearch).length > 0 ? (
                     getAutocompleteSuggestions(effectiveAddPlayerSearch).map((suggestion, idx) => (
                       <button
                         key={idx}
                         onClick={async () => {
                           // Validate suggestion
                           if (!suggestion || !suggestion.member || !suggestion.member.id) {
                             showAlertMessage("Invalid player selection. Please try again.");
                             return;
                           }
                           
                           // Enrich member - for API mode, use the API data directly
                           let enrichedMember;
                           if (USE_API_BACKEND) {
                             enrichedMember = {
                               id: suggestion.member.id,
                               name: suggestion.member.name,
                               memberNumber: suggestion.memberNumber,
                               accountId: suggestion.member.accountId,
                               memberId: suggestion.member.id,
                             };
                           } else {
                             const R = window.Tennis?.Domain?.roster;
                             enrichedMember = R?.enrichPlayersWithIds ? R.enrichPlayersWithIds([suggestion.member], memberRoster)[0] : suggestion.member;
                           }
                           
                           // Early duplicate guard
                           if (!guardAddPlayerEarly(enrichedMember)) {
                             setAddPlayerSearch("");
                             setShowAddPlayer(false);
                             setShowAddPlayerSuggestions(false);
                             return;
                           }
                           
                           // Check for duplicate in current group
                           if (!guardAgainstGroupDuplicate(enrichedMember, currentGroup)) {
                             Tennis.UI.toast(`${enrichedMember.name} is already in this group`);
                             setAddPlayerSearch("");
                             setShowAddPlayer(false);
                             setShowAddPlayerSuggestions(false);
                             return;
                           }
                           
                           // Check if player is already playing or on waitlist
                           if (!guardAddPlayerEarly(enrichedMember)) {
                             setAddPlayerSearch("");
                             setShowAddPlayer(false);
                             setShowAddPlayerSuggestions(false);
                             return; // Toast message already shown by guardAddPlayerEarly
                           }
                           
                           const playerStatus = isPlayerAlreadyPlaying(suggestion.member.id);
                           
                           if (playerStatus.isPlaying && playerStatus.location === 'waiting' && playerStatus.position === 1) {
                             const data = getCourtData();
                             const availableCourts = getAvailableCourts(false);
                             
                             if (availableCourts.length > 0) {
                               const firstWaitingGroup = data.waitingGroups[0];
                               setCurrentGroup(firstWaitingGroup.players.map(player => ({
                                 ...player,
                                 memberNumber: findMemberNumber(player.id)
                               })));
                               
                               setHasWaitlistPriority(true);
                               
                               data.waitingGroups.shift();
                               saveCourtData(data);
                               
                               setAddPlayerSearch("");
                               setShowAddPlayer(false);
                               setShowAddPlayerSuggestions(false);
                               return;
                             }
                           }
                           
                           if (!playerStatus.isPlaying) {
                             // Validate we're not exceeding max players
                             if (currentGroup.length >= CONSTANTS.MAX_PLAYERS) {
                               showAlertMessage(`Group is full (max ${CONSTANTS.MAX_PLAYERS} players)`);
                               setAddPlayerSearch("");
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
                             setAddPlayerSearch("");
                             setShowAddPlayer(false);
                             setShowAddPlayerSuggestions(false);
                           } else {
                             let message = "";
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
                         <div className="font-medium text-base sm:text-lg">{suggestion.member.name}</div>
                         <div className="text-xs sm:text-sm text-gray-600">Member #{suggestion.memberNumber}</div>
                       </button>
                     ))
                   ) : addPlayerSearch.length >= 2 ? (
                     <button
                       onClick={() => {
                         setGuestName(addPlayerSearch);
                         setShowGuestForm(true);
                         setShowAddPlayerSuggestions(false);
                         setAddPlayerSearch("");
                         // Set default sponsor if only one member in group
                         if (currentGroup.length === 1 && !currentGroup[0].isGuest) {
                           setGuestSponsor(currentGroup[0].memberNumber);
                         }
                       }}
                       className="w-full p-2.5 sm:p-3 text-left hover:bg-blue-50 transition-colors block"
                     >
                       <div className="font-medium text-base sm:text-lg text-blue-600">Add "{addPlayerSearch}" as guest?</div>
                       <div className="text-xs sm:text-sm text-gray-600">No member found with this name</div>
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
               {currentGroup.filter(p => !p.isGuest).length > 1 && (
                 <div className="mb-2 sm:mb-3">
                   <label className={`block text-xs sm:text-sm font-medium mb-1 ${
                     showSponsorError ? 'text-red-500' : 'text-gray-700'
                   }`}>
                     {showSponsorError 
                       ? "Please choose your guest's sponsoring member" 
                       : "Sponsoring Member"}
                   </label>
                   <div className="flex flex-wrap gap-2">
                     {currentGroup.filter(p => !p.isGuest).map((member) => (
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
                         {member.memberNumber === memberNumber ? "My Guest" : member.name}
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
                     if (currentGroup.filter(p => !p.isGuest).length > 1 && !guestSponsor) {
                       setShowSponsorError(true);
                       return;
                     }

                     // Early duplicate guard for guest
                     if (!guardAddPlayerEarly(guestName.trim())) {
                       setShowGuestForm(false);
                       setShowAddPlayer(false);
                       setGuestName("");
                       setGuestSponsor("");
                       return;
                     }
                     
                     // Check for duplicate in current group
                     if (!guardAgainstGroupDuplicate(guestName.trim(), currentGroup)) {
                       Tennis.UI.toast(`${guestName.trim()} is already in this group`);
                       setShowGuestForm(false);
                       setShowAddPlayer(false);
                       setGuestName("");
                       setGuestSponsor("");
                       return;
                     }

                     // Add guest to group
                     const guestId = -guestCounter;
                     setGuestCounter(guestCounter + 1);

                     const sponsorMember = guestSponsor || 
                       (currentGroup.filter(p => !p.isGuest)[0]?.memberNumber || memberNumber);

                     // Find the sponsor's details
                     const sponsorPlayer = currentGroup.find(p => p.memberNumber === sponsorMember) || 
                       (memberDatabase[sponsorMember]?.familyMembers[0]);

                     setCurrentGroup([...currentGroup, {
                       name: guestName.trim(),
                       memberNumber: "GUEST",
                       id: guestId,
                       phone: '',
                       ranking: null,
                       winRate: 0.5,
                       isGuest: true,
                       sponsor: sponsorMember
                     }]);

                     // Track guest charge
                     const guestCharge = {
                       id: Date.now(),
                       timestamp: new Date().toISOString(),
                       guestName: guestName.trim(),
                       sponsorName: sponsorPlayer?.name || 'Unknown',
                       sponsorNumber: sponsorMember,
                       amount: 15.00
                     };

                     console.log('🎾 Creating guest charge:', guestCharge);
                     
                     try {
                       // Get existing charges from localStorage
                       const existingChargesFromStorage = localStorage.getItem(TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY);
                       const existingCharges = existingChargesFromStorage ? JSON.parse(existingChargesFromStorage) : [];
                       console.log('📋 Existing charges before save:', existingCharges.length);
                       
                       // Add new charge
                       existingCharges.push(guestCharge);
                       console.log('📋 Charges after adding new one:', existingCharges.length);
                       
                       // Save to localStorage
                       localStorage.setItem(TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY, JSON.stringify(existingCharges));
                       console.log('💾 Guest charge saved to localStorage');
                       
                       // Dispatch event for real-time updates
                       (function deferUpdateAfterSuccess(){
                         const isOnSuccess = (window.__regScreen === 'success');
                         const DISPATCH_DELAY_MS = 1500; // small delay so Success screen is stable

                         const doDispatch = () => {
                           window.dispatchEvent(new CustomEvent('tennisDataUpdate', { detail: { source: 'guest-charge' } }));
                           console.log('📡 Dispatched update event (source=guest-charge)');
                         };

                         if (isOnSuccess) {
                           setTimeout(doDispatch, DISPATCH_DELAY_MS);
                           console.log('[SuccessHold-lite] Deferred tennisDataUpdate by', DISPATCH_DELAY_MS, 'ms');
                         } else {
                           doDispatch();
                         }
                       })();
                       
                     } catch (error) {
                       console.error('❌ Error saving guest charge:', error);
                     }

                     // Reset form
                     setGuestName("");
                     setGuestSponsor("");
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
                     setGuestName("");
                     setGuestSponsor("");
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
           {memberNumber && frequentPartners && frequentPartners.length > 0 && currentGroup.length < CONSTANTS.MAX_PLAYERS && (
             <div className="p-3 sm:p-4 bg-yellow-50 rounded-xl">
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                 {frequentPartners.slice(0, CONSTANTS.MAX_FREQUENT_PARTNERS).map((partner, idx) => {
                   const names = partner.player.name.split(' ');
                   const displayName = names.join(' ').length > 15 
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
         <div className={`absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex ${isMobileView ? 'justify-between' : 'justify-between gap-2'} items-end bottom-nav-buttons`}>
         <button
    onClick={() => {
      if (window.__mobileFlow) {
        // Check if we're in Clear Court workflow - handle navigation properly
        if (currentScreen === "clearCourt") {
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
        setMemberNumber("");
        setCurrentScreen("search");
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
        // When using API backend, use React state; otherwise use localStorage
        let waitingGroups;
        if (USE_API_BACKEND) {
          waitingGroups = data?.waitingGroups || [];
        } else {
          const storageData = Tennis.Storage.readDataSafe();
          waitingGroups = storageData?.waitingGroups || [];
        }
        const hasWaitlist = waitingGroups.length > 0;
        
        // Check if current group is in the allowed positions (1st or 2nd when 2+ courts)
        let groupWaitlistPosition = 0;
        for (let i = 0; i < waitingGroups.length; i++) {
          if (sameGroup(waitingGroups[i]?.players || [], currentGroup)) {
            groupWaitlistPosition = i + 1; // 1-based position
            break;
          }
        }
        
        // Calculate available courts for this group
        // When using API backend, use the availableCourts state (already set from API data)
        // When using localStorage, use getAvailableCourts() function
        let courtsToCheck;
        if (USE_API_BACKEND) {
          // Use state variable that was set from API data in loadData()
          courtsToCheck = availableCourts;
        } else {
          // For new groups not on waitlist: use standard selectable (includes overtime)
          // For waitlist groups: use appropriate logic based on position
          courtsToCheck = groupWaitlistPosition === 0
            ? getAvailableCourts(false)  // New group - includes overtime courts
            : getAvailableCourts(true);  // Waitlist group - free courts only
        }

        // Check if there are actually any courts available to select
        const hasAvailableCourts = courtsToCheck && courtsToCheck.length > 0;
        const availableCourtCount = courtsToCheck?.length || 0;
        
        // Show "Select a Court" if:
        // 1. No waitlist and courts available OR
        // 2. Group is position 1 and courts available OR
        // 3. Group is position 2 and 2+ courts available
        const showSelectCourt = hasAvailableCourts && (
          !hasWaitlist || 
          groupWaitlistPosition === 1 ||
          (groupWaitlistPosition === 2 && availableCourtCount >= 2)
        );
        
        console.log("🎯 GROUP SCREEN BUTTON DEBUG:");
        console.log("  - USE_API_BACKEND:", USE_API_BACKEND);
        console.log("  - waitingGroups.length:", waitingGroups.length);
        console.log("  - hasWaitlist:", hasWaitlist);
        console.log("  - groupWaitlistPosition:", groupWaitlistPosition);
        console.log("  - hasAvailableCourts:", hasAvailableCourts);
        console.log("  - courtsToCheck:", courtsToCheck);
        console.log("  - availableCourtCount:", availableCourtCount);
        console.log("  - showSelectCourt:", showSelectCourt);
        console.log('🎾 Selectable courts details:', courtsToCheck?.map(c => ({
          number: c.number,
          isUnoccupied: c.isUnoccupied,
          isOvertime: c.isOvertime,
          timeRemaining: c.timeRemaining,
          status: c.status,
          scheduledEndAt: c.session?.scheduledEndAt
        })));
        
        return showSelectCourt;
      })() ? (
        <button
          onClick={() => {
            // Mobile: Skip court selection if we have a preselected court
            if (window.__mobileFlow && window.__preselectedCourt) {
              assignCourtToGroup(window.__preselectedCourt);
            } else {
              setCurrentScreen("court");
            }
          }}
          className={`${isMobileView ? 'px-6' : ''} bg-blue-500 text-white py-2 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl hover:bg-blue-600 transition-colors`}
        >
          {isMobileView ? (window.__mobileFlow && window.__preselectedCourt ? `Take Court ${window.__preselectedCourt}` : 'Continue') : (window.__mobileFlow && window.__preselectedCourt ? `Register for Court ${window.__preselectedCourt}` : 'Select a Court')}
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
              setTimeout(() => {
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
  <div id="etaPreview"
       aria-live="polite"
       style={{marginTop: '8px', fontSize: '0.95rem', opacity: '0.9'}}>
  </div>
)}


       </div>
     </div>
   );
 }

 // Court selection screen
 if (currentScreen === "court") {
   // When a group has already been assigned a court, treat it like changing courts
   const isSelectingDifferentCourt = isChangingCourt || hasAssignedCourt;

   // Get court data - use React state for API backend, localStorage for legacy
   const Av = Tennis.Domain.availability;
   const S = Tennis.Storage;
   const reactData = getCourtData();

   // For API backend, use React state which has the API data
   // For legacy, read fresh from localStorage
   const freshData = USE_API_BACKEND ? reactData : S.readDataSafe();
   const blocks = USE_API_BACKEND ? [] : (S.readJSON(S.STORAGE.BLOCKS) || []);
   const wetSet = new Set();
   const now = new Date();

   // For API backend, compute selectable from the transformed court data
   // Uses new availability flags: isUnoccupied, isOvertime, isActive, isBlocked
   let selectable = [];
   if (USE_API_BACKEND) {
     const courts = freshData.courts || [];
     // Compute court categories using new availability flags
     const unoccupiedCourts = courts.filter(c => c.isUnoccupied);
     const overtimeCourts = courts.filter(c => c.isOvertime);

     // Selectable: unoccupied first, then overtime if no unoccupied
     if (unoccupiedCourts.length > 0) {
       selectable = unoccupiedCourts.map(c => c.number);
     } else if (overtimeCourts.length > 0) {
       selectable = overtimeCourts.map(c => c.number);
     }

     console.log('[COURT SCREEN] API backend - court categories:', {
       unoccupied: unoccupiedCourts.map(c => c.number),
       overtime: overtimeCourts.map(c => c.number),
       selectable
     });
   } else {
     selectable = [...Av.getSelectableCourtsStrict({ data: freshData, now, blocks, wetSet })];
   }

   // Use React state for other operations
   const data = reactData;

   const hasWaiters = (data.waitingGroups?.length || 0) > 0;

   // If user has waitlist priority, they should ONLY see FREE courts (not overtime)
   // Otherwise, only show courts when no one is waiting
   let availableCourts = [];
   if (hasWaitlistPriority) {
     if (USE_API_BACKEND) {
       // For waitlist priority users, prefer unoccupied courts, fallback to overtime
       const courts = freshData.courts || [];
       const unoccupiedCourts = courts.filter(c => c.isUnoccupied).map(c => c.number);
       const overtimeCourts = courts.filter(c => c.isOvertime).map(c => c.number);

       if (unoccupiedCourts.length > 0) {
         availableCourts = unoccupiedCourts;
         console.log('[COURT SCREEN] API - Waitlist priority - UNOCCUPIED courts:', availableCourts);
       } else if (overtimeCourts.length > 0) {
         availableCourts = overtimeCourts;
         console.log('[COURT SCREEN] API - Waitlist priority - OVERTIME courts:', availableCourts);
       }
     } else {
       // Legacy localStorage path
       const info = Av?.getFreeCourtsInfo ? Av.getFreeCourtsInfo({ data: freshData, now: new Date(), blocks, wetSet: new Set() }) : { free: [], overtime: [] };
       if (info.free && info.free.length > 0) {
         availableCourts = info.free;
         console.log('[COURT SCREEN] Waitlist priority - FREE courts available:', availableCourts);
       } else if (info.overtime && info.overtime.length > 0) {
         availableCourts = info.overtime;
         console.log('[COURT SCREEN] Waitlist priority - Only OVERTIME courts available:', availableCourts);
       }
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
     availableCourtsLength: availableCourts.length
   });
   
   
   const hasWaitingGroups = data.waitingGroups.length > 0;
   const isFirstInWaitlist = currentGroup.some(player => isPlayerNextInWaitlist(player.id));
   
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
     const isTrulyFree = !court || 
            court.wasCleared || 
            (court.current === null && court.history) || 
            ((!court.players || court.players.length === 0) && 
             (!court.current || !court.current.players || court.current.players.length === 0));
             
     // Additional check: must also be in the selectable courts list
     const isSelectable = availableCourts.includes(courtNumber);
     
     return isTrulyFree && isSelectable;
   });
   const showingOvertimeCourts = availableCourts.length > 0 && !hasUnoccupiedCourts && !isSelectingDifferentCourt;
   
   
   return (
     <>
       <ToastHost />
       <AlertDisplay show={showAlert} message={alertMessage} />
       <CourtSelectionScreen
         availableCourts={availableCourts}
         showingOvertimeCourts={showingOvertimeCourts}
         hasWaitingGroups={hasWaitingGroups}
         waitingGroupsCount={data.waitingGroups.length}
         currentGroup={currentGroup}
         isMobileView={isMobileView}
         getUpcomingBlockWarning={getUpcomingBlockWarning}
         onCourtSelect={async (courtNum) => {
           const DEBUG_SELECT = false;
           if (DEBUG_SELECT) console.log('[SelectCourt] clicked', { courtNumber: courtNum });
           
           // If changing courts, clear the original court first but skip adding to recentlyCleared
           if (isChangingCourt && justAssignedCourt) {
             await clearCourt(justAssignedCourt, 'Bumped');
           }
           await assignCourtToGroup(courtNum);
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
             setTimeout(() => {
               resetForm();
             }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
           }
         }}
         onAssignNext={async () => {
           console.log('[ASSIGN NEXT] Button clicked');
           const TD = window.TennisDataService || Tennis?.DataService;
           console.log('[ASSIGN NEXT] TD service:', !!TD);
           console.log('[ASSIGN NEXT] assignNextFromWaitlist method:', !!TD?.assignNextFromWaitlist);
           if (!TD?.assignNextFromWaitlist) {
             console.error('[ASSIGN NEXT] assignNextFromWaitlist method not found');
             return;
           }
           const res = await TD.assignNextFromWaitlist();
           console.log('[ASSIGN NEXT] Result:', res);
           if (!res?.success) {
             Tennis?.UI?.toast?.(res?.error || 'Failed assigning next', { type: 'error' });
             showAlertMessage(res?.error || 'Failed assigning next');
           } else {
             Tennis?.UI?.toast?.(`Assigned next to Court ${res.court}`, { type: 'success' });
             showAlertMessage(`Assigned next to Court ${res.court}`);
           }
         }}
         onGoBack={() => {
           setCurrentScreen("group");
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
 if (currentScreen === "clearCourt") {
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
