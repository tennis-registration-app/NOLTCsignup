import type { CommandResponse, DomainCourt, DomainWaitlistEntry } from '../../types/appTypes';
type AnyFn = (...args: unknown[]) => unknown;
/**
 * useAdminAppState
 *
 * All useState, custom hooks, useEffect side-effects, and controller assembly
 * for the admin panel. Module-level singletons and no-op setters are defined
 * at file scope for stable identity.
 *
 * Receives context hooks (showNotification, confirm) as params because
 * they come from React context providers above AdminPanel.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBackend } from '../../lib/backend/index';
import { logger } from '../../lib/logger';
import { legacyEvents as Events } from '../../platform/attachLegacyEvents';
import { setRefreshAdminViewGlobal } from '../../platform/registerGlobals';

// Admin refresh utilities - IIFEs execute at import time (same as original module-level)
import '../utils/adminRefresh';

// TennisBackend singleton for API operations
const backend = createBackend();

// Shared device ID utility
import { getDeviceId } from '../utils/getDeviceId';

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

// Board normalization (shared between applyBoardResponse consumers)
import { normalizeBoard } from '../../lib/normalize/index';

// Extracted callbacks hook (replaces 8 inline useCallbacks)
import { useAdminHandlers } from './useAdminHandlers';

// Wet courts hook
import { useWetCourts } from '../wetCourts/useWetCourts';

// Admin controller (replaces 14 inline useMemo domain object calls)
import { buildAdminController } from '../controller/buildAdminController';

// Admin hooks
import { useAdminSettings } from './useAdminSettings';
import { useBoardSubscription } from './useBoardSubscription';

// Timer utilities
import { addTimer, clearAllTimers } from '../utils/timerRegistry';

// Feature flags
import { featureFlags } from '../../config/runtimeConfig';

// ESM canonical imports (replacing window.APP_UTILS reads)
import { readDataSafe } from '../../lib/storage';
import { TennisCourtDataStore } from '../../lib/TennisCourtDataStore';
import { TENNIS_CONFIG } from '../../lib/config';

// ---- Dev flag & assert (no UI change) ----
const DEV = import.meta?.env?.DEV ?? false;
const assert = (cond: boolean, msg: string, obj?: unknown) => {
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
export function useAdminAppState({ showNotification, confirm }: { showNotification: (message: string, type: string) => void; confirm: (message: string) => Promise<boolean> }) {
  const [activeTab, setActiveTab] = useState('status');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockingView, setBlockingView] = useState('create');
  const [blockToEdit, setBlockToEdit] = useState<unknown>(null);
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
  const {
    courts,
    waitingGroups,
    courtBlocks,
    refreshTrigger,
    bumpRefreshTrigger,
    refreshBoard,
    applyBoardUpdate,
  } = useBoardSubscription({ backend });

  // Board-in-response helper — normalize raw API board and apply to state.
  // Single definition shared by useWetCourts and useAdminHandlers.
  const applyBoardResponse = useCallback(
    (apiResponse: CommandResponse & { board?: unknown }) => {
      if (!apiResponse?.board) {
        refreshBoard?.();
        return;
      }
      try {
        const normalized = normalizeBoard(apiResponse.board);
        applyBoardUpdate(normalized);
      } catch (error) {
        console.error('Failed to normalize board response:', error);
        refreshBoard?.();
      }
    },
    [applyBoardUpdate, refreshBoard]
  );

  // Wet courts hook - manages state + backend ops + side effects
  const {
    isActive: wetCourtsActive,
    wetCourtNumbers,
    suspendedBlocks,
    activateWet: handleEmergencyWetCourt,
    deactivateWet: deactivateWetCourts,
    clearWetCourt,
    clearAllWet: clearAllWetCourts,
  } = useWetCourts({
    backend,
    getDeviceId,
    courts,
    Events,
    onRefresh: bumpRefreshTrigger,
    applyBoardResponse,
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
    courts: courts as DomainCourt[],
    waitingGroups: waitingGroups as DomainWaitlistEntry[],
    showNotification,
    confirm,
    setBlockToEdit,
    setActiveTab,
    setBlockingView,
    reloadSettings,
    bumpRefreshTrigger,
    refreshBoard,
    applyBoardResponse,
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
        courts: courts as DomainCourt[],
        courtBlocks: courtBlocks as object[],
        waitingGroups: waitingGroups as DomainWaitlistEntry[],
        hoursOverrides,
        blockToEdit: blockToEdit as object | null,
        suspendedBlocks: suspendedBlocks as object[],
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
          clearCourt: clearCourt as AnyFn,
          moveCourt: moveCourt as AnyFn,
          clearAllCourts: clearAllCourts as AnyFn,
          clearWetCourt: clearWetCourt as AnyFn,
          clearAllWetCourts: clearAllWetCourts as AnyFn,
          removeFromWaitlist: removeFromWaitlist as AnyFn,
          moveInWaitlist: moveInWaitlist as AnyFn,
          handleEditBlockFromStatus: handleEditBlockFromStatus as AnyFn,
          handleEmergencyWetCourt: handleEmergencyWetCourt as AnyFn,
          deactivateWetCourts: deactivateWetCourts as AnyFn,
          applyBlocks: applyBlocks as AnyFn,
          onEditingBlockConsumed: (() => setBlockToEdit(null)) as AnyFn,
          showNotification: showNotification as AnyFn,
          setShowAIAssistant,
          handleAISettingsChanged: handleAISettingsChanged as AnyFn,
          reloadSettings: reloadSettings as AnyFn,
          updateBallPrice: updateBallPrice as AnyFn,
          refreshData: refreshData as AnyFn,
          bumpRefreshTrigger: bumpRefreshTrigger as AnyFn,
        },
        components: {
          VisualTimeEntry: VisualTimeEntry as React.ComponentType<unknown>,
          MiniCalendar: MiniCalendar as React.ComponentType<unknown>,
          EventCalendarEnhanced: EventCalendarEnhanced as React.ComponentType<unknown>,
          MonthView: MonthView as React.ComponentType<unknown>,
          EventSummary: EventSummary as React.ComponentType<unknown>,
          HoverCard: HoverCard as React.ComponentType<unknown>,
          QuickActionsMenu: QuickActionsMenu as React.ComponentType<unknown>,
          AIAssistant: AIAssistant as React.ComponentType<unknown>,
          AIAssistantAdmin: AIAssistantAdmin as React.ComponentType<unknown>,
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
      clearAllWetCourts,
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
    waitlist,
    calendar,
    ai,
    services: adminServices,
  } = controller;

  return {
    // Controller sections (already destructured)
    wetCourtsController,
    blocks,
    status,
    waitlist,
    calendar,
    ai,
    adminServices,

    // Direct state for JSX
    activeTab,
    setActiveTab,
    blockingView,
    setBlockingView,

    // From hooks (used directly in JSX)
    handleSettingsChanged,

    // Module singleton (JSX uses directly)
    backend,
  };
}
