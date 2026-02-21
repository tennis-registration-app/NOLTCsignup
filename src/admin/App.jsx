/**
 * Admin Panel - Main App Component
 *
 * Extracted from Admin.html's inline React code.
 * This is the initial monolithic extraction (~7,100 lines).
 * Future phases will break this into smaller component files.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBackend } from '../lib/backend/index.js';
import { logger } from '../lib/logger.js';
import { legacyEvents as Events } from '../platform/attachLegacyEvents.js';
import { setRefreshAdminViewGlobal } from '../platform/registerGlobals.js';
import { NotificationProvider, useAdminNotification } from './context/NotificationContext.jsx';
import { ConfirmProvider, useAdminConfirm } from './context/ConfirmContext.jsx';

// Admin refresh utilities - IIFEs execute at import time (same as original module-level)
import './utils/adminRefresh.js';

// TennisBackend singleton for API operations
const backend = createBackend();

// Shared device ID utility
import { getDeviceId } from './utils/getDeviceId.js';

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
import { AIAssistantAdmin, AIAssistant } from './ai';

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

// Wet courts hook
import { useWetCourts } from './wetCourts/useWetCourts';

// Admin controller (replaces 14 inline useMemo domain object calls)
import { buildAdminController } from './controller/buildAdminController.js';

// Admin hooks
import { useAdminSettings } from './hooks/useAdminSettings';
import { useBoardSubscription } from './hooks/useBoardSubscription';

// Timer utilities
import { addTimer, clearAllTimers } from './utils/timerRegistry';

// Feature flags
import { featureFlags } from '../config/runtimeConfig.js';

// No-op setters for prop compatibility with children using old hook pattern
// Defined at module level for stable identity (avoids exhaustive-deps warnings)
const setWetCourtsActive = () => {};
const setWetCourts = () => {};
const setSuspendedBlocks = () => {};

// ESM canonical imports (replacing window.APP_UTILS reads)
import { readDataSafe } from '../lib/storage.js';
import { TennisCourtDataStore } from '../lib/TennisCourtDataStore.js';
import { TENNIS_CONFIG } from '../lib/config.js';

// Shared domain modules — Events imported directly from attachLegacyEvents.js

// ---- Core constants (declared only; not replacing existing usages) ----

// ---- Dev flag & assert (no UI change) ----
const DEV = import.meta?.env?.DEV ?? false;
const assert = (cond, msg, obj) => {
  if (DEV && !cond) logger.warn('AdminApp', `ASSERT: ${msg}`, obj || '');
};

// ============================================================
// Section: Admin actions (assign, clear, block scheduling)
// ============================================================

// Boot data assertion
const _bootData = readDataSafe();
assert(
  !_bootData || Array.isArray(_bootData?.courts),
  'Expected data.courts array on boot',
  _bootData
);

// Initialize DataStore using the shared class
const dataStore = new TennisCourtDataStore();

// Main Admin Panel Component
const AdminPanelV2 = ({ onExit }) => {
  // AdminPanelV2 component initializing

  const [activeTab, setActiveTab] = useState('status');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockingView, setBlockingView] = useState('create');
  const [blockToEdit, setBlockToEdit] = useState(null);
  const [calendarView] = useState('day');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedDate] = useState(new Date());

  const ENABLE_WET_COURTS = true;

  // IMPORTANT: Hook call order:
  // 1. useAdminNotification — provides showNotification (via NotificationProvider)
  // 2. useAdminSettings — settings effects (original #1/#2)
  // 3. useBoardSubscription — subscription effect (original #3)
  const showNotification = useAdminNotification();
  const confirm = useAdminConfirm();

  // Settings hook - owns settings, operatingHours, hoursOverrides, blockTemplates state
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

  // Board subscription hook - owns courts, waitingGroups, courtBlocks, refreshTrigger state
  const { courts, waitingGroups, courtBlocks, refreshTrigger, bumpRefreshTrigger } =
    useBoardSubscription({ backend });

  // Wet courts hook - manages state + backend ops + side effects
  const {
    isActive: wetCourtsActive,
    wetCourtNumbers,
    suspendedBlocks,
    activateWet: handleEmergencyWetCourt,
    deactivateWet: deactivateWetCourts,
    clearWetCourt,
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

  // Clean up all timers on page unload
  useEffect(() => {
    const onUnload = () => {
      try {
        clearAllTimers();
      } catch {
        // Intentionally ignored: cleanup on unload
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  // Court operations - delegated to handler module (useCallback for identity stability)
  const clearCourt = useCallback(
    (courtNumber) =>
      clearCourtOp({ courts, backend, showNotification, TENNIS_CONFIG }, courtNumber),
    [courts, showNotification]
  );

  const moveCourt = useCallback((from, to) => moveCourtOp({ backend }, from, to), []);

  const clearAllCourts = useCallback(
    () =>
      clearAllCourtsOp({ courts, backend, dataStore, showNotification, confirm, TENNIS_CONFIG }),
    [courts, showNotification, confirm]
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

  // Block apply closure (captures React state for handler module)
  const applyBlocks = useCallback(
    (blocks) => applyBlocksOp({ courts, backend, showNotification, TENNIS_CONFIG }, blocks),
    [courts, showNotification]
    // backend, TENNIS_CONFIG are module-level
  );

  // Refresh data closure (settings + board refresh combined)
  const refreshData = useCallback(() => {
    reloadSettings();
    bumpRefreshTrigger();
  }, [reloadSettings, bumpRefreshTrigger]);

  // Build all domain objects via controller (replaces 14 inline useMemo calls)
  const controller = useMemo(
    () =>
      buildAdminController({
        backend,
        dataStore,
        courts,
        courtBlocks,
        waitingGroups,
        hoursOverrides,
        blockToEdit,
        suspendedBlocks,
        wetCourtsActive,
        wetCourts,
        ENABLE_WET_COURTS,
        selectedDate,
        currentTime,
        calendarView,
        refreshTrigger,
        activeTab,
        showAIAssistant,
        USE_REAL_AI: featureFlags.USE_REAL_AI,
        settings,
        actions: {
          // No-op setters for prop compatibility with children
          setWetCourtsActive,
          setWetCourts,
          setSuspendedBlocks,
          // State-capturing callbacks
          clearCourt,
          moveCourt,
          clearAllCourts,
          clearWetCourt,
          removeFromWaitlist,
          moveInWaitlist,
          handleEditBlockFromStatus,
          handleEmergencyWetCourt,
          deactivateWetCourts,
          applyBlocks,
          onEditingBlockConsumed: () => setBlockToEdit(null),
          showNotification,
          setShowAIAssistant,
          handleAISettingsChanged,
          reloadSettings,
          updateBallPrice,
          refreshData,
          bumpRefreshTrigger,
        },
        components: {
          VisualTimeEntry,
          MiniCalendar,
          EventCalendarEnhanced,
          MonthView,
          EventSummary,
          HoverCard,
          QuickActionsMenu,
          AIAssistant,
          AIAssistantAdmin,
        },
      }),
    [
      courts,
      courtBlocks,
      waitingGroups,
      hoursOverrides,
      blockToEdit,
      suspendedBlocks,
      wetCourtsActive,
      wetCourts,
      ENABLE_WET_COURTS,
      selectedDate,
      currentTime,
      calendarView,
      refreshTrigger,
      activeTab,
      showAIAssistant,
      settings,
      clearCourt,
      moveCourt,
      clearAllCourts,
      clearWetCourt,
      removeFromWaitlist,
      moveInWaitlist,
      handleEditBlockFromStatus,
      handleEmergencyWetCourt,
      deactivateWetCourts,
      applyBlocks,
      setBlockToEdit,
      showNotification,
      setShowAIAssistant,
      handleAISettingsChanged,
      reloadSettings,
      updateBallPrice,
      refreshData,
      bumpRefreshTrigger,
    ]
    // backend, dataStore, featureFlags, TENNIS_CONFIG, component imports are module-level stable
  );

  // Destructure controller (wetCourtsController avoids shadowing the wetCourts Set)
  const {
    wetCourts: wetCourtsController,
    blocks,
    status,
    calendar,
    ai,
    services: adminServices,
  } = controller;

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

      {/* Notification banner is rendered by NotificationProvider */}

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm -mt-px">
          {activeTab === 'status' && (
            <StatusSection
              statusModel={status.model}
              statusActions={status.actions}
              wetCourtsModel={wetCourtsController.model}
              wetCourtsActions={wetCourtsController.actions}
              services={adminServices}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarSection
              calendarModel={calendar.model}
              calendarActions={calendar.actions}
              services={adminServices}
              components={blocks.components}
            />
          )}
          {activeTab === 'blocking' && (
            <BlockingSection
              blockingView={blockingView}
              wetCourtsModel={wetCourtsController.model}
              wetCourtsActions={wetCourtsController.actions}
              blockModel={blocks.model}
              blockActions={blocks.actions}
              components={blocks.components}
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
        aiModel={ai.model}
        aiActions={ai.actions}
        services={ai.services}
        components={ai.components}
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
    return (
      <NotificationProvider>
        <ConfirmProvider>
          <AdminPanelV2 onExit={() => setView('menu')} />
        </ConfirmProvider>
      </NotificationProvider>
    );
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
