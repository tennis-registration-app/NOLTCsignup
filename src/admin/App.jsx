/**
 * Admin Panel - Main App Component
 *
 * Extracted from Admin.html's inline React code.
 * This is the initial monolithic extraction (~7,100 lines).
 * Future phases will break this into smaller component files.
 */
/* global Tennis */
import React, { useState, useEffect, useMemo } from 'react';
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

// Domain object factories (WP5-A3)
import {
  createWetCourtsModel,
  createWetCourtsActions,
  createBlockModel,
  createBlockActions,
  createBlockComponents,
  createAdminServices,
} from './types/domainObjects.js';

// Admin hooks (WP-HR6)
import { useNotification } from './hooks/useNotification';
import { useAdminSettings } from './hooks/useAdminSettings';
import { useBoardSubscription } from './hooks/useBoardSubscription';

// Timer utilities (WP-HR6)
import { addTimer, clearAllTimers } from './utils/timerRegistry';

// Feature flag: use real AI assistant instead of mock
const USE_REAL_AI = true;

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
  const wetCourts = new Set(wetCourtNumbers);

  // No-op setters for prop compatibility with children using old hook pattern
  // State is now managed by useWetCourts hook
  const setWetCourtsActive = () => {};
  const setWetCourts = () => {};
  const setSuspendedBlocks = () => {};

  // Export for coalescer & tests
  setRefreshAdminViewGlobal(reloadSettings);

  const handleEditBlockFromStatus = (block) => {
    setBlockToEdit(block);
    setActiveTab('blocking');
    setBlockingView('create');
  };

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

  // Block operations - delegated to handler module
  const applyBlocks = (blocks) =>
    applyBlocksOp({ courts, backend, showNotification, TENNIS_CONFIG }, blocks);

  // Waitlist operations - delegated to handler module
  const removeFromWaitlist = (index) =>
    removeFromWaitlistOp({ waitingGroups, backend, showNotification, TENNIS_CONFIG }, index);

  const moveInWaitlist = (from, to) =>
    moveInWaitlistOp({ waitingGroups, backend, showNotification }, from, to);

  // Callback for MockAIAdmin to refresh data
  const handleRefreshData = () => {
    reloadSettings();
    bumpRefreshTrigger();
  };

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
        setSuspendedBlocks,
      }),
    [setWetCourtsActive, setWetCourts, setSuspendedBlocks]
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
        onApplyBlocks: applyBlocks,
        onEditingBlockConsumed: () => setBlockToEdit(null),
        setSuspendedBlocks,
        onNotification: showNotification,
      }),
    [applyBlocks, setBlockToEdit, setSuspendedBlocks, showNotification]
  );

  // Module-level imports (VisualTimeEntry etc.) and getTennis are stable
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
        Tennis: getTennis(),
      }),
    [
      VisualTimeEntry,
      MiniCalendar,
      EventCalendarEnhanced,
      MonthView,
      EventSummary,
      HoverCard,
      QuickActionsMenu,
      getTennis,
    ]
  );

  // backend is module-level singleton
  const adminServices = useMemo(() => createAdminServices({ backend }), [backend]);

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
              onRefresh={bumpRefreshTrigger}
              calendarView={calendarView}
              backend={backend}
              hoursOverrides={hoursOverrides}
              MonthView={MonthView}
              EventSummary={EventSummary}
              HoverCard={HoverCard}
              QuickActionsMenu={QuickActionsMenu}
              Tennis={getTennis()}
              EventCalendarEnhanced={EventCalendarEnhanced}
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
        loadData={reloadSettings}
        clearCourt={clearCourt}
        clearAllCourts={clearAllCourts}
        moveCourt={moveCourt}
        settings={settings}
        updateBallPrice={updateBallPrice}
        waitingGroups={waitingGroups}
        refreshData={handleRefreshData}
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
