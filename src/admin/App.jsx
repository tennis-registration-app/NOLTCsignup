/**
 * Admin Panel - Main App Component
 *
 * Extracted from Admin.html's inline React code.
 * This is the initial monolithic extraction (~7,100 lines).
 * Future phases will break this into smaller component files.
 */
/* global Tennis */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createBackend } from '../registration/backend/index.js';
import { normalizeWaitlist } from '../lib/normalizeWaitlist.js';
import { logger } from '../lib/logger.js';

// Admin refresh utilities - IIFEs execute at import time (same as original module-level)
import './utils/adminRefresh.js';

// TennisBackend singleton for API operations
const backend = createBackend();

// Get device ID for API calls
const getDeviceId = () => {
  return window.Tennis?.deviceId || localStorage.getItem('deviceId') || 'admin-device';
};

// Import extracted components
import {
  // UI Components
  HoverCard,
  QuickActionsMenu,
  VisualTimeEntry,
} from './components';

// Calendar components
import { EventCalendarEnhanced } from './calendar';

// Block management components
import { CompleteBlockManagerEnhanced } from './blocks';

// Court management components (CourtStatusGrid now used in StatusSection)

// Analytics components (re-exported via ./screens/AnalyticsDashboard)

// AI components
import { MockAIAdmin, AIAssistant } from './ai';

// Screen components
import { GameHistorySearch, AnalyticsDashboard } from './screens';

// Utilities (getEventIcon now used in MonthView)

// Direct component imports (not from barrel to avoid circular deps)
import { MiniCalendar } from './components/MiniCalendar';
import { MonthView } from './components/MonthView';
import { EventSummary } from './components/EventSummary';

// Tab section components
import { CalendarSection } from './tabs/CalendarSection';
import { HistorySection } from './tabs/HistorySection';
import { AnalyticsSection } from './tabs/AnalyticsSection';
import { BlockingSection } from './tabs/BlockingSection';
import { TabNavigation } from './tabs/TabNavigation';
import { StatusSection } from './tabs/StatusSection';
import { WaitlistSection } from './tabs/WaitlistSection';
import { SystemSection } from './tabs/SystemSection';
import { AIAssistantSection } from './tabs/AIAssistantSection';

// Handler modules
import { removeFromWaitlistOp, moveInWaitlistOp } from './handlers/waitlistOperations';
import { clearCourtOp, moveCourtOp, clearAllCourtsOp } from './handlers/courtOperations';
import { applyBlocksOp } from './handlers/applyBlocksOperation';

// Wet courts hook (WP5.2)
import { useWetCourts } from './wetCourts/useWetCourts';

// Feature flag: use real AI assistant instead of mock
const USE_REAL_AI = true;

// Access shared utils from window (loaded via shared scripts in index.html)
const U = window.APP_UTILS || {};
const {
  STORAGE,
  readJSON,
  getEmptyData,
  TennisCourtDataStore,
  TENNIS_CONFIG: _sharedTennisConfig,
} = U;

// --- One-time guard helper (no UI change)
const _one = (key) => (window[key] ? true : ((window[key] = true), false));

// Shared domain modules
const Events = window.Tennis?.Events;

// ---- Core constants (declared only; not replacing existing usages) ----

// ---- Dev flag & assert (no UI change) ----
const DEV = import.meta?.env?.DEV ?? false;
const assert = (cond, msg, obj) => {
  if (DEV && !cond) logger.warn('AdminApp', `ASSERT: ${msg}`, obj || '');
};

// central registry for timers in this view
const _timers = [];
const addTimer = (id, type = 'interval') => {
  _timers.push({ id, type });
  return id;
};
const clearAllTimers = () => {
  _timers.forEach(({ id, type }) => {
    try {
      if (type === 'interval') clearInterval(id);
      else clearTimeout(id);
    } catch {
      // Intentionally ignored (Phase 3.5 lint): timer may already be cleared
    }
  });
  _timers.length = 0;
};

// Global cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      clearAllTimers();
    } catch {
      // Intentionally ignored (Phase 3.5 lint): cleanup on unload
    }
  });
}

// ============================================================
// Section: Admin actions (assign, clear, block scheduling)
// ============================================================

// Boot data assertion
const _bootData = U.readDataSafe ? U.readDataSafe() : readJSON(STORAGE?.DATA) || getEmptyData();
assert(
  !_bootData || Array.isArray(_bootData?.courts),
  'Expected data.courts array on boot',
  _bootData
);

// Initialize DataStore using the shared class
const dataStore = TennisCourtDataStore ? new TennisCourtDataStore() : null;

// ---- TENNIS_CONFIG: NOW IMPORTED FROM window.APP_UTILS ----
const TENNIS_CONFIG = _sharedTennisConfig;

// Main Admin Panel Component
const AdminPanelV2 = ({ onExit }) => {
  // AdminPanelV2 component initializing

  const [activeTab, setActiveTab] = useState('status');
  const [courts, setCourts] = useState([]);
  const [waitingGroups, setWaitingGroups] = useState([]);
  const [, setBlockTemplates] = useState([]); // Getter unused, setter used
  const [settings, setSettings] = useState({});
  const [, setOperatingHours] = useState([]); // Getter unused, setter used
  const [hoursOverrides, setHoursOverrides] = useState([]);
  const [notification, setNotification] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [blockingView, setBlockingView] = useState('create');
  const [courtBlocks, setCourtBlocks] = useState([]);
  const [blockToEdit, setBlockToEdit] = useState(null);
  const [calendarView, _setCalendarView] = useState('day'); // Setter unused
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedDate, _setSelectedDate] = useState(new Date()); // Setter unused

  // Ref to track blocks fingerprint for detecting actual changes
  const lastBlocksFingerprintRef = useRef('');

  const ENABLE_WET_COURTS = true;

  // Wet courts hook (WP5.2) - manages state + backend ops + side effects
  const {
    isActive: wetCourtsActive,
    wetCourtNumbers,
    suspendedBlocks,
    activateWet: handleEmergencyWetCourt,
    deactivateWet: deactivateWetCourts,
    clearWetCourt,
    clearAllWet: _removeAllWetCourtBlocks,
  } = useWetCourts({
    backend,
    getDeviceId,
    courts,
    Events,
    onRefresh: () => setRefreshTrigger((prev) => prev + 1),
  });

  // Convert array to Set for compatibility with existing code that expects Set
  const wetCourts = new Set(wetCourtNumbers);

  // No-op setters for prop compatibility with children using old hook pattern
  // State is now managed by useWetCourts hook
  const setWetCourtsActive = () => {};
  const setWetCourts = () => {};
  const setSuspendedBlocks = () => {};

  const handleEditBlockFromStatus = (block) => {
    setBlockToEdit(block);
    setActiveTab('blocking');
    setBlockingView('create');
  };

  // Load data from localStorage
  const loadData = useCallback(async () => {
    try {
      // Invalidate cache for fresh data
      if (dataStore.cache) {
        dataStore.cache.delete(TENNIS_CONFIG.STORAGE.KEY);
        dataStore.cache.delete('courtBlocks');
      }

      // Courts, waitlist, and courtBlocks now derived from API via TennisBackend subscription
      // No localStorage load needed - initial state is empty, API populates it

      // Load templates
      const templates = await dataStore.get(TENNIS_CONFIG.STORAGE.BLOCK_TEMPLATES_KEY);
      if (templates) {
        setBlockTemplates(templates);
      }

      // Load system settings from API
      // NOTE: Response includes settings_updated_at timestamp for concurrency detection.
      // If multiple admins editing settings becomes an issue, compare this timestamp
      // before saving to warn users about stale state / concurrent edits.
      const settingsResult = await backend.admin.getSettings();
      if (settingsResult.ok) {
        const s = settingsResult.settings;
        setSettings({
          tennisBallPrice: s.ball_price_cents
            ? s.ball_price_cents / 100
            : TENNIS_CONFIG.PRICING.TENNIS_BALLS,
          guestFees: {
            weekday: s.guest_fee_weekday_cents ? s.guest_fee_weekday_cents / 100 : 15.0,
            weekend: s.guest_fee_weekend_cents ? s.guest_fee_weekend_cents / 100 : 20.0,
          },
        });
        if (settingsResult.operating_hours) {
          setOperatingHours(settingsResult.operating_hours);
        }
        if (settingsResult.upcoming_overrides) {
          setHoursOverrides(settingsResult.upcoming_overrides);
        }
      }
    } catch (error) {
      logger.error('AdminApp', 'Failed to load data', error);
      showNotification('Failed to load data', 'error');
    }
  }, []);

  window.refreshAdminView = loadData; // export for coalescer & tests

  // Stable ref for loadData to avoid stale closures in event listeners
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  // Event-driven refresh bridge listener (uses ref to avoid stale closure)
  React.useEffect(() => {
    const onAdminRefresh = () => {
      loadDataRef.current();
    };
    window.addEventListener('ADMIN_REFRESH', onAdminRefresh);
    return () => window.removeEventListener('ADMIN_REFRESH', onAdminRefresh);
  }, []);

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    addTimer(
      setTimeout(() => setNotification(null), 3000),
      'timeout'
    );
  };

  // Load data on mount (realtime updates come via TennisBackend subscription)
  useEffect(() => {
    loadData();

    // prevent duplicate attachment if this component re-mounts
    if (_one('__ADMIN_LISTENERS_INSTALLED')) return;

    // NOTE: Polling removed - using TennisBackend realtime subscription instead

    // Listen for storage events from other apps/tabs (fallback for non-API data)
    const handleStorageEvent = (e) => {
      if (e.key === TENNIS_CONFIG.STORAGE.KEY || e.key === 'courtBlocks') {
        logger.debug('AdminApp', 'Cross-app storage update detected for', e.key);
        // Invalidate cache for this key
        dataStore.cache.delete(e.key);
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageEvent, { passive: true });

    // defensive cleanup on unload as well
    window.addEventListener(
      'beforeunload',
      () => {
        try {
          clearAllTimers();
        } catch {
          // Intentionally ignored (Phase 3.5 lint): cleanup on unload
        }
        try {
          window.removeEventListener('storage', handleStorageEvent);
        } catch {
          // Intentionally ignored (Phase 3.5 lint): listener may not exist
        }
      },
      { once: true }
    );

    return () => {
      try {
        window.removeEventListener('storage', handleStorageEvent);
      } catch {
        // Intentionally ignored (Phase 3.5 lint): cleanup on unmount
      }
    };
  }, [loadData]);

  // Generate fingerprint from blocks to detect actual changes
  const generateBlocksFingerprint = (blocks) => {
    if (!blocks || !Array.isArray(blocks)) return '';
    return blocks
      .map((b) => `${b.id}:${b.startsAt || b.starts_at}:${b.endsAt || b.ends_at}`)
      .sort()
      .join('|');
  };

  // Subscribe to TennisBackend realtime updates for courts/waitlist
  useEffect(() => {
    logger.debug('AdminApp', 'Setting up TennisBackend subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges((board) => {
      logger.debug('AdminApp', 'Board update received', {
        serverNow: board?.serverNow,
        courts: board?.courts?.length,
      });

      if (board) {
        // Update courts from API
        setCourts(board.courts || []);
        // Normalize waitlist using shared helper
        setWaitingGroups(normalizeWaitlist(board.waitlist));

        // Extract block data from courts for UI compatibility
        // API-only: derive courtBlocks entirely from board.courts
        const apiBlocks = (board.courts || [])
          .filter((c) => c.block)
          .map((c) => ({
            id: c.block.id,
            courtId: c.id,
            courtNumber: c.number,
            reason: c.block.reason,
            startTime: c.block?.startsAt || c.block?.startTime || new Date().toISOString(),
            endTime: c.block?.endsAt || c.block?.endTime,
          }));

        setCourtBlocks(apiBlocks);

        // Only trigger calendar refresh when blocks actually changed
        const currentBlocks = [...(board.blocks || []), ...(board.upcomingBlocks || [])];
        const newFingerprint = generateBlocksFingerprint(currentBlocks);
        if (newFingerprint !== lastBlocksFingerprintRef.current) {
          lastBlocksFingerprintRef.current = newFingerprint;
          setRefreshTrigger((prev) => prev + 1);
          logger.debug('AdminApp', 'Blocks changed, triggering calendar refresh');
        }
      }
    });

    return () => {
      logger.debug('AdminApp', 'Cleaning up TennisBackend subscription');
      unsubscribe();
    };
  }, []);

  // NOTE: Block loading now handled by TennisBackend subscription
  // The subscription extracts block data from court responses and updates courtBlocks state
  // See the subscribeToBoardChanges useEffect above

  // Update current time every second
  useEffect(() => {
    const timer = addTimer(
      setInterval(() => {
        setCurrentTime(new Date());
      }, 1000)
    );

    return () => {
      try {
        clearInterval(timer);
      } catch {
        // Intentionally ignored (Phase 3.5 lint): cleanup on unmount
      }
    };
  }, []);

  // Court operations - delegated to handler module
  const clearCourt = (courtNumber) =>
    clearCourtOp({ courts, backend, showNotification, TENNIS_CONFIG }, courtNumber);

  const moveCourt = (from, to) => moveCourtOp({ backend }, from, to);

  const clearAllCourts = () =>
    clearAllCourtsOp({ courts, backend, dataStore, showNotification, TENNIS_CONFIG });

  // Add existingBlocks calculation
  const existingBlocks = courts
    .filter((c) => c?.blocked)
    .map((c, i) => ({
      court: i + 1,
      ...c.blocked,
    }));

  // Block operations - delegated to handler module
  const applyBlocks = (blocks) =>
    applyBlocksOp({ courts, backend, showNotification, TENNIS_CONFIG }, blocks);

  // Waitlist operations - delegated to handler module
  const removeFromWaitlist = (index) =>
    removeFromWaitlistOp({ waitingGroups, backend, showNotification, TENNIS_CONFIG }, index);

  const moveInWaitlist = (from, to) =>
    moveInWaitlistOp({ waitingGroups, backend, showNotification }, from, to);

  // Settings operations
  const updateBallPrice = async (price) => {
    const result = await backend.admin.updateSettings({
      settings: { ball_price_cents: Math.round(price * 100) },
    });
    if (result.ok) {
      setSettings((prev) => ({ ...prev, tennisBallPrice: price }));
      showNotification('Ball price updated', 'success');
    } else {
      showNotification('Failed to update ball price', 'error');
    }
  };

  // Callback for SystemSettings to refresh local state after settings change
  const handleSettingsChanged = () => {
    backend.admin.getSettings().then((result) => {
      if (result.ok) {
        if (result.settings) {
          setSettings({
            tennisBallPrice: (result.settings.ball_price_cents || 500) / 100,
            guestFees: {
              weekday: (result.settings.guest_fee_weekday_cents || 1500) / 100,
              weekend: (result.settings.guest_fee_weekend_cents || 2000) / 100,
            },
          });
        }
        if (result.operating_hours) {
          setOperatingHours(result.operating_hours);
        }
        if (result.upcoming_overrides) {
          setHoursOverrides(result.upcoming_overrides);
        }
      }
    });
  };

  // Callback for AIAssistant to refresh settings after AI-triggered changes
  const handleAISettingsChanged = async () => {
    const res = await backend.admin.getSettings();
    if (res.ok) {
      if (res.settings) {
        setSettings({
          tennisBallPrice: (res.settings.ball_price_cents || 500) / 100,
          guestFees: {
            weekday: (res.settings.guest_fee_weekday_cents || 1500) / 100,
            weekend: (res.settings.guest_fee_weekend_cents || 2000) / 100,
          },
        });
      }
      if (res.upcoming_overrides) {
        setHoursOverrides(res.upcoming_overrides);
      }
    }
  };

  // Callback for MockAIAdmin to refresh data
  const handleRefreshData = () => {
    loadData();
    setRefreshTrigger((prev) => prev + 1);
  };

  // Callback for MockAIAdmin to clear waitlist
  const handleClearWaitlist = async () => {
    const res = await backend.commands.clearWaitlist();
    return res;
  };

  // AdminPanelV2 rendering complete
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        blockingView={blockingView}
        setBlockingView={setBlockingView}
        onExit={onExit}
      />

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm -mt-px">
          {' '}
          {/* ADD THIS LINE */}
          {activeTab === 'status' && (
            <StatusSection
              courts={courts}
              courtBlocks={courtBlocks}
              selectedDate={selectedDate}
              currentTime={currentTime}
              wetCourtsActive={wetCourtsActive}
              wetCourts={wetCourts}
              waitingGroups={waitingGroups}
              backend={backend}
              clearCourt={clearCourt}
              moveCourt={moveCourt}
              handleEditBlockFromStatus={handleEditBlockFromStatus}
              handleEmergencyWetCourt={handleEmergencyWetCourt}
              clearAllCourts={clearAllCourts}
              deactivateWetCourts={deactivateWetCourts}
              clearWetCourt={clearWetCourt}
              moveInWaitlist={moveInWaitlist}
              removeFromWaitlist={removeFromWaitlist}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarSection
              courts={courts}
              currentTime={currentTime}
              refreshTrigger={refreshTrigger}
              onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
              calendarView={calendarView}
              backend={backend}
              hoursOverrides={hoursOverrides}
              MonthView={MonthView}
              EventSummary={EventSummary}
              HoverCard={HoverCard}
              QuickActionsMenu={QuickActionsMenu}
              Tennis={window.Tennis}
              EventCalendarEnhanced={EventCalendarEnhanced}
            />
          )}
          {activeTab === 'blocking' && (
            <BlockingSection
              blockingView={blockingView}
              courts={courts}
              onApplyBlocks={applyBlocks}
              existingBlocks={existingBlocks}
              wetCourtsActive={wetCourtsActive}
              setWetCourtsActive={setWetCourtsActive}
              wetCourts={wetCourts}
              setWetCourts={setWetCourts}
              suspendedBlocks={suspendedBlocks}
              setSuspendedBlocks={setSuspendedBlocks}
              ENABLE_WET_COURTS={ENABLE_WET_COURTS}
              onNotification={showNotification}
              VisualTimeEntry={VisualTimeEntry}
              MiniCalendar={MiniCalendar}
              EventCalendarEnhanced={EventCalendarEnhanced}
              MonthView={MonthView}
              EventSummary={EventSummary}
              HoverCard={HoverCard}
              QuickActionsMenu={QuickActionsMenu}
              Tennis={window.Tennis}
              backend={backend}
              hoursOverrides={hoursOverrides}
              initialEditingBlock={blockToEdit}
              onEditingBlockConsumed={() => setBlockToEdit(null)}
              CompleteBlockManagerEnhanced={CompleteBlockManagerEnhanced}
            />
          )}
          {activeTab === 'waitlist' && (
            <WaitlistSection
              waitingGroups={waitingGroups}
              moveInWaitlist={moveInWaitlist}
              removeFromWaitlist={removeFromWaitlist}
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsSection backend={backend} AnalyticsDashboard={AnalyticsDashboard} />
          )}
          {activeTab === 'history' && (
            <HistorySection backend={backend} GameHistorySearch={GameHistorySearch} />
          )}
        </div>
        {/* System tab - outside the white wrapper so cards have visible separation */}
        {activeTab === 'system' && (
          <SystemSection backend={backend} onSettingsChanged={handleSettingsChanged} />
        )}
      </div>

      {/* AI Assistant Button and Modal */}
      <AIAssistantSection
        activeTab={activeTab}
        showAIAssistant={showAIAssistant}
        setShowAIAssistant={setShowAIAssistant}
        USE_REAL_AI={USE_REAL_AI}
        backend={backend}
        onAISettingsChanged={handleAISettingsChanged}
        AIAssistant={AIAssistant}
        MockAIAdmin={MockAIAdmin}
        dataStore={dataStore}
        courts={courts}
        loadData={loadData}
        clearCourt={clearCourt}
        clearAllCourts={clearAllCourts}
        moveCourt={moveCourt}
        settings={settings}
        updateBallPrice={updateBallPrice}
        waitingGroups={waitingGroups}
        refreshData={handleRefreshData}
        clearWaitlist={handleClearWaitlist}
      />
    </div>
  );
};

// Export the main App component (renamed from TestMenu)
export default function App() {
  const [view, setView] = useState('menu');

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-2">NOLTC Admin</h1>
          <p className="text-gray-500 mb-8">Staff access only</p>

          <button
            onClick={() => setView('admin')}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    try {
      if (typeof AdminPanelV2 !== 'undefined') {
        return <AdminPanelV2 onExit={() => setView('menu')} />;
      } else {
        return <div className="p-8">AdminPanelV2 component not found</div>;
      }
    } catch (error) {
      logger.error('AdminApp', 'AdminPanelV2 render error', error);
      return (
        <div className="p-8">
          <h1 className="text-xl font-bold text-red-600">Error loading Admin Panel</h1>
          <p className="mt-2">{error.message}</p>
          <button
            onClick={() => setView('menu')}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
          >
            Back to Menu
          </button>
        </div>
      );
    }
  }

  if (view === 'analytics' && typeof AnalyticsDashboard !== 'undefined') {
    return <AnalyticsDashboard onClose={() => setView('menu')} backend={backend} />;
  }

  // Fallback if components aren't available
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Component Not Found</h1>
        <p className="mb-4">The requested component is not available.</p>
        <button
          onClick={() => setView('menu')}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
