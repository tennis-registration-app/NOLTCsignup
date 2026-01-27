// CourtBoard - Vite-bundled React Entry Point
// Converted from inline Babel to ES module JSX
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// Import shared utilities from @lib
import {
  getUpcomingBlockWarningFromBlocks as _sharedGetUpcomingBlockWarningFromBlocks,
  TENNIS_CONFIG as _sharedTennisConfig,
} from '@lib';

// TennisBackend for real-time board subscription
import { createBackend } from '../registration/backend/index.js';
const backend = createBackend();

// Court availability helper - single source of truth for free/playable courts
import { countPlayableCourts, listPlayableCourts } from '../shared/courts/courtAvailability.js';

// Access shared utils from window for backward compatibility
// (U now unused but kept for backward compatibility comment)

// Module references assigned in App() useEffect - only A and W are used
// eslint-disable-next-line no-unused-vars -- A and W are assigned in useEffect and used throughout; ESLint can't track dynamic assignment
let _Config, _Storage, _Events, A, W, _T, _DataStore, _Av, _Tm, _TimeFmt;

// ---- Read-only guard (prevent accidental writes in this view) ----
const readOnlyWrite = (...args) => {
  console.warn('Read-only view: write ignored', args);
  return false;
};

// Status → Tailwind classes (no color classes outside this map)
function classForStatus(statusObj) {
  const s = typeof statusObj === 'string' ? statusObj : statusObj?.status;
  const selectable = statusObj?.selectable;

  switch (s) {
    case 'occupied':
      return 'bg-gradient-to-b from-blue-300 to-blue-400 border-blue-300';
    case 'overtime':
      return selectable
        ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-600'
        : 'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-500';
    case 'overtime-available':
      return 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-600';
    case 'overtimeAvailable':
      return 'bg-gradient-to-b from-green-600 to-green-700 border-green-600';
    case 'wet':
      return 'bg-gradient-to-b from-gray-300 to-gray-400 border-gray-300';
    case 'blocked':
      return 'bg-gradient-to-b from-slate-300 to-slate-400 border-slate-400';
    case 'free':
    default:
      return 'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-400';
  }
}

// Unified status source for the board UI
// ---- Debounce helper (no UI change) ----
const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

// ---- Helpers for domain-based tile text ----
function namesFor(courtObj) {
  if (Array.isArray(courtObj?.session?.group?.players)) {
    return courtObj.session.group.players
      .map((p) => p?.name)
      .filter(Boolean)
      .join(', ');
  }
  const last =
    Array.isArray(courtObj?.history) && courtObj.history.length
      ? courtObj.history[courtObj.history.length - 1]
      : null;
  if (Array.isArray(last?.players)) {
    return last.players
      .map((p) => p?.name)
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

function formatTime(dt) {
  if (!dt) return null;
  const d = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(+d)) return null;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function computeClock(status, courtObj, now, checkStatusMinutes = 150) {
  // Helper to compute "+X min over" label
  const getOvertimeLabel = (endTime) => {
    if (!endTime) return 'Overtime';
    const minutesOver = Math.round((now - endTime) / 60000);
    return minutesOver > 0 ? `+${minutesOver} min over` : 'Overtime';
  };

  if (status === 'occupied') {
    const end = courtObj?.session?.scheduledEndAt
      ? new Date(courtObj.session.scheduledEndAt)
      : null;
    if (end && end > now) {
      const mins = Math.max(0, Math.ceil((end - now) / 60000));
      return {
        primary: `${mins} min`,
        secondary: `Until ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      };
    }
    return { primary: getOvertimeLabel(end), secondary: '' };
  }
  if (status === 'overtime') {
    const end = courtObj?.session?.scheduledEndAt
      ? new Date(courtObj.session.scheduledEndAt)
      : null;
    const start = courtObj?.session?.startedAt ? new Date(courtObj.session.startedAt) : null;
    if (start) {
      const minutesPlaying = Math.floor((now - start) / 60000);
      if (checkStatusMinutes > 0 && minutesPlaying >= checkStatusMinutes) {
        return {
          primary: getOvertimeLabel(end),
          secondary: 'check status',
          secondaryColor: 'yellow',
        };
      }
    }
    return { primary: getOvertimeLabel(end), secondary: '' };
  }
  if (status === 'free') return { primary: 'Available', secondary: '' };
  if (status === 'wet') return { primary: '🌧️\nWET COURT', secondary: '' };
  if (status === 'blocked') {
    const s = courtObj || {};
    const rawLabel = s.blockedLabel || s.reason || 'Blocked';

    let label = rawLabel.toUpperCase();
    if (label.includes('COURT WORK') || label.includes('MAINTENANCE')) {
      label = 'COURT WORK';
    } else if (label.includes('LESSON')) {
      label = 'LESSON';
    } else if (label.includes('CLINIC')) {
      label = 'CLINIC';
    } else if (label.includes('LEAGUE')) {
      label = 'LEAGUE';
    }

    const until = s.blockedEnd ? s.blockedEnd : null;
    let secondary = '';
    if (until) {
      try {
        const endTime = new Date(until);
        if (!isNaN(endTime)) {
          secondary = `Until ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        }
      } catch (_e) {
        // ignore invalid date
      }
    }
    return { primary: label, secondary };
  }
  return { primary: '', secondary: '' };
}

// Timer registry for cleanup
const _timers = [];
const clearAllTimers = () => {
  _timers.forEach(({ id, type }) => {
    try {
      if (type === 'interval') clearInterval(id);
      else clearTimeout(id);
    } catch {} /* eslint-disable-line no-empty */
  });
  _timers.length = 0;
};

// Global cleanup on page unload
window.addEventListener('beforeunload', () => {
  try {
    clearAllTimers();
  } catch {} /* eslint-disable-line no-empty */
});

// ---- TENNIS_CONFIG: Override POLL_INTERVAL_MS for CourtBoard (faster updates) ----
const TENNIS_CONFIG = {
  ..._sharedTennisConfig,
  TIMING: {
    ..._sharedTennisConfig?.TIMING,
    POLL_INTERVAL_MS: 2000,
  },
};

// Icon components (only used ones)
const Users = ({ size = 34, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    👥
  </span>
);
const TennisBall = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🎾
  </span>
);
const Calendar = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🏛️
  </span>
);
const AlertCircle = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔔
  </span>
);

// Use imported function
const getUpcomingBlockWarningFromBlocks = _sharedGetUpcomingBlockWarningFromBlocks;

// DataStore simulation for demo (unused but kept for reference)
const _dataStore = {
  async get(key) {
    const startTime = performance.now();
    if (Math.random() > 0.2) {
      const cached = localStorage.getItem(key);
      let data = null;
      if (cached) {
        try {
          data = JSON.parse(cached);
        } catch {
          return null;
        }
      }
      this.updateMetrics(performance.now() - startTime, true);
      return data;
    } else {
      const data = localStorage.getItem(key);
      let result = null;
      if (data) {
        try {
          result = JSON.parse(data);
        } catch {
          return null;
        }
      }
      this.updateMetrics(performance.now() - startTime, false);
      return result;
    }
  },

  async set(key, data) {
    const startTime = performance.now();
    readOnlyWrite(key, data);
    this.updateMetrics(performance.now() - startTime, false);
    this.emit('data:changed', { key, data });
  },

  subscribers: new Map(),

  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);
    return () => {
      const subs = this.subscribers.get(eventType);
      if (subs) {
        subs.delete(callback);
      }
    };
  },

  emit(eventType, data) {
    const subscribers = this.subscribers.get(eventType);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback({ type: eventType, data });
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  },

  metrics: {
    cacheHits: 0,
    totalOperations: 0,
    totalResponseTime: 0,
    operationsSaved: 0,
  },

  updateMetrics(responseTime, wasCacheHit) {
    this.metrics.totalOperations++;
    this.metrics.totalResponseTime += responseTime;
    if (wasCacheHit) {
      this.metrics.cacheHits++;
    }
    this.metrics.operationsSaved = Math.floor(this.metrics.totalOperations * 0.85);
  },

  getPerformanceMetrics() {
    const total = this.metrics.totalOperations;
    return {
      cacheHitRate: total > 0 ? (this.metrics.cacheHits / total) * 100 : 0,
      averageResponseTime: total > 0 ? this.metrics.totalResponseTime / total : 0,
      operationsPerformed: total,
      operationsSaved: this.metrics.operationsSaved,
      pollingLevel: 'CRITICAL',
      batchEfficiency: Math.min(85, total > 10 ? (this.metrics.operationsSaved / total) * 100 : 0),
    };
  },
};

// Due to the size constraint, importing full component implementations
// For now, create a placeholder that shows the app is working
// The full component code will be added in subsequent files

// ToastHost Component
function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const onToast = (e) => {
      const t = { id: Date.now() + Math.random(), duration: 3000, type: 'warning', ...e.detail };
      setToasts((xs) => [...xs, t]);
      setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== t.id)), t.duration);
    };
    window.addEventListener('UI_TOAST', onToast);
    return () => window.removeEventListener('UI_TOAST', onToast);
  }, []);

  return (
    <div className="fixed top-4 inset-x-0 z-[1000] flex justify-center pointer-events-none">
      <div className="w-full max-w-lg px-4 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg ring-1 ${
              t.type === 'error'
                ? 'bg-red-50 ring-red-200 text-red-800'
                : t.type === 'success'
                  ? 'bg-green-50 ring-green-200 text-green-800'
                  : 'bg-yellow-50 ring-yellow-200 text-yellow-800'
            }`}
          >
            {t.msg || t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading placeholder while Tennis modules initialize
function LoadingPlaceholder() {
  return (
    <div className="h-screen min-h-screen bg-gradient-to-br from-slate-700 to-slate-600 p-4 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🎾</div>
        <div className="text-xl">Loading Court Display...</div>
        <div className="text-sm text-gray-400 mt-2">Waiting for Tennis modules</div>
      </div>
    </div>
  );
}

// Main App wrapper that waits for Tennis modules
function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if Tennis modules are loaded
    const checkReady = () => {
      if (window.Tennis?.Storage && window.Tennis?.Domain?.availability) {
        // Initialize module references (only A and W are used)
        _Config = window.Tennis.Config;
        _Storage = window.Tennis.Storage;
        _Events = window.Tennis.Events;
        A = window.Tennis.Domain.availability || window.Tennis.Domain.Availability;
        W = window.Tennis.Domain.waitlist || window.Tennis.Domain.Waitlist;
        _T = window.Tennis.Domain.time || window.Tennis.Domain.Time;
        _DataStore = window.Tennis.DataStore;
        _Av = window.Tennis.Domain.availability || window.Tennis.Domain.Availability;
        _Tm = window.Tennis.Domain.time || window.Tennis.Domain.Time;
        _TimeFmt = window.Tennis.Domain.time || window.Tennis.Domain.Time;
        setReady(true);
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    // Poll until ready
    const interval = setInterval(() => {
      if (checkReady()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error('Tennis modules failed to load within timeout');
      setReady(true); // Show UI anyway, will show error state
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (!ready) {
    return <LoadingPlaceholder />;
  }

  return (
    <>
      <ToastHost />
      <TennisCourtDisplay />
    </>
  );
}

// Main Tennis Court Display Component (simplified for initial test)
function TennisCourtDisplay() {
  const isMobileView = window.IS_MOBILE_VIEW || false;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [courts, setCourts] = useState(Array(12).fill(null));
  const [waitlist, setWaitlist] = useState([]);
  const [courtBlocks, setCourtBlocks] = useState([]); // Active blocks only (for availability)
  const [upcomingBlocks, setUpcomingBlocks] = useState([]); // Future blocks today (for display)
  const [checkStatusMinutes, setCheckStatusMinutes] = useState(150); // Default 150, loaded from settings
  const [blockWarningMinutes, setBlockWarningMinutes] = useState(60); // Default 60, loaded from settings

  // Mobile state - initialize from sessionStorage, updated via message from Mobile.html
  const [mobileState, setMobileState] = useState(() => ({
    registeredCourt: sessionStorage.getItem('mobile-registered-court'),
    waitlistEntryId: sessionStorage.getItem('mobile-waitlist-entry-id'),
  }));

  // Listen for state updates from Mobile.html (MobileBridge broadcasts)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'mobile:state-updated') {
        console.log('[Courtboard] Mobile state updated:', event.data.payload);
        setMobileState(event.data.payload);
      } else if (event.data?.type === 'refresh-board') {
        // Triggered after waitlist:joined to check for waitlist-available notice
        console.log('[Courtboard] Refresh board requested');
        // The mobileState update from MobileBridge.broadcastState() will trigger
        // the waitlist-available useEffect, but we can also manually trigger loadData
        if (typeof window.refreshBoard === 'function') {
          window.refreshBoard();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data loading - no longer reads from localStorage
  // All state now comes from API via TennisBackend subscription
  const loadData = useCallback(async () => {
    // No-op: courts, waitlist, and courtBlocks now populate from API only
    // Initial state is empty arrays, TennisBackend subscription fills them
  }, []);

  // DOM event listeners for cross-component updates
  useEffect(() => {
    // Legacy loadData call (now no-op, API subscription handles state)
    loadData();

    const handleUpdate = debounce(() => loadData(), 150);

    window.addEventListener('tennisDataUpdate', handleUpdate, { passive: true });
    window.addEventListener('DATA_UPDATED', handleUpdate, { passive: true });

    // No polling - TennisBackend subscription provides real-time updates

    return () => {
      window.removeEventListener('tennisDataUpdate', handleUpdate);
      window.removeEventListener('DATA_UPDATED', handleUpdate);
    };
  }, [loadData]);

  // TennisBackend real-time subscription (primary data source)
  useEffect(() => {
    console.log('[Courtboard] Setting up TennisBackend subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges((domainBoard) => {
      // Use pure Domain Board directly (legacy adapter removed)
      const board = domainBoard;

      console.log('[Courtboard] Board update received:', {
        serverNow: board.serverNow,
        courts: board.courts?.length,
        waitlist: board.waitlist?.length,
        upcomingBlocks: board.upcomingBlocks?.length,
      });
      console.log('[Courtboard Debug] Raw upcomingBlocks:', board.upcomingBlocks);

      // Debug: log first 2 courts to see raw data
      console.log('[Courtboard Debug] Raw board courts (first 2):', board.courts?.slice(0, 2));

      // Update courts state
      if (board.courts) {
        // Transform API courts to Domain format for Courtboard rendering
        // Domain format: court.session = { group: { players }, scheduledEndAt, startedAt }
        const transformedCourts = Array(12)
          .fill(null)
          .map((_, idx) => {
            const courtNumber = idx + 1;
            const apiCourt = board.courts.find((c) => c && c.number === courtNumber);
            if (!apiCourt) {
              return null; // Empty court
            }
            if (!apiCourt.session && !apiCourt.block) {
              return null; // No session or block
            }

            const players = (
              apiCourt.session?.participants ||
              apiCourt.session?.group?.players ||
              []
            ).map((p) => ({
              name: p.displayName || p.name || 'Unknown',
            }));

            return {
              session: apiCourt.session
                ? {
                    group: { players },
                    scheduledEndAt: apiCourt.session.scheduledEndAt,
                    startedAt: apiCourt.session.startedAt,
                  }
                : null,
            };
          });

        // Debug: log first 2 transformed courts
        console.log(
          '[Courtboard Debug] Transformed courts (first 2):',
          transformedCourts.slice(0, 2)
        );
        setCourts(transformedCourts);

        // Extract active blocks from courts (for availability calculations)
        const activeBlocks = board.courts
          .filter((c) => c && c.block)
          .map((c) => ({
            id: c.block.id,
            courtNumber: c.number,
            reason: c.block.reason || c.block.title || 'Blocked',
            startTime: c.block.startsAt,
            endTime: c.block.endsAt,
            isWetCourt: c.block.reason?.toLowerCase().includes('wet'),
          }));
        setCourtBlocks(activeBlocks);

        // Extract upcoming blocks from API (future blocks for today, display only)
        const futureBlocks = (board.upcomingBlocks || []).map((b) => ({
          id: b.id,
          courtNumber: b.courtNumber,
          reason: b.title || b.reason || 'Blocked',
          startTime: b.startTime,
          endTime: b.endTime,
          isWetCourt: (b.reason || b.title || '').toLowerCase().includes('wet'),
        }));
        setUpcomingBlocks(futureBlocks);
      }

      // Transform already-normalized waitlist from TennisQueries
      // TennisQueries returns { group: { players } } format, we need { names } for rendering
      const normalized = (board.waitlist || []).map((entry) => ({
        id: entry.id,
        position: entry.position,
        groupType: entry.group?.type,
        joinedAt: entry.joinedAt,
        minutesWaiting: entry.minutesWaiting,
        names: (entry.group?.players || []).map((p) => p.displayName || p.name || 'Unknown'),
        players: entry.group?.players || [],
      }));
      console.log('[Courtboard] Transformed waitlist:', normalized);
      setWaitlist(normalized);
    });

    console.log('[Courtboard] TennisBackend subscription active');

    return () => {
      console.log('[Courtboard] Unsubscribing from board updates');
      unsubscribe();
    };
  }, []);

  // Load check_status_minutes from system settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log('[Courtboard] Loading settings, backend.admin:', !!backend.admin);
        const result = await backend.admin?.getSettings?.();
        console.log(
          '[Courtboard] Settings result:',
          result?.ok,
          'check_status_minutes:',
          result?.settings?.check_status_minutes
        );
        if (result?.ok && result.settings?.check_status_minutes) {
          const minutes = parseInt(result.settings.check_status_minutes, 10);
          if (minutes > 0) {
            setCheckStatusMinutes(minutes);
            console.log('[Courtboard] Loaded check_status_minutes:', minutes);
          }
        }
        // Load block_warning_minutes
        if (result?.ok && result.settings?.block_warning_minutes) {
          const blockWarnMin = parseInt(result.settings.block_warning_minutes, 10);
          if (blockWarnMin > 0) {
            setBlockWarningMinutes(blockWarnMin);
            console.log('[Courtboard] Loaded block_warning_minutes:', blockWarnMin);
          }
        }
      } catch (err) {
        console.warn('[Courtboard] Failed to load settings, using default:', err);
      }
    };
    loadSettings();
  }, []);

  /**
   * TWO-ROOT BRIDGE: Sync React state to window for mobile modal access.
   *
   * ARCHITECTURE INVARIANT:
   * - This useEffect is the ONLY WRITER to window.CourtboardState
   * - The mobile modal (second React root in MobileModalSheet) reads via getCourtboardState()
   * - mobile-fallback-bar.js reads via getCourtboardState()
   * - NO OTHER CODE should write to window.CourtboardState
   *
   * This bridge exists because the mobile modal is rendered in a separate React tree
   * and cannot access this component's state directly.
   */
  useEffect(() => {
    const now = new Date().toISOString();
    const freeCount = countPlayableCourts(courts, courtBlocks, now);

    console.log('[CourtboardState] Setting state:', {
      courts: courts?.length,
      courtBlocks: courtBlocks?.length,
      upcomingBlocks: upcomingBlocks?.length,
      waitingGroups: waitlist?.length,
      freeCourts: freeCount,
    });
    window.CourtboardState = {
      courts: courts,
      courtBlocks: courtBlocks,
      upcomingBlocks: upcomingBlocks,
      waitingGroups: waitlist,
      freeCourts: freeCount,
      timestamp: Date.now(),
    };

    // Update mobile button state after state is set
    if (typeof window.updateJoinButtonState === 'function') {
      console.log('[CourtboardState] Calling updateJoinButtonState');
      window.updateJoinButtonState();
    } else {
      console.log('[CourtboardState] updateJoinButtonState not found');
    }
  }, [courts, courtBlocks, upcomingBlocks, waitlist]);

  // Auto-show waitlist-available notice when court is free and THIS mobile user is first in waitlist
  useEffect(() => {
    if (!isMobileView) return;

    const hasWaitlist = waitlist.length > 0;
    if (!hasWaitlist) {
      // No waitlist - close notice if open
      if (window.MobileModal?.currentType === 'waitlist-available') {
        window.MobileModal?.close?.();
      }
      return;
    }

    // Check if THIS mobile user is first in the waitlist
    // Use mobileState (React state) instead of sessionStorage for reactivity
    const mobileWaitlistEntryId = mobileState.waitlistEntryId;
    const firstGroup = waitlist[0];
    const isUserFirstInWaitlist = mobileWaitlistEntryId && firstGroup?.id === mobileWaitlistEntryId;

    // Use shared helper for consistent free court calculation
    const now = new Date().toISOString();
    const freeCourtCount = countPlayableCourts(courts, courtBlocks, now);
    const freeCourtList = listPlayableCourts(courts, courtBlocks, now);

    console.log('[WaitlistNotice] Check:', {
      freeCourts: freeCourtCount,
      freeCourtList: freeCourtList,
      waitlistLength: waitlist?.length,
      isMobileView: isMobileView,
      mobileWaitlistEntryId: mobileWaitlistEntryId,
      firstGroupId: firstGroup?.id,
      isUserFirstInWaitlist: isUserFirstInWaitlist,
      shouldShow: freeCourtCount > 0 && isUserFirstInWaitlist,
      totalCourts: courts?.length,
      courtsWithSession: courts?.filter((c) => c?.session).length,
    });

    if (freeCourtCount > 0 && isUserFirstInWaitlist) {
      // Court available AND this mobile user is first in waitlist - show notice
      window.MobileModal?.open('waitlist-available', { firstGroup });
    } else if (window.MobileModal?.currentType === 'waitlist-available') {
      // Not first, no free courts, or no waitlist - close notice if it's currently showing
      window.MobileModal?.close?.();
    }
  }, [courts, courtBlocks, waitlist, isMobileView, mobileState]);

  window.refreshBoard = loadData;

  // Build status map using courts state from API (no localStorage fallback)
  let statusByCourt = {};
  let selectableByCourt = {};
  let statusObjectByCourt = {};
  // Build data object from React courts state for status computation
  const data = {
    courts: courts,
    waitlist: waitlist.map((g) => ({
      id: g.id,
      players: g.names.map((n) => ({ name: n })),
    })),
  };

  try {
    const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
    if (A) {
      const now = new Date();
      // Use courtBlocks from React state instead of localStorage
      const blocks = courtBlocks || [];

      const wetSet = new Set(
        (blocks || [])
          .filter(
            (b) =>
              b?.isWetCourt &&
              new Date(b.startTime ?? b.start) <= now &&
              now < new Date(b.endTime ?? b.end)
          )
          .map((b) => b.courtNumber)
      );
      const _statuses = A.getCourtStatuses({ data, now, blocks, wetSet }) || [];
      statusByCourt = Object.fromEntries(_statuses.map((s) => [s.courtNumber, s.status]));
      selectableByCourt = Object.fromEntries(_statuses.map((s) => [s.courtNumber, s.selectable]));
      statusObjectByCourt = Object.fromEntries(_statuses.map((s) => [s.courtNumber, s]));
    }
  } catch (e) {
    console.warn('Error building status map:', e);
  }

  const hasWaiting = waitlist.length > 0;

  return (
    <div className="h-screen min-h-screen bg-gradient-to-br from-slate-700 to-slate-600 p-4 text-white flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="w-full flex justify-center">
          <div className="flex items-center relative">
            {hasWaiting && (
              <div className="absolute left-[-140px] lg:left-[-100px] xl:left-[-140px]">
                <svg
                  width="40"
                  height="40"
                  className="lg:w-20 lg:h-20 xl:w-32 xl:h-32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5 20V4" stroke="#D4D4D8" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M5 4L17 7L5 10V4Z" fill="#FB923C" stroke="#EA580C" strokeWidth="1" />
                </svg>
              </div>
            )}
            <div className="text-center">
              <div
                className="time-header font-light text-white mb-1"
                style={{
                  fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div
                className="date-header text-gray-300 -mt-1"
                style={{
                  fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {currentTime.toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 main-layout h-full min-h-0 items-stretch">
        {/* LEFT column wrapper */}
        <div className="left-column courts-section h-full flex flex-col min-h-0" data-left-col>
          <div className="bg-slate-800/50 rounded-xl shadow-2xl p-4 h-full backdrop-blur flex flex-col min-h-0">
            {/* Desktop layout - Top row */}
            <div className="courts-grid mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div key={num} className="flex justify-center">
                  <CourtCard
                    courtNumber={num}
                    currentTime={currentTime}
                    statusByCourt={statusByCourt}
                    selectableByCourt={selectableByCourt}
                    statusObjectByCourt={statusObjectByCourt}
                    data={data}
                    isMobileView={isMobileView}
                    checkStatusMinutes={checkStatusMinutes}
                    upcomingBlocks={upcomingBlocks}
                    blockWarningMinutes={blockWarningMinutes}
                    courts={courts}
                    courtBlocks={courtBlocks}
                  />
                </div>
              ))}
            </div>
            <div className="h-3 bg-gray-400 mb-4 rounded-full flex-shrink-0 divider-line" />

            {/* Bottom section */}
            <div className="bottom-section min-h-0 overflow-auto">
              <WaitingList
                waitlist={waitlist}
                courts={courts}
                currentTime={currentTime}
                courtBlocks={courtBlocks}
                upcomingBlocks={upcomingBlocks}
              />
              <div className="courts-grid-bottom">
                {[12, 11, 10, 9].map((num) => (
                  <div key={num} className="flex justify-center">
                    <CourtCard
                      courtNumber={num}
                      currentTime={currentTime}
                      statusByCourt={statusByCourt}
                      selectableByCourt={selectableByCourt}
                      statusObjectByCourt={statusObjectByCourt}
                      data={data}
                      isMobileView={isMobileView}
                      checkStatusMinutes={checkStatusMinutes}
                      upcomingBlocks={upcomingBlocks}
                      blockWarningMinutes={blockWarningMinutes}
                      courts={courts}
                      courtBlocks={courtBlocks}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile layout */}
            <div className="mobile-layout">
              <div className="mobile-courts-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <CourtCard
                    key={num}
                    courtNumber={num}
                    currentTime={currentTime}
                    statusByCourt={statusByCourt}
                    selectableByCourt={selectableByCourt}
                    statusObjectByCourt={statusObjectByCourt}
                    data={data}
                    isMobileView={isMobileView}
                    checkStatusMinutes={checkStatusMinutes}
                    upcomingBlocks={upcomingBlocks}
                    blockWarningMinutes={blockWarningMinutes}
                    courts={courts}
                    courtBlocks={courtBlocks}
                  />
                ))}
              </div>

              {hasWaiting && (
                <div className="mobile-waiting-section">
                  <WaitingList
                    waitlist={waitlist}
                    courts={courts}
                    currentTime={currentTime}
                    courtBlocks={courtBlocks}
                    upcomingBlocks={upcomingBlocks}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT column wrapper */}
        <div className="right-column flex flex-col h-full min-h-0" data-right-col>
          <NextAvailablePanel
            courts={courts}
            currentTime={currentTime}
            waitlist={waitlist}
            courtBlocks={courtBlocks}
            upcomingBlocks={upcomingBlocks}
          />
        </div>
      </div>
    </div>
  );
}

// CourtCard Component
function CourtCard({
  courtNumber,
  currentTime: _currentTime,
  statusByCourt,
  selectableByCourt,
  statusObjectByCourt,
  data,
  isMobileView,
  checkStatusMinutes = 150,
  upcomingBlocks = [],
  blockWarningMinutes = 60,
  courts = [],
  courtBlocks = [],
}) {
  const status = statusByCourt[courtNumber] || 'free';
  const _selectable = selectableByCourt[courtNumber] || false; // Unused, kept for prop consistency
  const statusObj = statusObjectByCourt?.[courtNumber] || {};
  const cObj = data?.courts?.[courtNumber - 1] || {};

  const now = new Date();
  const {
    primary,
    secondary,
    secondaryColor: _secondaryColor,
  } = computeClock(status, status === 'blocked' ? statusObj : cObj, now, checkStatusMinutes);
  const nm = namesFor(cObj);

  const base =
    'court-card border-4 rounded-xl flex flex-col items-center justify-start p-2 court-transition';
  const courtClass = base + ' ' + classForStatus(statusObj);

  // Mobile name formatting
  function formatMobileNames(input) {
    if (!input) return '';
    const names = Array.isArray(input)
      ? input
      : String(input)
          .split(/,\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
    if (!names.length) return '';

    const SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV']);
    const formatOne = (full) => {
      const tokens = full.replace(/\s+/g, ' ').trim().split(' ');
      if (tokens.length === 1) {
        const t = tokens[0];
        return t.length <= 3 ? t : `${t[0]}. ${t.slice(1)}`;
      }
      let last = tokens[tokens.length - 1];
      let last2 = tokens[tokens.length - 2];
      let lastName, remainder;
      if (SUFFIXES.has(last)) {
        lastName = `${last2} ${last}`;
        remainder = tokens.slice(0, -2);
      } else {
        lastName = last;
        remainder = tokens.slice(0, -1);
      }
      const first = remainder[0] || '';
      const firstInitial = first ? `${first[0]}.` : '';
      return `${firstInitial} ${lastName}`.trim();
    };

    const primaryName = formatOne(names[0]);
    return names.length > 1 ? `${primaryName} +${names.length - 1}` : primaryName;
  }

  // Handler for occupied/overtime court taps (mobile only)
  const handleOccupiedCourtTap = () => {
    // Check overtime directly from session end time (not status, which uses different threshold)
    const isOvertime =
      cObj?.session?.scheduledEndAt && new Date(cObj.session.scheduledEndAt) < new Date();

    if (!isMobileView) return;

    // Check if court is overtime - treat like free court for registration
    if (isOvertime) {
      try {
        // Check if empty playable courts exist - if so, block overtime tap
        const playableCourts = listPlayableCourts(courts, courtBlocks, new Date().toISOString());
        const emptyPlayable = playableCourts.filter((cn) => {
          const c = courts[cn - 1];
          return !c?.session;
        });
        if (emptyPlayable.length > 0) {
          window.Tennis?.UI?.toast?.('Please select an available court', { type: 'warning' });
          return;
        }
        // No empty courts - allow overtime takeover
        window.mobileTapToRegister?.(courtNumber);
        return;
      } catch (e) {
        console.error('[Overtime Tap] Error checking playable courts:', e);
      }
    }

    // Court is truly occupied (not overtime) - handle clear court flow
    const registeredCourt = sessionStorage.getItem('mobile-registered-court');

    if (registeredCourt) {
      // User has a registration - only allow clearing THEIR court
      if (Number(registeredCourt) === courtNumber) {
        window.MobileModal?.open('clear-court-confirm', { courtNumber });
      }
      // Tapping other occupied courts does nothing when registered
    } else {
      // No registration - show players on this court
      window.MobileModal?.open('clear-court-confirm', {
        courtNumber,
        players: nm, // nm already has player names from namesFor(cObj)
      });
    }
  };

  const isOccupiedOrOvertime = status === 'occupied' || status === 'overtime';
  const isClickable = status === 'free' || (isOccupiedOrOvertime && isMobileView);

  return (
    <div
      className={courtClass}
      data-court={courtNumber}
      data-available={status === 'free'}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={
        status === 'free'
          ? () => window.mobileTapToRegister?.(courtNumber)
          : isOccupiedOrOvertime && isMobileView
            ? handleOccupiedCourtTap
            : undefined
      }
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <h3
        className={`court-text-lg font-bold ${status === 'wet' || status === 'blocked' ? 'text-gray-800' : 'text-white'} mb-1`}
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
      >
        Court {courtNumber}
      </h3>
      <div
        className={`court-text-sm w-full ${status === 'wet' || status === 'blocked' ? 'text-gray-800' : 'text-white'} flex flex-col h-full`}
      >
        <div className="flex flex-col h-full w-full">
          {status === 'free' ? (
            <div className="relative flex-1 flex flex-col items-center justify-center w-full">
              {/* Block warning - absolutely positioned at top */}
              {(() => {
                const blockWarning = getUpcomingBlockWarningFromBlocks(
                  courtNumber,
                  blockWarningMinutes,
                  upcomingBlocks
                );
                if (!blockWarning || blockWarning.minutesUntilBlock >= blockWarningMinutes)
                  return null;

                return (
                  <div
                    className="absolute top-0 left-0 right-0 court-text-base font-bold leading-tight text-center"
                    style={{ color: 'yellow' }}
                  >
                    {blockWarning.reason} in {blockWarning.minutesUntilBlock}m
                  </div>
                );
              })()}
              {/* "Available" - centered in full space */}
              <div
                className={`${isMobileView ? 'court-text-base font-medium leading-tight text-sm font-normal' : 'court-text-base font-medium leading-tight'} text-center`}
              >
                {isMobileView ? 'Tap to Select' : primary}
              </div>
            </div>
          ) : status === 'wet' ? (
            <div className="mt-1 court-text-base font-bold leading-tight text-center flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div style={{ fontSize: '2.5em', lineHeight: '1' }}>🌧️</div>
                <div className="mt-1">WET COURT</div>
              </div>
            </div>
          ) : status === 'blocked' ? (
            <>
              <div className="text-center flex-1 flex items-center justify-center mt-1 font-bold leading-tight blocked-court-label">
                {(() => {
                  let blockReason = statusObj.blockedLabel || statusObj.reason || 'Blocked';
                  const upperReason = blockReason.toUpperCase();
                  if (
                    upperReason.includes('SHORT') ||
                    upperReason.includes('COURT WORK') ||
                    upperReason.includes('MAINTENANCE')
                  ) {
                    return 'Court work';
                  }
                  if (upperReason.includes('LESSON')) return 'Lesson';
                  if (upperReason.includes('CLINIC')) return 'Clinic';
                  if (upperReason.includes('LEAGUE')) return 'League';
                  return blockReason.charAt(0).toUpperCase() + blockReason.slice(1).toLowerCase();
                })()}
              </div>
              {statusObj.blockedEnd && !isMobileView && (
                <div className="mt-auto text-sm text-gray-700 opacity-90 text-center">
                  Until {formatTime(statusObj.blockedEnd)}
                </div>
              )}
            </>
          ) : status === 'occupied' || status === 'overtime' ? (
            isMobileView ? (
              <>
                {nm ? (
                  <div
                    className="mt-1 court-text-sm font-medium text-center flex-1 flex items-center justify-center"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <div className="truncate text-sm leading-tight px-1" title={nm}>
                      {formatMobileNames(nm)}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}
                <div className="mt-auto text-sm opacity-90 text-center">{primary}</div>
              </>
            ) : (
              <>
                {/* For occupied: show block warning instead of "X min" if applicable */}
                {status === 'occupied' &&
                  (() => {
                    const blockWarning = getUpcomingBlockWarningFromBlocks(
                      courtNumber,
                      0,
                      upcomingBlocks
                    );
                    if (blockWarning && blockWarning.minutesUntilBlock < blockWarningMinutes) {
                      return (
                        <div
                          className="mt-1 court-text-base font-bold leading-tight text-center"
                          style={{ color: 'yellow' }}
                        >
                          {blockWarning.reason} in {blockWarning.minutesUntilBlock}m
                        </div>
                      );
                    }
                    return (
                      <div className="mt-1 court-text-base font-bold leading-tight text-center">
                        {primary}
                      </div>
                    );
                  })()}
                {/* For overtime: show primary then block warning below */}
                {status === 'overtime' && (
                  <>
                    <div className="mt-1 court-text-base font-bold leading-tight text-center">
                      {primary}
                    </div>
                    {(() => {
                      const blockWarning = getUpcomingBlockWarningFromBlocks(
                        courtNumber,
                        0,
                        upcomingBlocks
                      );
                      if (!blockWarning || blockWarning.minutesUntilBlock >= blockWarningMinutes)
                        return null;
                      return (
                        <div
                          className="mt-1 court-text-base font-bold leading-tight text-center"
                          style={{ color: 'yellow' }}
                        >
                          {blockWarning.reason} in {blockWarning.minutesUntilBlock}m
                        </div>
                      );
                    })()}
                  </>
                )}
                {nm ? (
                  <div
                    className="mt-1 court-text-sm font-medium text-center flex-1 flex items-center justify-center"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {nm}
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}
                {status === 'occupied' && cObj?.session?.scheduledEndAt && (
                  <div className="mt-auto text-sm opacity-90 text-center">
                    Until {formatTime(cObj.session.scheduledEndAt)}
                  </div>
                )}
                {status === 'overtime' && secondary && (
                  <div className="mt-auto text-sm text-center" style={{ color: 'yellow' }}>
                    {secondary}
                  </div>
                )}
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

// WaitingList Component (with proper wait time calculations)
function WaitingList({
  waitlist,
  courts,
  currentTime: _currentTime,
  courtBlocks = [],
  upcomingBlocks = [],
}) {
  const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
  const W = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist;

  // Convert React courts state to the data format expected by availability functions
  // This uses the passed props instead of reading from localStorage
  const courtsToData = (courtsArray) => ({ courts: courtsArray || [] });

  // Calculate estimated wait time using domain functions
  const calculateEstimatedWaitTime = (position) => {
    try {
      if (!A || !W) {
        return position * 15; // Fallback to simple estimate
      }

      const now = new Date();
      const data = courtsToData(courts); // Use React state instead of localStorage
      // Combine active blocks and future blocks for accurate availability calculation
      const blocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];

      // Derive wetSet for current moment
      const wetSet = new Set(
        blocks
          .filter((b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
          .map((b) => b.courtNumber)
      );

      // Get availability info
      const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
      const nextTimes = A.getNextFreeTimes ? A.getNextFreeTimes({ data, now, blocks, wetSet }) : [];

      // Calculate ETA using domain waitlist function
      if (W.estimateWaitForPositions) {
        const avgGame = window.Tennis?.Config?.Timing?.AVG_GAME || 75;
        const etas = W.estimateWaitForPositions({
          positions: [position],
          currentFreeCount: info.free?.length || 0,
          nextFreeTimes: nextTimes,
          avgGameMinutes: avgGame,
        });
        return etas[0] || 0;
      }

      return position * 15; // Fallback
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return position * 15; // Fallback
    }
  };

  // Check if a group can register now (courts are available)
  const canGroupRegisterNow = (idx) => {
    try {
      if (!A) return false;

      const now = new Date();
      const data = courtsToData(courts); // Use React state instead of localStorage
      // Combine active blocks and future blocks for accurate availability calculation
      const blocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];
      const wetSet = new Set(
        blocks
          .filter((b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
          .map((b) => b.courtNumber)
      );

      if (A.getFreeCourtsInfo) {
        const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
        const freeCount = info.free?.length || 0;
        const overtimeCount = info.overtime?.length || 0;
        const availableCount = freeCount > 0 ? freeCount : overtimeCount;

        if (idx === 0) {
          // First group can register if any courts available
          return availableCount > 0;
        } else if (idx === 1) {
          // Second group can register if 2+ courts available
          return availableCount >= 2;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error checking if group can register:', error);
      return false;
    }
  };

  return (
    <div className="bg-slate-700/50 p-4 rounded-xl backdrop-blur h-full overflow-hidden flex flex-col">
      <h3
        className={`font-bold mb-3 flex items-center justify-between ${
          waitlist.length === 0 ? 'text-gray-400' : 'text-yellow-400'
        }`}
      >
        <div className="flex items-center courtboard-text-xl">
          <Users className={`mr-5 ${waitlist.length === 0 ? 'icon-grey' : ''}`} size={24} />
          Waiting
        </div>
        {waitlist.length > 0 && (
          <span className="courtboard-text-sm text-emerald-400 font-normal">Estimated Time</span>
        )}
      </h3>

      {waitlist.length === 0 ? (
        <div className="text-center flex-1 flex flex-col justify-start pt-8">
          <p className="text-gray-400 courtboard-text-base">No groups waiting</p>
          <p className="text-gray-500 courtboard-text-sm mt-4">Register at the iPad station</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto mt-4">
          {waitlist.slice(0, TENNIS_CONFIG.DISPLAY?.MAX_WAITING_DISPLAY || 4).map((group, idx) => {
            // Check if this group can actually register now
            const canRegisterNow = canGroupRegisterNow(idx);

            // Calculate proper estimated wait time
            let estimatedWait = 0;
            if (!canRegisterNow) {
              estimatedWait = calculateEstimatedWaitTime(idx + 1);
            }

            // Show "You're Up!" only if they can actually register now
            const showAlert = canRegisterNow;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-lg courtboard-text-sm ${
                  idx === 0 && estimatedWait < 5
                    ? 'bg-gradient-to-r from-green-600/30 to-green-500/30 border-2 border-green-400'
                    : 'bg-slate-600/50'
                }`}
              >
                <div className="flex items-center flex-1">
                  <span className="courtboard-waiting-number font-bold mr-2 text-green-400">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <span className="courtboard-text-sm font-medium player-name">
                      {(group.names || [])
                        .map((name) => {
                          const names = name.split(' ');
                          return names[names.length - 1];
                        })
                        .join(' / ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showAlert && (
                    <div className="flex items-center text-yellow-400 animate-pulse">
                      <AlertCircle className="mr-1" size={16} />
                      <span className="courtboard-text-xs font-bold">You&apos;re Up!</span>
                    </div>
                  )}
                  {!showAlert && (
                    <div className="courtboard-text-xs text-gray-300 font-medium min-w-[40px] text-right">
                      {estimatedWait} min
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// NextAvailablePanel Component (full implementation from legacy)
function NextAvailablePanel({
  courts,
  currentTime,
  waitlist = [],
  courtBlocks = [],
  upcomingBlocks = [],
}) {
  const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;

  // Convert React courts state to the data format expected by availability functions
  const courtsToData = (courtsArray) => ({ courts: courtsArray || [] });

  // Calculate court availability timeline
  const getCourtAvailabilityTimeline = (waitlist = []) => {
    if (!courts || !Array.isArray(courts)) {
      return [];
    }

    // Registration buffer: 15 minutes before block starts
    const REGISTRATION_BUFFER_MS = 15 * 60 * 1000;

    // Closing time check - default 9pm, exclude courts available within buffer of closing
    const closingHour = 21; // 9pm - could be made configurable
    const closingTime = new Date(currentTime);
    closingTime.setHours(closingHour, 0, 0, 0);
    const closingBufferTime = new Date(closingTime.getTime() - REGISTRATION_BUFFER_MS);

    const courtAvailability = [];
    const overtimeCourts = [];

    // Use courtBlocks from props instead of localStorage
    const blocks = courtBlocks || [];

    // Check if ALL courts are currently wet
    const activeWetBlocks = blocks.filter(
      (block) =>
        block.isWetCourt === true &&
        new Date(block.startTime) <= currentTime &&
        new Date(block.endTime) > currentTime
    );
    const wetCourtNumbers = new Set(activeWetBlocks.map((block) => block.courtNumber));

    // If all courts are wet, return special marker
    const totalCourts = courts.length;
    if (wetCourtNumbers.size === totalCourts && totalCourts > 0) {
      return [{ allCourtsWet: true }];
    }

    // Check each court for availability
    courts.forEach((court, index) => {
      const courtNumber = index + 1;
      let endTime = null;

      // Check for blocks that affect this court's availability
      let blockingUntil = null;

      // First check currently active blocks (including those starting within buffer)
      const activeBlock = blocks.find(
        (block) =>
          block.courtNumber === courtNumber &&
          new Date(block.startTime).getTime() - REGISTRATION_BUFFER_MS <= currentTime.getTime() &&
          new Date(block.endTime) > currentTime
      );

      if (activeBlock) {
        blockingUntil = activeBlock.endTime;
      } else if (court) {
        // Court has players - check for overtime or regular game
        if (court.session && court.session.scheduledEndAt) {
          endTime = court.session.scheduledEndAt;
        } else if (court.endTime) {
          endTime = court.endTime;
        }

        // Check for future blocks that would overlap with game availability (with buffer)
        if (endTime) {
          const gameEndTime = new Date(endTime).getTime();
          const futureBlock = blocks.find(
            (block) =>
              block.courtNumber === courtNumber &&
              new Date(block.startTime).getTime() - REGISTRATION_BUFFER_MS < gameEndTime &&
              new Date(block.endTime).getTime() > currentTime.getTime()
          );

          if (futureBlock) {
            blockingUntil = futureBlock.endTime;
          }
        }

        // Check if this is an overtime court (game has exceeded scheduled duration)
        if (endTime) {
          const parsedEndTime = new Date(endTime);
          // Domain format: session.group.players
          const hasPlayers = court.session?.group?.players?.length > 0;

          if (hasPlayers && parsedEndTime <= currentTime) {
            // Check if a block starts within the buffer period
            const imminentBlock = blocks.find(
              (block) =>
                block.courtNumber === courtNumber &&
                new Date(block.startTime).getTime() > currentTime.getTime() &&
                new Date(block.startTime).getTime() - REGISTRATION_BUFFER_MS <=
                  currentTime.getTime()
            );

            if (imminentBlock) {
              // Don't show as "Now" - extend availability to after the block
              blockingUntil = imminentBlock.endTime;
            } else {
              overtimeCourts.push({
                courtNumber,
                endTime: null, // Special marker for "Now"
                isOvertime: true,
              });
              return; // Don't add to regular availability
            }
          }
        }
      }

      // Use the blocking time if blocks interfere, otherwise use game end time
      const finalEndTime = blockingUntil || endTime;

      // Parse and validate the end time for future availability
      if (finalEndTime) {
        try {
          const parsedEndTime = new Date(finalEndTime);
          // Exclude if availability is within 15 min of closing time
          if (
            !isNaN(parsedEndTime.getTime()) &&
            parsedEndTime > currentTime &&
            parsedEndTime <= closingBufferTime
          ) {
            courtAvailability.push({
              courtNumber,
              endTime: parsedEndTime,
            });
          }
        } catch (error) {
          console.error(`Error parsing end time for court ${courtNumber}:`, error);
        }
      }
    });

    // Sort future availability by time
    courtAvailability.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

    // Check if we should show overtime courts as "Now"
    // Only show overtime as available if there aren't surplus empty courts
    let filteredOvertimeCourts = overtimeCourts;

    try {
      if (A && A.getFreeCourtsInfo) {
        const now = new Date();
        const data = courtsToData(courts); // Use React state instead of localStorage
        const wetSet = new Set(
          blocks
            .filter(
              (b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
            )
            .map((b) => b.courtNumber)
        );
        const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
        const emptyCount = info.free ? info.free.length : 0;
        const waitingCount = waitlist.length;

        // If there are surplus empty courts, overtime courts aren't truly "available now"
        if (emptyCount > waitingCount) {
          filteredOvertimeCourts = [];
        }
      }
    } catch (error) {
      console.error('Error filtering overtime courts:', error);
    }

    // Combine filtered overtime courts (first) with future availability
    return [...filteredOvertimeCourts, ...courtAvailability];
  };

  const timeline = getCourtAvailabilityTimeline(waitlist);

  // Calculate if courts are available after serving the waitlist
  let emptyCourtCount = 0;
  try {
    if (A && A.getFreeCourtsInfo) {
      const now = new Date();
      const data = courtsToData(courts); // Use React state instead of localStorage
      const wetSet = new Set(
        courtBlocks
          .filter((b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
          .map((b) => b.courtNumber)
      );
      const info = A.getFreeCourtsInfo({ data, now, blocks: courtBlocks, wetSet });
      emptyCourtCount = info.free ? info.free.length : 0;
    }
  } catch (error) {
    console.error('Error getting free court count:', error);
  }

  // Modified logic: Show "available now" if more empty courts than waiting groups
  const surplusCourts = emptyCourtCount - waitlist.length;
  const hasAvailableNow = surplusCourts > 0;

  // Check club hours for closed message
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTimeDecimal = currentHour + currentMinutes / 60;
  const dayOfWeek = currentTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const openingTime = isWeekend ? 7 : 6.5; // 7:00 AM weekend, 6:30 AM weekday
  const openingTimeString = isWeekend ? '7:00 AM' : '6:30 AM';

  // Show opening message when courts are available but club is closed
  const isInEarlyHours = currentTimeDecimal >= 4 && currentTimeDecimal < openingTime;
  const shouldShowOpeningMessage = hasAvailableNow && isInEarlyHours;

  // Get max display count from config or default to 6
  const maxDisplay = _sharedTennisConfig?.DISPLAY?.MAX_WAITING_DISPLAY || 6;

  return (
    <div className="next-available-section h-full min-h-0 flex flex-col">
      <div className="bg-slate-800/50 rounded-xl shadow-2xl p-4 backdrop-blur flex-1">
        {hasAvailableNow ? (
          <>
            <h2 className="courtboard-text-xl font-bold mb-3 flex items-center text-gray-400">
              <TennisBall className="mr-3 icon-grey" size={24} />
              Next Available
            </h2>
            <div className="text-center mt-12">
              <p className="text-gray-400 courtboard-text-base">
                {shouldShowOpeningMessage
                  ? `Courts open at ${openingTimeString}`
                  : 'Courts available now'}
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="courtboard-text-xl font-bold mb-3 flex items-center text-blue-300">
              <TennisBall className="mr-3" size={24} />
              Next Available
            </h2>
            <div className="border-b border-gray-600 mb-2"></div>
            <div className="space-y-2 mt-4">
              {timeline.length > 0 ? (
                timeline[0]?.allCourtsWet ? (
                  <div className="text-center mt-8">
                    <p className="text-yellow-400 courtboard-text-lg">
                      Courts will become available as they dry
                    </p>
                  </div>
                ) : (
                  timeline.slice(0, maxDisplay).map((availability, idx) => (
                    <div key={idx} className="bg-slate-700/50 p-2 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="courtboard-text-base font-medium text-white">
                            Court {availability.courtNumber}
                          </span>
                        </div>
                        <div className="courtboard-text-base font-semibold text-white">
                          {availability.isOvertime ? (
                            <span className="text-white font-bold">Now</span>
                          ) : availability.endTime ? (
                            availability.endTime.toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          ) : (
                            'Time TBD'
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="text-center mt-8">
                  <p className="text-gray-400 courtboard-text-lg">No availability data</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto pt-4">
        <ReservedCourtsPanel
          className="bg-slate-800/50 rounded-xl shadow-2xl p-4 backdrop-blur"
          items={selectReservedItemsFromBlocks(
            [...courtBlocks, ...upcomingBlocks].filter((b) => !b.isWetCourt),
            currentTime
          )}
        />
      </div>
    </div>
  );
}

// Reserved Courts Panel
function ReservedCourtsPanel({ items, className, title = 'Reserved Courts' }) {
  // Format time range compactly: "8:00-9:00 AM" instead of "8:00 AM – 9:00 AM"
  const fmtRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const sTime = s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const eTime = e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    // If same AM/PM, omit from start time
    const sAmPm = s.getHours() >= 12 ? 'PM' : 'AM';
    const eAmPm = e.getHours() >= 12 ? 'PM' : 'AM';
    if (sAmPm === eAmPm) {
      return `${sTime.replace(/ (AM|PM)/, '')}-${eTime}`;
    }
    return `${sTime}-${eTime}`;
  };

  return (
    <section id="reserved-courts-root" className={className}>
      <h3
        className={`courtboard-text-xl font-bold mb-3 flex items-center ${
          !items || items.length === 0 ? 'text-gray-400' : 'text-blue-300'
        }`}
      >
        <Calendar className={`mr-3 ${!items || items.length === 0 ? 'icon-grey' : ''}`} size={24} />
        {title}
      </h3>

      {!items || items.length === 0 ? (
        <div className="text-center mt-8">
          <p className="text-gray-400 reserved-courts-empty">No scheduled blocks today</p>
        </div>
      ) : (
        <ul className="mt-2 space-y-1 reserved-courts-text text-gray-300 text-lg">
          {items.slice(0, 8).map((it, i) => (
            <li key={`${it.key || i}`} className="flex justify-between gap-2">
              <span className="font-medium text-gray-200 flex-shrink-0">
                {it.courts.join(', ')}
              </span>
              <span className="text-gray-400 text-right">
                {fmtRange(it.start, it.end)} ({it.label}){it.warning ? ' ⚠️' : ''}
              </span>
            </li>
          ))}
          {items.length > 8 && (
            <li className="courtboard-text-xs text-gray-500 mt-1">+{items.length - 8} more…</li>
          )}
        </ul>
      )}
    </section>
  );
}

// Helper function for reserved items
function normalizeBlock(raw) {
  const reasonRaw =
    raw.reason ||
    raw.title ||
    (raw.eventDetails && (raw.eventDetails.title || raw.eventDetails.type)) ||
    '';
  const reason = String(reasonRaw).trim().toUpperCase();

  const start = raw.startTime ? new Date(raw.startTime) : null;
  let end = raw.endTime ? new Date(raw.endTime) : null;
  if (!end && start && (raw.duration || raw.duration === 0)) {
    end = new Date(start);
    end.setMinutes(end.getMinutes() + Number(raw.duration || 60));
  }

  let courts = [];
  if (Array.isArray(raw.courts)) courts = courts.concat(raw.courts);
  if (raw.eventDetails && Array.isArray(raw.eventDetails.courts))
    courts = courts.concat(raw.eventDetails.courts);
  if (Number.isFinite(raw.courtNumber)) courts.push(raw.courtNumber);

  courts = Array.from(new Set(courts.filter(Number.isFinite))).sort((a, b) => a - b);
  if (!start || !end || courts.length === 0) {
    return null;
  }
  return { courts, start, end, reason };
}

function selectReservedItemsFromBlocks(blocks, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const normalized = (blocks || []).map(normalizeBlock).filter(Boolean);
  const todayFuture = normalized
    .filter((b) => b.end > now && b.start <= endOfToday)
    .map((b) => ({ ...b, end: b.end > endOfToday ? endOfToday : b.end }))
    .sort((a, b) => a.start - b.start);

  const byKey = new Map();
  for (const b of todayFuture) {
    const k = `${b.reason}|${b.start.toISOString()}|${b.end.toISOString()}`;
    if (!byKey.has(k)) byKey.set(k, { ...b, courts: new Set(b.courts) });
    else b.courts.forEach((c) => byKey.get(k).courts.add(c));
  }

  return Array.from(byKey.values()).map((v) => ({
    key: `${v.reason}|${v.start.getTime()}|${v.end.getTime()}`,
    courts: Array.from(v.courts).sort((a, b) => a - b),
    start: v.start,
    end: v.end,
    label: v.reason || 'RESERVED',
    warning:
      v.start.getTime() - now.getTime() <= 60 * 60 * 1000 && v.start.getTime() - now.getTime() > 0,
  }));
}

// Mount the application
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

// ============================================
// MOBILE MODAL SYSTEM
// ============================================

// MobileModalSheet Component - handles rendering modal content
function MobileModalSheet({ type, payload, onClose }) {
  // Focus trap & return focus
  useEffect(() => {
    const opener = document.activeElement;
    return () => opener?.focus();
  }, []);

  // Scroll lock while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard handlers (scoped to modal only)
  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const getTitle = () => {
    switch (type) {
      case 'court-conditions':
        return 'Court Conditions';
      case 'roster':
        return 'Member Roster';
      case 'reserved':
        return 'Reserved Courts';
      case 'waitlist':
        return 'Waitlist';
      case 'clear-court-confirm':
        return `Clear Court ${payload?.courtNumber || ''}?`;
      case 'waitlist-available':
        return 'Court Available!';
      default:
        return '';
    }
  };

  const getBodyContent = () => {
    switch (type) {
      case 'court-conditions': {
        // Court conditions with iframe
        const wetCourtsUrl = 'https://camera.noltc.com/courtconditions.html';
        return (
          <div className="modal-court-conditions">
            <iframe
              src={wetCourtsUrl}
              title="Court Conditions"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
            <button
              className="court-conditions-close"
              onClick={onClose}
              aria-label="Close"
              type="button"
            >
              ✕
            </button>
          </div>
        );
      }

      case 'roster': {
        // Member roster display
        let rosterData = [];
        try {
          const S = window.Tennis?.Storage;
          rosterData =
            window.__memberRoster ||
            (S?.readJSON ? S.readJSON('tennisMembers') : null) ||
            (S?.readJSON ? S.readJSON('members') : null) ||
            JSON.parse(localStorage.getItem('tennisMembers') || 'null') ||
            JSON.parse(localStorage.getItem('members') || 'null') ||
            [];

          // If no data found, use test data
          if (!rosterData || rosterData.length === 0) {
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
            ];
            rosterData = names.map((name, i) => ({
              id: 1000 + i + 1,
              name: name,
              memberNumber: String(1000 + i + 1),
              memberId: `m_${1000 + i + 1}`,
            }));
          }
        } catch (e) {
          console.warn('Failed to load roster data:', e);
          rosterData = [];
        }

        // Sort alphabetically by last name
        const sortedRoster = [...rosterData].sort((a, b) => {
          const getLastName = (fullName) => {
            const parts = (fullName || '').trim().split(' ');
            return parts[parts.length - 1] || '';
          };
          const lastNameA = getLastName(a.name || a.fullName).toLowerCase();
          const lastNameB = getLastName(b.name || b.fullName).toLowerCase();
          if (lastNameA === lastNameB) {
            const firstNameA = (a.name || a.fullName || '').toLowerCase();
            const firstNameB = (b.name || b.fullName || '').toLowerCase();
            return firstNameA.localeCompare(firstNameB);
          }
          return lastNameA.localeCompare(lastNameB);
        });

        return (
          <div className="modal-roster">
            {sortedRoster.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-gray-400">No member data available.</p>
              </div>
            ) : (
              <div className="p-4 h-full overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-600 sticky top-0 bg-gray-800">
                  <div className="font-semibold text-gray-300 text-sm">Member Name</div>
                  <div className="font-semibold text-gray-300 text-sm">Member #</div>
                </div>
                <div className="space-y-2">
                  {sortedRoster.map((member, idx) => {
                    const memberName = member.name || member.fullName || 'Unknown Member';
                    const memberNumber =
                      member.memberNumber || member.clubNumber || member.memberId || 'N/A';
                    return (
                      <div
                        key={member.memberId || member.memberNumber || idx}
                        className="flex justify-between items-center py-2 px-3 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                      >
                        <span className="text-gray-200 font-medium">{memberName}</span>
                        <span className="text-gray-400 text-sm">{memberNumber}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'reserved': {
        // Reserved courts list
        const reservedItems = payload?.reservedData || [];
        const fmt = (d) =>
          new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return (
          <div className="modal-reserved-courts">
            {reservedItems.length === 0 ? (
              <div className="text-center p-6 pb-16">
                <p className="text-gray-400 reserved-courts-empty">No scheduled blocks today</p>
              </div>
            ) : (
              <ul className="space-y-0.5 reserved-courts-text text-gray-300 px-6 pb-16 pt-2">
                {reservedItems.map((item, idx) => (
                  <li key={item.key || idx} className="flex justify-between py-1">
                    <span className="font-medium text-gray-200">
                      {item.courts?.length > 1
                        ? `Courts ${item.courts.join(', ')}`
                        : `Court ${item.courts?.[0] || 'N/A'}`}
                    </span>
                    <span className="ml-2 whitespace-nowrap text-gray-400">
                      {fmt(item.start)} – {fmt(item.end)} ({item.reason || 'Reserved'})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      case 'waitlist': {
        // Waitlist display - uses courts data from payload (passed from React state)
        const waitlistData = payload?.waitlistData || [];
        const modalCourts = payload?.courts || [];
        const modalCourtBlocks = payload?.courtBlocks || [];
        const modalUpcomingBlocks = payload?.upcomingBlocks || [];

        // Helper to convert courts array to data format for availability functions
        const courtsToDataModal = (courtsArray) => ({ courts: courtsArray || [] });

        // Mobile name formatting
        const formatMobileNamesModal = (nameArray) => {
          if (!nameArray || !nameArray.length) return 'Group';
          const SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV']);
          const formatOne = (full) => {
            const tokens = full.replace(/\s+/g, ' ').trim().split(' ');
            if (tokens.length === 1) {
              // Single name (e.g., "Bob" or "Player") - return as-is, no formatting
              return tokens[0];
            }
            let last = tokens[tokens.length - 1];
            let last2 = tokens[tokens.length - 2];
            let lastName, remainder;
            if (SUFFIXES.has(last) && tokens.length > 2) {
              lastName = `${last2} ${last}`;
              remainder = tokens.slice(0, -2);
            } else {
              lastName = last;
              remainder = tokens.slice(0, -1);
            }
            const first = remainder[0] || '';
            return first ? `${first[0]}. ${lastName}` : lastName;
          };
          const primary = formatOne(nameArray[0]);
          return nameArray.length > 1 ? `${primary} +${nameArray.length - 1}` : primary;
        };

        // Calculate estimated wait time for mobile modal (uses payload data, not localStorage)
        const calculateMobileWaitTime = (position) => {
          try {
            const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
            const W = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist;

            if (!A || !W) {
              return position * 15;
            }

            const now = new Date();
            const data = courtsToDataModal(modalCourts); // Use payload data
            // Combine active blocks and future blocks for accurate availability calculation
            const blocks = [...modalCourtBlocks, ...modalUpcomingBlocks];
            const wetSet = new Set(
              blocks
                .filter(
                  (b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
                )
                .map((b) => b.courtNumber)
            );

            const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
            const nextTimes = A.getNextFreeTimes
              ? A.getNextFreeTimes({ data, now, blocks, wetSet })
              : [];

            if (W.estimateWaitForPositions) {
              const avgGame = window.Tennis?.Config?.Timing?.AVG_GAME || 75;
              const etas = W.estimateWaitForPositions({
                positions: [position],
                currentFreeCount: info.free?.length || 0,
                nextFreeTimes: nextTimes,
                avgGameMinutes: avgGame,
              });
              return etas[0] || 0;
            }
            return position * 15;
          } catch (error) {
            console.warn('Error calculating mobile wait time:', error);
            return position * 15;
          }
        };

        // Check if first group can register now (uses payload data, not localStorage)
        const canFirstGroupRegister = () => {
          try {
            const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
            if (!A) return false;

            const now = new Date();
            const data = courtsToDataModal(modalCourts); // Use payload data
            // Combine active blocks and future blocks for accurate availability calculation
            const blocks = [...modalCourtBlocks, ...modalUpcomingBlocks];
            const wetSet = new Set(
              blocks
                .filter(
                  (b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
                )
                .map((b) => b.courtNumber)
            );

            if (A.getFreeCourtsInfo) {
              const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
              const freeCount = info.free?.length || 0;
              const overtimeCount = info.overtime?.length || 0;
              return freeCount > 0 || overtimeCount > 0;
            }
            return false;
          } catch (_error) {
            return false;
          }
        };

        return (
          <div className="modal-waitlist">
            {waitlistData.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-gray-400">No groups waiting.</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-600">
                  <div className="font-semibold text-gray-300 text-sm">Position</div>
                  <div className="font-semibold text-gray-300 text-sm">Estimated</div>
                </div>
                <div className="space-y-3">
                  {waitlistData.map((group, idx) => {
                    let names = [];
                    if (Array.isArray(group.players)) {
                      // Use displayName (domain format) first, then name (legacy), then id as fallback
                      names = group.players.map(
                        (p) => p.displayName || p.name || p.id || 'Unknown'
                      );
                    } else if (group.names) {
                      names = Array.isArray(group.names) ? group.names : [group.names];
                    } else if (group.name) {
                      names = [group.name];
                    } else {
                      names = ['Group'];
                    }

                    const formattedNames = formatMobileNamesModal(names);
                    const position = idx + 1;

                    // Calculate proper estimated wait time
                    let estimatedStr;
                    if (position === 1 && canFirstGroupRegister()) {
                      estimatedStr = 'Now';
                    } else {
                      const waitMinutes = calculateMobileWaitTime(position);
                      estimatedStr = waitMinutes > 0 ? `${waitMinutes}m` : 'Now';
                    }

                    return (
                      <div key={idx} className="flex justify-between items-center py-1">
                        <div className="text-white">{`${idx + 1}. ${formattedNames}`}</div>
                        <div className="text-gray-400 text-sm">{estimatedStr}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'clear-court-confirm': {
        // Clear Court confirmation modal
        const clearCourtNumber = payload?.courtNumber || '';
        const clearCourtPlayers = payload?.players || '';
        return (
          <div className="p-6 text-center">
            {clearCourtPlayers && (
              <p className="text-gray-200 mb-4 text-lg">
                {clearCourtPlayers} on Court {clearCourtNumber}
              </p>
            )}
            <button
              type="button"
              className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
              onClick={async () => {
                try {
                  // Get court ID from current board state
                  const board = await backend.queries.getBoard();
                  const court = board?.courts?.find(
                    (c) => c && c.number === Number(clearCourtNumber)
                  );

                  if (court?.id) {
                    // Use API to end session
                    await backend.commands.endSession({
                      courtId: court.id,
                      reason: 'completed',
                    });
                    console.log(`[Courtboard] Court ${clearCourtNumber} cleared via API`);
                  } else {
                    console.warn(`[Courtboard] No court ID found for court ${clearCourtNumber}`);
                  }

                  // Post-clear cleanup (mobile UI state)
                  sessionStorage.removeItem('mobile-registered-court');
                  window.parent.postMessage({ type: 'resetRegistration' }, '*');
                  if (window.updateJoinButtonForMobile) {
                    window.updateJoinButtonForMobile();
                  }
                  onClose();
                } catch (e) {
                  console.error('Error clearing court:', e);
                  // Still close modal and update UI state on error
                  sessionStorage.removeItem('mobile-registered-court');
                  onClose();
                }
              }}
            >
              We have finished and are leaving Court {clearCourtNumber}
            </button>
          </div>
        );
      }

      case 'waitlist-available': {
        // Waitlist CTA - court is available for first waitlist group
        const firstGroup = payload?.firstGroup || {};
        const playerNames = (firstGroup.names || []).join(', ') || 'Next group';
        return (
          <div className="p-6 text-center">
            <p className="text-yellow-400 text-xl font-semibold mb-3">{playerNames}</p>
            <p className="text-gray-300 text-base">Tap an available court to play</p>
          </div>
        );
      }

      default:
        return (
          <div className="p-6 text-center">
            <p>Unknown modal type</p>
          </div>
        );
    }
  };

  const titleId = `modal-title-${type}`;

  const getModalClass = () => {
    if (type === 'court-conditions') return ' modal-court-conditions-full';
    if (type === 'roster') return ' modal-court-conditions-full';
    if (type === 'reserved') return ' modal-reserved-large';
    if (type === 'waitlist') return ' modal-waitlist-large';
    if (type === 'clear-court-confirm') return ' modal-clear-court-confirm';
    if (type === 'waitlist-available') return ' modal-waitlist-available';
    return '';
  };

  return (
    <div
      className={`mobile-modal-overlay${getModalClass()}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="mobile-modal-content">
        <div className="mobile-modal-header">
          <h3 id={titleId} className="mobile-modal-title">
            {getTitle()}
          </h3>
          <button
            type="button"
            className="mobile-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="mobile-modal-body">{getBodyContent()}</div>
      </div>
    </div>
  );
}

// MobileModalApp Component - manages modal state and listens for events
function MobileModalApp() {
  const [state, setState] = useState({ open: false, type: null, payload: null });

  useEffect(() => {
    if (!window.IS_MOBILE_VIEW) return;

    const onOpen = (e) => {
      setState({ open: true, type: e.detail.type, payload: e.detail.payload || null });
      document.getElementById('mobile-modal-root')?.classList.add('modal-open');
    };
    const onClose = () => {
      setState({ open: false, type: null, payload: null });
      document.getElementById('mobile-modal-root')?.classList.remove('modal-open');
    };

    document.addEventListener('mm:open', onOpen);
    document.addEventListener('mm:close', onClose);

    return () => {
      document.removeEventListener('mm:open', onOpen);
      document.removeEventListener('mm:close', onClose);
    };
  }, []);

  if (!window.IS_MOBILE_VIEW || !state.open) return null;
  return (
    <MobileModalSheet
      type={state.type}
      payload={state.payload}
      onClose={window.MobileModal?.close || (() => {})}
    />
  );
}

// Mount mobile modal system if in mobile view
if (window.IS_MOBILE_VIEW) {
  const modalNode = document.getElementById('mobile-modal-root');
  if (modalNode) {
    const modalRoot = ReactDOM.createRoot(modalNode);
    modalRoot.render(<MobileModalApp />);
    console.debug('Mobile modal system mounted');

    // Debug listener
    document.addEventListener('mm:open', (e) =>
      console.debug('[ModalRoot] mm:open seen', e.detail)
    );
    document.addEventListener('mm:close', () => console.debug('[ModalRoot] mm:close seen'));
  }
}
