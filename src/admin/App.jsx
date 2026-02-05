/**
 * Admin Panel - Main App Component
 *
 * Extracted from Admin.html's inline React code.
 * This is the initial monolithic extraction (~7,100 lines).
 * Future phases will break this into smaller component files.
 */
/* global Tennis */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBackend } from '../registration/backend/index.js';
import { logger } from '../lib/logger.js';
import { getAppUtils, getTennis, getTennisEvents } from '../platform/windowBridge.js';
import { setRefreshAdminViewGlobal } from '../platform/registerGlobals.js';
import { getPref } from '../platform/prefsStorage.js';

// Admin refresh utilities - IIFEs execute at import time (same as original module-level)
import './utils/adminRefresh.js';

// TennisBackend singleton for API operations
const backend = createBackend();

// Get device ID for API calls
const getDeviceId = () => {
  return getTennis()?.deviceId || getPref('deviceId') || 'admin-device';
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
import {
  removeFromWaitlistOp,
  moveInWaitlistOp,
  clearWaitlistOp,
} from './handlers/waitlistOperations';
import { clearCourtOp, moveCourtOp, clearAllCourtsOp } from './handlers/courtOperations';
import { applyBlocksOp } from './handlers/applyBlocksOperation';

// Wet courts hook (WP5.2)
import { useWetCourts } from './wetCourts/useWetCourts';

// Domain object factories (WP5-A3, WP5-A7)
import {
  createWetCourtsModel,
  createWetCourtsActions,
  createBlockModel,
  createBlockActions,
  createBlockComponents,
  createAdminServices,
  createStatusModel,
  createStatusActions,
  createCalendarModel,
  createCalendarActions,
  createAIAssistantModel,
  createAIAssistantActions,
  createAIAssistantServices,
  createAIAssistantComponents,
} from './types/domainObjects.js';

// Admin hooks (WP-HR6)
import { useNotification } from './hooks/useNotification';
import { useAdminSettings } from './hooks/useAdminSettings';
import { useBoardSubscription } from './hooks/useBoardSubscription';

// Timer utilities (WP-HR6)
import { addTimer, clearAllTimers } from './utils/timerRegistry';

// Feature flag: use real AI assistant instead of mock
const USE_REAL_AI = true;

// No-op setters for prop compatibility with children using old hook pattern
// Defined at module level for stable identity (avoids exhaustive-deps warnings)
const setWetCourtsActive = () => {};
const setWetCourts = () => {};
const setSuspendedBlocks = () => {};

// Access shared utils from platform bridge (loaded via shared scripts in index.html)
const U = getAppUtils() || {};
const {
  STORAGE,
  readJSON,
  getEmptyData,
  TennisCourtDataStore,
  TENNIS_CONFIG: _sharedTennisConfig,
} = U;

// Shared domain modules
const Events = getTennisEvents();

// ---- Core constants (declared only; not replacing existing usages) ----

// ---- Dev flag & assert (no UI change) ----
const DEV = import.meta?.env?.DEV ?? false;
const assert = (cond, msg, obj) => {
  if (DEV && !cond) logger.warn('AdminApp', `ASSERT: ${msg}`, obj || '');
};

// Global cleanup on page unload (uses timerRegistry)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      clearAllTimers();
    } catch {
      // Intentionally ignored: cleanup on unload
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockingView, setBlockingView] = useState('create');
  const [blockToEdit, setBlockToEdit] = useState(null);
  const [calendarView, _setCalendarView] = useState('day'); // Setter unused
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedDate, _setSelectedDate] = useState(new Date()); // Setter unused

  const ENABLE_WET_COURTS = true;

  // IMPORTANT: Hook call order:
  // 1. useNotification — provides showNotification for settings hook
  // 2. useAdminSettings — settings effects (original #1/#2)
  // 3. useBoardSubscription — subscription effect (original #3)
  const { notification, showNotification } = useNotification();

  // Settings hook (WP-HR6) - owns settings, operatingHours, hoursOverrides, blockTemplates state
  // Hook also returns operatingHours and blockTemplates (not destructured here)
  const {
    settings,
    hoursOverrides,
    updateBallPrice,
    handleSettingsChanged,
    handleAISettingsChanged,
    reloadSettings,
  } = useAdminSettings({
    backend,
    showNotification,
    dataStore,
    TENNIS_CONFIG,
    clearAllTimers,
  });

  // Board subscription hook (WP-HR6) - owns courts, waitingGroups, courtBlocks, refreshTrigger state
  const { courts, waitingGroups, courtBlocks, refreshTrigger, bumpRefreshTrigger } =
    useBoardSubscription({ backend });

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
    onRefresh: bumpRefreshTrigger,
  });

  // Convert array to Set for compatibility with existing code that expects Set
  // Memoize to avoid new Set identity on each render
  const wetCourts = useMemo(() => new Set(wetCourtNumbers), [wetCourtNumbers]);

  // Export for coalescer & tests
  setRefreshAdminViewGlobal(reloadSettings);

  const handleEditBlockFromStatus = useCallback(
    (block) => {
      setBlockToEdit(block);
      setActiveTab('blocking');
      setBlockingView('create');
    },
    [setBlockToEdit, setActiveTab, setBlockingView]
  );

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

  // Court operations - delegated to handler module (useCallback for identity stability)
  const clearCourt = useCallback(
    (courtNumber) =>
      clearCourtOp({ courts, backend, showNotification, TENNIS_CONFIG }, courtNumber),
    [courts, showNotification]
  );

  const moveCourt = useCallback((from, to) => moveCourtOp({ backend }, from, to), []);

  const clearAllCourts = useCallback(
    () => clearAllCourtsOp({ courts, backend, dataStore, showNotification, TENNIS_CONFIG }),
    [courts, showNotification]
  );

  // Waitlist operations - delegated to handler module (useCallback for identity stability)
  const removeFromWaitlist = useCallback(
    (index) =>
      removeFromWaitlistOp({ waitingGroups, backend, showNotification, TENNIS_CONFIG }, index),
    [waitingGroups, showNotification]
  );

  const moveInWaitlist = useCallback(
    (from, to) => moveInWaitlistOp({ waitingGroups, backend, showNotification }, from, to),
    [waitingGroups, showNotification]
  );

  // Domain objects for BlockingSection (WP5-A3)
  // Note: exhaustive-deps warnings appear at function definition sites (useWetCourts hook)
  // because setters/wetCourts recreate on each render. Fix deferred per A3 rules.
  const wetCourtsModel = useMemo(
    () =>
      createWetCourtsModel({
        wetCourtsActive,
        wetCourts,
        ENABLE_WET_COURTS,
      }),
    [wetCourtsActive, wetCourts, ENABLE_WET_COURTS]
  );

  const wetCourtsActions = useMemo(
    () =>
      createWetCourtsActions({
        setWetCourtsActive,
        setWetCourts,
        handleEmergencyWetCourt,
        deactivateWetCourts,
        onClearWetCourt: clearWetCourt,
        // Note: setSuspendedBlocks not in WetCourtsActions per A1 typedef
      }),
    [handleEmergencyWetCourt, deactivateWetCourts, clearWetCourt]
    // setWetCourtsActive, setWetCourts are module-level stable no-ops
  );

  const blockModel = useMemo(
    () =>
      createBlockModel({
        courts,
        courtBlocks,
        hoursOverrides,
        initialEditingBlock: blockToEdit,
        suspendedBlocks,
      }),
    [courts, courtBlocks, hoursOverrides, blockToEdit, suspendedBlocks]
  );

  const blockActions = useMemo(
    () =>
      createBlockActions({
        // Inline applyBlocks to capture courts/backend/showNotification at memoization time
        onApplyBlocks: (blocks) =>
          applyBlocksOp({ courts, backend, showNotification, TENNIS_CONFIG }, blocks),
        onEditingBlockConsumed: () => setBlockToEdit(null),
        setSuspendedBlocks,
        onNotification: showNotification,
      }),
    [courts, setBlockToEdit, showNotification] // backend, TENNIS_CONFIG, setSuspendedBlocks are module-level
  );

  // Get Tennis reference for consistent semantics with other call sites
  const tennis = getTennis();

  // Module-level imports (VisualTimeEntry etc.) are stable; tennis tracked in deps
  const blockComponents = useMemo(
    () =>
      createBlockComponents({
        VisualTimeEntry,
        MiniCalendar,
        EventCalendarEnhanced,
        MonthView,
        EventSummary,
        HoverCard,
        QuickActionsMenu,
        Tennis: tennis,
      }),
    [tennis]
  );

  // backend is module-level singleton
  const adminServices = useMemo(() => createAdminServices({ backend }), []);

  // StatusSection domain objects (WP5-A7)
  const statusModel = useMemo(
    () =>
      createStatusModel({
        courts,
        courtBlocks,
        selectedDate,
        currentTime,
        waitingGroups,
      }),
    [courts, courtBlocks, selectedDate, currentTime, waitingGroups]
  );

  const statusActions = useMemo(
    () =>
      createStatusActions({
        clearCourt,
        moveCourt,
        clearAllCourts,
        handleEditBlockFromStatus,
        moveInWaitlist,
        removeFromWaitlist,
      }),
    [
      clearCourt,
      moveCourt,
      clearAllCourts,
      handleEditBlockFromStatus,
      moveInWaitlist,
      removeFromWaitlist,
    ]
  );

  // CalendarSection domain objects (WP5-A9.3)
  const calendarModel = useMemo(
    () =>
      createCalendarModel({
        courts,
        currentTime,
        hoursOverrides,
        calendarView,
        refreshTrigger,
      }),
    [courts, currentTime, hoursOverrides, calendarView, refreshTrigger]
  );

  const calendarActions = useMemo(
    () => createCalendarActions({ onRefresh: bumpRefreshTrigger }),
    [bumpRefreshTrigger]
  );

  // AIAssistantSection domain objects (WP5-A11.3)
  const aiModel = useMemo(
    () =>
      createAIAssistantModel({
        activeTab,
        showAIAssistant,
        USE_REAL_AI,
        courts,
        settings,
        waitingGroups,
      }),
    [activeTab, showAIAssistant, courts, settings, waitingGroups]
    // USE_REAL_AI is module-level constant, excluded per exhaustive-deps
  );

  const aiActions = useMemo(
    () =>
      createAIAssistantActions({
        setShowAIAssistant,
        onAISettingsChanged: handleAISettingsChanged,
        loadData: reloadSettings,
        clearCourt,
        clearAllCourts,
        moveCourt,
        updateBallPrice,
        // Inline refreshData to avoid dependency on handleRefreshData which recreates each render
        refreshData: () => {
          reloadSettings();
          bumpRefreshTrigger();
        },
      }),
    [
      setShowAIAssistant,
      handleAISettingsChanged,
      reloadSettings,
      clearCourt,
      clearAllCourts,
      moveCourt,
      updateBallPrice,
      bumpRefreshTrigger,
    ]
  );

  const aiServices = useMemo(
    () =>
      createAIAssistantServices({
        backend,
        dataStore,
      }),
    []
    // backend, dataStore are module-level singletons
  );

  const aiComponents = useMemo(
    () =>
      createAIAssistantComponents({
        AIAssistant,
        MockAIAdmin,
      }),
    []
    // AIAssistant, MockAIAdmin are module-level imports
  );

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
              statusModel={statusModel}
              statusActions={statusActions}
              wetCourtsModel={wetCourtsModel}
              wetCourtsActions={wetCourtsActions}
              services={adminServices}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarSection
              calendarModel={calendarModel}
              calendarActions={calendarActions}
              services={adminServices}
              components={blockComponents}
            />
          )}
          {activeTab === 'blocking' && (
            <BlockingSection
              blockingView={blockingView}
              wetCourtsModel={wetCourtsModel}
              wetCourtsActions={wetCourtsActions}
              blockModel={blockModel}
              blockActions={blockActions}
              components={blockComponents}
              services={adminServices}
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
        aiModel={aiModel}
        aiActions={aiActions}
        services={aiServices}
        components={aiComponents}
        clearWaitlist={() => clearWaitlistOp(backend)}
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
