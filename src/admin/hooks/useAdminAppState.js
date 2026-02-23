/**
 * useAdminAppState
 *
 * Extracted from AdminPanelV2 in App.jsx — all useState, custom hooks,
 * useEffect side-effects, and controller assembly. Bodies are verbatim;
 * dependency arrays match the original closures.
 *
 * Module-level singletons and no-op setters defined at file scope for
 * stable identity (same pattern as original App.jsx).
 *
 * Receives context hooks (showNotification, confirm) as params because
 * they come from React context providers above AdminPanelV2.
 */
import { useState, useEffect, useMemo } from 'react';
import { createBackend } from '../../lib/backend/index.js';
import { logger } from '../../lib/logger.js';
import { legacyEvents as Events } from '../../platform/attachLegacyEvents.js';
import { setRefreshAdminViewGlobal } from '../../platform/registerGlobals.js';

// Admin refresh utilities - IIFEs execute at import time (same as original module-level)
import '../utils/adminRefresh.js';

// TennisBackend singleton for API operations
const backend = createBackend();

// Shared device ID utility
import { getDeviceId } from '../utils/getDeviceId.js';

// Import extracted components
import {
  // UI Components
  HoverCard,
  QuickActionsMenu,
  VisualTimeEntry,
} from '../components';

// Calendar components
import { EventCalendarEnhanced } from '../calendar';

// AI components
import { AIAssistantAdmin, AIAssistant } from '../ai';

// Direct component imports (not from barrel to avoid circular deps)
import { MiniCalendar } from '../components/MiniCalendar';
import { MonthView } from '../components/MonthView';
import { EventSummary } from '../components/EventSummary';

// Extracted callbacks hook (replaces 8 inline useCallbacks)
import { useAdminHandlers } from './useAdminHandlers';

// Wet courts hook
import { useWetCourts } from '../wetCourts/useWetCourts';

// Admin controller (replaces 14 inline useMemo domain object calls)
import { buildAdminController } from '../controller/buildAdminController.js';

// Admin hooks
import { useAdminSettings } from './useAdminSettings';
import { useBoardSubscription } from './useBoardSubscription';

// Timer utilities
import { addTimer, clearAllTimers } from '../utils/timerRegistry';

// Feature flags
import { featureFlags } from '../../config/runtimeConfig.js';

// ESM canonical imports (replacing window.APP_UTILS reads)
import { readDataSafe } from '../../lib/storage.js';
import { TennisCourtDataStore } from '../../lib/TennisCourtDataStore.js';
import { TENNIS_CONFIG } from '../../lib/config.js';

// ---- Dev flag & assert (no UI change) ----
const DEV = import.meta?.env?.DEV ?? false;
const assert = (cond, msg, obj) => {
  if (DEV && !cond) logger.warn('AdminApp', `ASSERT: ${msg}`, obj || '');
};

// Boot data assertion
const _bootData = readDataSafe();
assert(
  !_bootData || Array.isArray(_bootData?.courts),
  'Expected data.courts array on boot',
  _bootData
);

// Initialize DataStore using the shared class
const dataStore = new TennisCourtDataStore();

/**
 * @param {Object} deps
 * @param {Function} deps.showNotification - From useAdminNotification context
 * @param {Function} deps.confirm - From useAdminConfirm context
 */
export function useAdminAppState({ showNotification, confirm }) {
  const [activeTab, setActiveTab] = useState('status');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockingView, setBlockingView] = useState('create');
  const [blockToEdit, setBlockToEdit] = useState(null);
  const [calendarView] = useState('day');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedDate] = useState(new Date());

  const ENABLE_WET_COURTS = true;

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

  // Extracted callbacks (court ops, waitlist ops, block apply, refresh, edit-block nav)
  const {
    handleEditBlockFromStatus,
    clearCourt,
    moveCourt,
    clearAllCourts,
    removeFromWaitlist,
    moveInWaitlist,
    applyBlocks,
    refreshData,
  } = useAdminHandlers({
    backend,
    dataStore,
    TENNIS_CONFIG,
    courts,
    waitingGroups,
    showNotification,
    confirm,
    setBlockToEdit,
    setActiveTab,
    setBlockingView,
    reloadSettings,
    bumpRefreshTrigger,
  });

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

  return {
    // Controller sections (already destructured)
    wetCourtsController,
    blocks,
    status,
    calendar,
    ai,
    adminServices,

    // Direct state for JSX
    activeTab,
    setActiveTab,
    blockingView,
    setBlockingView,
    showAIAssistant,
    setShowAIAssistant,

    // From hooks (used directly in JSX)
    waitingGroups,
    moveInWaitlist,
    removeFromWaitlist,
    handleSettingsChanged,

    // Module singleton (JSX uses directly)
    backend,
  };
}
