/**
 * Admin Panel - Main App Component
 *
 * Extracted from Admin.html's inline React code.
 * This is the initial monolithic extraction (~7,100 lines).
 * Future phases will break this into smaller component files.
 */
/* global Tennis */
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { createBackend } from '../registration/backend/index.js';
import { normalizeWaitlist } from '../lib/normalizeWaitlist.js';

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
  // Icons
  Calendar,
  Clock,
  GraduationCap,
  Settings,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid,
  BarChart,
  FileText,
  Trophy,
  Star,
  greyFilter,
  // UI Components
  HoverCard,
  QuickActionsMenu,
  VisualTimeEntry,
} from './components';

// Calendar components
import { EventCalendarEnhanced, getEventColor } from './calendar';

// Block management components
import { CompleteBlockManagerEnhanced } from './blocks';

// Court management components
import { CourtStatusGrid } from './courts';

// Analytics components (re-exported via ./screens/AnalyticsDashboard)

// AI components
import { MockAIAdmin, AIAssistant } from './ai';

// Screen components
import { GameHistorySearch, AnalyticsDashboard, SystemSettings } from './screens';

// Utilities
import { getEventIcon } from './utils/eventIcons';

// Direct component imports (not from barrel to avoid circular deps)
import { MiniCalendar } from './components/MiniCalendar';
import { MonthView } from './components/MonthView';
import { EventSummary } from './components/EventSummary';

// Tab section components
import { CalendarSection } from './tabs/CalendarSection';
import { HistorySection } from './tabs/HistorySection';

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

// Note: scheduleAdminRefresh and wireAdminListenersOnce IIFEs moved to ./utils/adminRefresh.js
// They execute at import time (same timing as original module-level IIFEs)

// Shared domain modules
const Events = window.Tennis?.Events;

// ---- Core constants (declared only; not replacing existing usages) ----

// ---- Dev flag & assert (no UI change) ----
const DEV = typeof location !== 'undefined' && /localhost|127\.0\.0\.1/.test(location.host);
const assert = (cond, msg, obj) => {
  if (DEV && !cond) console.warn('ASSERT:', msg, obj || '');
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
// REMOVED: local TENNIS_CONFIG (~21 lines)
// The shared config includes all properties (COURTS, TIMING, STORAGE, PRICING, etc.)
const TENNIS_CONFIG = _sharedTennisConfig;

// BlockTemplateManager and RecurrenceConfig moved to ./blocks/
// CourtStatusGrid moved to ./courts/
// MockAIAdmin moved to ./ai/
// UsageHeatmap, UtilizationChart, WaitTimeAnalysis, BallPurchaseLog, GuestChargeLog moved to ./analytics/
// EditGameModal - imported from ./components
// EditBlockModal moved to ./blocks/
// Note: getEventTypeFromReason and calculateEventLayout moved to ./calendar/utils.js
// Note: getEventIcon moved to ./utils/eventIcons.js
// Note: getEventColor and InteractiveEvent moved to ./calendar/
// Note: VisualTimeEntry moved to ./components/VisualTimeEntry.jsx
// Note: MiniCalendar moved to ./components/MiniCalendar.jsx
// Note: DayViewEnhanced moved to ./calendar/DayViewEnhanced.jsx
// Note: MonthView moved to ./components/MonthView.jsx
// Note: EventSummary moved to ./components/EventSummary.jsx
// Note: WeekView moved to ./calendar/WeekView.jsx
// Note: EventCalendarEnhanced moved to ./calendar/EventCalendarEnhanced.jsx

// HoverCard, QuickActionsMenu - imported from ./components
// Note: EventDetailsModal moved to ./calendar/EventDetailsModal.jsx

// BlockTimeline, ConflictDetector and CompleteBlockManagerEnhanced moved to ./blocks/
// GameHistorySearch and AnalyticsDashboard moved to ./screens/

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
  const [wetCourtsActive, setWetCourtsActive] = useState(false);
  const [wetCourts, setWetCourts] = useState(new Set());
  const [suspendedBlocks, setSuspendedBlocks] = useState([]);
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

  const handleEmergencyWetCourt = async () => {
    console.log('🌧️ Emergency wet court activated - calling API');

    try {
      const result = await backend.admin.markWetCourts({
        deviceId: getDeviceId(),
        durationMinutes: 720, // 12 hours
        reason: 'WET COURT',
        idempotencyKey: `wet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      if (result.ok) {
        console.log(`✅ Marked ${result.courtsMarked} courts as wet until ${result.endsAt}`);

        // Update local state
        const allCourts = new Set(result.courtNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        setWetCourts(allCourts);
        setWetCourtsActive(true);

        // Notify legacy components
        Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: Array.from(allCourts) });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error('Failed to mark wet courts:', result.message);
      }
    } catch (error) {
      console.error('Error creating wet court blocks:', error);
    }
  };

  const handleEditBlockFromStatus = (block) => {
    setBlockToEdit(block);
    setActiveTab('blocking');
    setBlockingView('create');
  };

  const removeAllWetCourtBlocks = async () => {
    if (!ENABLE_WET_COURTS) return;

    console.log('🧹 Clearing all wet court blocks via API');

    try {
      const result = await backend.admin.clearWetCourts({
        deviceId: getDeviceId(),
      });

      if (result.ok) {
        console.log(`✅ Cleared ${result.blocksCleared} wet court blocks`);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error('Failed to clear wet courts:', result.message);
      }
    } catch (error) {
      console.error('Error removing wet court blocks:', error);
    }
  };

  const clearWetCourt = async (courtNumber) => {
    console.log(`☀️ Clearing wet court ${courtNumber} via API`);

    // Get court ID from courts state
    const court = courts?.find((c) => c.number === courtNumber);
    if (!court?.id) {
      console.warn(`Court ${courtNumber} not found in board state`);
      return;
    }

    try {
      const result = await backend.admin.clearWetCourts({
        deviceId: getDeviceId(),
        courtIds: [court.id],
      });

      if (result.ok) {
        console.log(`✅ Cleared wet court ${courtNumber}`);

        // Update local state
        const newWetCourts = new Set(wetCourts);
        newWetCourts.delete(courtNumber);
        setWetCourts(newWetCourts);

        // Notify legacy components
        Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: Array.from(newWetCourts) });
        setRefreshTrigger((prev) => prev + 1);

        // If all courts are dry, deactivate system
        if (newWetCourts.size === 0) {
          setWetCourtsActive(false);
          console.log('✅ All courts dry - wet court system deactivated');
        }
      } else {
        console.error('Failed to clear wet court:', result.message);
      }
    } catch (error) {
      console.error('Error removing wet court block:', error);
    }
  };

  const deactivateWetCourts = async () => {
    if (!ENABLE_WET_COURTS) return;

    console.log('🔄 Manually deactivating wet court system via API');

    try {
      await removeAllWetCourtBlocks();
      setWetCourtsActive(false);
      setWetCourts(new Set());
      setSuspendedBlocks([]);
      Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: [] });
    } catch (error) {
      console.error('Error deactivating wet courts:', error);
    }
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
      console.error('Failed to load data:', error);
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
        console.log('Cross-app storage update detected for:', e.key);
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
    console.log('[Admin] Setting up TennisBackend subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges((board) => {
      console.log(
        '[Admin] Board update received:',
        board?.serverNow,
        'courts:',
        board?.courts?.length
      );

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
          console.log('[Admin] Blocks changed, triggering calendar refresh');
        }
      }
    });

    return () => {
      console.log('[Admin] Cleaning up TennisBackend subscription');
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

  // Court operations - using TennisBackend API
  const clearCourt = async (courtNumber) => {
    try {
      // Find court UUID from courts state
      const court = courts.find((c) => c.number === courtNumber);
      if (!court) {
        throw new Error(`Court ${courtNumber} not found`);
      }

      // Check if court has a block - cancel it instead of ending session
      if (court.block && court.block.id) {
        const result = await backend.admin.cancelBlock({
          blockId: court.block.id,
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        });
        if (!result.ok) {
          throw new Error(result.message || 'Failed to cancel block');
        }
        showNotification(`Court ${courtNumber} unblocked`, 'success');
      } else if (court.session) {
        // End the session via backend
        const result = await backend.admin.adminEndSession({
          courtId: court.id,
          reason: 'admin_force_end',
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        });
        if (!result.ok) {
          throw new Error(result.message || 'Failed to clear court');
        }
        showNotification(`Court ${courtNumber} cleared`, 'success');
      } else {
        showNotification(`Court ${courtNumber} is already empty`, 'info');
      }

      // Realtime subscription will update the UI automatically
    } catch (error) {
      console.error('Error clearing court:', error);
      showNotification(error.message || 'Failed to clear court', 'error');
    }
  };

  const moveCourt = async (from, to) => {
    const f = Number(from),
      t = Number(to);

    try {
      // Get court IDs from the current board state
      const board = await backend.queries.getBoard();
      const fromCourt = board?.courts?.find((c) => c.number === f);
      const toCourt = board?.courts?.find((c) => c.number === t);

      if (!fromCourt?.id) {
        Tennis?.UI?.toast?.(`Court ${f} not found`, { type: 'error' });
        return { success: false, error: 'Source court not found' };
      }

      if (!toCourt?.id) {
        Tennis?.UI?.toast?.(`Court ${t} not found`, { type: 'error' });
        return { success: false, error: 'Destination court not found' };
      }

      const res = await backend.commands.moveCourt({
        fromCourtId: fromCourt.id,
        toCourtId: toCourt.id,
      });

      if (!res?.ok) {
        Tennis?.UI?.toast?.(res?.message || 'Failed to move court', { type: 'error' });
        return { success: false, error: res?.message };
      }

      Tennis?.UI?.toast?.(`Moved from Court ${f} to Court ${t}`, { type: 'success' });

      // Belt & suspenders: coalescer should refresh, but trigger explicit refresh too.
      window.refreshAdminView?.();

      return { success: true, from: f, to: t };
    } catch (err) {
      console.error('[moveCourt] Error:', err);
      Tennis?.UI?.toast?.(err.message || 'Failed to move court', { type: 'error' });
      return { success: false, error: err.message };
    }
  };

  const clearAllCourts = async () => {
    const confirmMessage =
      'Are you sure you want to clear ALL courts?\n\n' +
      'This will remove:\n' +
      '• All current games\n' +
      '• All court blocks\n' +
      '• All wet court statuses\n\n' +
      'This action cannot be undone!';

    if (window.confirm(confirmMessage)) {
      try {
        // Clear all sessions via backend
        const result = await backend.admin.clearAllCourts({
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
          reason: 'admin_clear_all',
        });

        if (!result.ok) {
          throw new Error(result.message || 'Failed to clear courts');
        }

        // Also cancel any active blocks
        const activeBlocks = courts.filter((c) => c.block && c.block.id);
        for (const court of activeBlocks) {
          await backend.admin.cancelBlock({
            blockId: court.block.id,
            deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
          });
        }

        // Clear localStorage blocks (for local templates)
        dataStore.set('courtBlocks', [], { immediate: true });

        showNotification(
          `All courts cleared (${result.sessionsEnded || 0} sessions ended)`,
          'success'
        );

        // Realtime subscription will update the UI
      } catch (error) {
        console.error('Error clearing all courts:', error);
        showNotification(error.message || 'Failed to clear courts', 'error');
      }
    }
  };

  // Add existingBlocks calculation
  const existingBlocks = courts
    .filter((c) => c?.blocked)
    .map((c, i) => ({
      court: i + 1,
      ...c.blocked,
    }));

  // Block operations
  const applyBlocks = async (blocks) => {
    if (!blocks || !Array.isArray(blocks)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Process all blocks and courts
    for (const block of blocks) {
      // read form values from existing variables
      const name = block.title || block.name || '';
      const reason = block.reason || '';
      const startTime = new Date(block.startTime);
      const endTime = new Date(block.endTime);
      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
      const selectedCourts = Array.isArray(block.courts) ? block.courts : [block.courtNumber];

      // validate minimally
      if (
        !name ||
        !reason ||
        !Number.isFinite(durationMinutes) ||
        durationMinutes <= 0 ||
        !Array.isArray(selectedCourts) ||
        selectedCourts.length === 0
      ) {
        alert('Please provide name, reason, positive duration, and at least one court.');
        return;
      }

      // Map reason to block type for API
      const reasonLower = reason.toLowerCase();
      let blockType = 'other';
      if (reasonLower.includes('wet') || reasonLower.includes('rain')) {
        blockType = 'wet';
      } else if (reasonLower.includes('maintenance') || reasonLower.includes('repair')) {
        blockType = 'maintenance';
      } else if (reasonLower.includes('lesson') || reasonLower.includes('class')) {
        blockType = 'lesson';
      } else if (reasonLower.includes('clinic') || reasonLower.includes('camp')) {
        blockType = 'clinic';
      }

      // Create blocks via backend API for each selected court
      for (const courtNumber of selectedCourts) {
        const court = courts.find((c) => c.number === courtNumber);
        if (!court) {
          console.error(`[Admin] Court ${courtNumber} not found`);
          failCount++;
          continue;
        }

        try {
          const result = await backend.admin.createBlock({
            courtId: court.id,
            blockType: blockType,
            title: name,
            startsAt: block.startTime,
            endsAt: block.endTime,
            deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
            deviceType: 'admin',
          });

          if (result.ok) {
            console.log('[Admin] Created block via API:', result.block);
            successCount++;
          } else {
            console.error('[Admin] Failed to create block:', result.message);
            failCount++;
          }
        } catch (error) {
          console.error('[Admin] Error creating block:', error);
          failCount++;
        }
      }
    }

    if (failCount > 0) {
      showNotification(
        `Applied ${successCount} block(s), ${failCount} failed`,
        failCount === 0 ? 'success' : 'warning'
      );
    } else {
      showNotification(`Applied ${successCount} block(s) successfully`, 'success');
    }
  };

  // Waitlist operations - using TennisBackend API
  const removeFromWaitlist = async (index) => {
    const group = waitingGroups[index];
    if (!group || !group.id) {
      showNotification('Cannot remove: group ID not found', 'error');
      return;
    }

    try {
      const result = await backend.admin.removeFromWaitlist({
        waitlistEntryId: group.id,
        reason: 'admin_removed',
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      });

      if (!result.ok) {
        throw new Error(result.message || 'Failed to remove from waitlist');
      }

      showNotification('Group removed from waitlist', 'success');
      // Realtime subscription will update the UI
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      showNotification(error.message || 'Failed to remove group', 'error');
    }
  };

  const moveInWaitlist = async (from, to) => {
    const entry = waitingGroups[from];
    if (!entry) return;

    // Convert from 0-based index to 1-based position
    const newPosition = to + 1;

    const result = await backend.admin.reorderWaitlist({
      entryId: entry.id,
      newPosition,
    });

    if (result.ok) {
      showNotification(`Moved to position ${newPosition}`, 'success');
      // Board will refresh via realtime subscription
    } else {
      showNotification(result.error || 'Failed to reorder waitlist', 'error');
    }
  };

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

  // AdminPanelV2 rendering complete
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Tab Navigation */}
      <div className="bg-gray-50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Tabs Container */}
            <div className="flex items-end gap-2 py-4">
              {/* Court Status Tab */}
              <button
                onClick={() => setActiveTab('status')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'status'
                    ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                    : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
                }`}
              >
                <span style={activeTab !== 'status' ? greyFilter : {}}>
                  {React.createElement(Grid, { size: 24 })}
                </span>
                <span>Court Status</span>
              </button>

              {/* Event Calendar Tab - No sub-tabs */}
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'calendar'
                    ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                    : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
                }`}
              >
                <span style={activeTab !== 'calendar' ? greyFilter : {}}>
                  {React.createElement(Calendar, { size: 24 })}
                </span>
                <span>Event Calendar</span>
              </button>

              {/* Court Blocking Tab */}
              <button
                onClick={() => {
                  setActiveTab('blocking');
                  setBlockingView('create');
                }}
                data-testid="admin-nav-blocks"
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'blocking'
                    ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                    : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
                }`}
              >
                <span style={activeTab !== 'blocking' ? greyFilter : {}}>
                  {React.createElement(Calendar, { size: 24 })}
                </span>
                <span>Court Blocking</span>
              </button>

              {/* Analytics Tab */}
              <button
                onClick={() => setActiveTab('analytics')}
                data-testid="admin-nav-analytics"
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'analytics'
                    ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                    : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
                }`}
              >
                <span style={activeTab !== 'analytics' ? greyFilter : {}}>
                  {React.createElement(BarChart, { size: 24 })}
                </span>
                <span>Analytics</span>
              </button>

              {/* Game History Tab */}
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                    : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
                }`}
              >
                <span style={activeTab !== 'history' ? greyFilter : {}}>
                  <FileText size={24} />
                </span>
                <span>Game History</span>
              </button>

              {/* System Tab */}
              <button
                onClick={() => setActiveTab('system')}
                data-testid="admin-nav-settings"
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                  activeTab === 'system'
                    ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                    : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
                }`}
              >
                <span style={activeTab !== 'system' ? greyFilter : {}}>
                  {React.createElement(Settings, { size: 24 })}
                </span>
                <span>System</span>
              </button>
            </div>

            {/* Exit button on the right */}
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <ChevronLeft size={20} />
              Exit Admin
            </button>
          </div>
        </div>

        {/* Sub-tabs container - Only for Court Blocking now */}
        <div
          className={`bg-gray-100 border-t border-gray-200 transition-all duration-500 ease-in-out overflow-hidden ${
            activeTab === 'blocking' ? 'max-h-20' : 'max-h-0'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 py-2">
              {/* Blocking Sub-tabs */}
              {activeTab === 'blocking' && (
                <>
                  <button
                    onClick={() => setBlockingView('create')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                      blockingView === 'create'
                        ? 'font-bold text-gray-900 bg-blue-50 border border-blue-200'
                        : 'font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    Create Blocks
                  </button>
                  <button
                    onClick={() => setBlockingView('future')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                      blockingView === 'future'
                        ? 'font-bold text-gray-900 bg-blue-50 border border-blue-200'
                        : 'font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    Blocked Time
                  </button>
                  <button
                    onClick={() => setBlockingView('list')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                      blockingView === 'list'
                        ? 'font-bold text-gray-900 bg-blue-50 border border-blue-200'
                        : 'font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    List
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom border line */}
        <div className="h-px bg-gray-200"></div>
      </div>

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
            <div className="p-6">
              <CourtStatusGrid
                courts={courts}
                courtBlocks={courtBlocks}
                selectedDate={selectedDate}
                onClearCourt={clearCourt}
                onMoveCourt={moveCourt}
                currentTime={currentTime}
                onEditBlock={handleEditBlockFromStatus}
                onEmergencyWetCourt={handleEmergencyWetCourt}
                onClearAllCourts={clearAllCourts}
                wetCourtsActive={wetCourtsActive}
                handleEmergencyWetCourt={handleEmergencyWetCourt}
                wetCourts={wetCourts}
                deactivateWetCourts={deactivateWetCourts}
                onClearWetCourt={clearWetCourt}
                onClearAllWetCourts={deactivateWetCourts}
                backend={backend}
              />

              {/* Waitlist Section */}
              <div
                className={`bg-white rounded-lg shadow-sm ${waitingGroups.length === 0 ? 'p-4' : 'p-6'}`}
              >
                {waitingGroups.length > 0 && (
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Waiting Groups ({waitingGroups.length})
                  </h3>
                )}

                {waitingGroups.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Waiting Groups (0)</h3>
                    <span className="text-sm text-gray-500">No groups waiting</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waitingGroups.map((group, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            Position {index + 1}: {(group.names || []).join(', ') || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {(group.names || []).length} player
                            {(group.names || []).length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {index > 0 && (
                            <button
                              onClick={() => moveInWaitlist(index, index - 1)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <ChevronLeft size={20} />
                            </button>
                          )}
                          {index < waitingGroups.length - 1 && (
                            <button
                              onClick={() => moveInWaitlist(index, index + 1)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <ChevronRight size={20} />
                            </button>
                          )}
                          <button
                            onClick={() => removeFromWaitlist(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
            <div className="space-y-6 p-6 ">
              {/* Sub-tab Content */}
              {blockingView === 'create' && (
                <CompleteBlockManagerEnhanced
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
                  defaultView="create"
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
                />
              )}

              {blockingView === 'future' && (
                <CompleteBlockManagerEnhanced
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
                  defaultView="calendar"
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
                />
              )}

              {blockingView === 'list' && (
                <CompleteBlockManagerEnhanced
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
                  defaultView="timeline"
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
                />
              )}
            </div>
          )}
          {activeTab === 'waitlist' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Waiting Groups ({waitingGroups.length})
              </h3>

              {waitingGroups.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No groups waiting</p>
              ) : (
                <div className="space-y-3">
                  {waitingGroups.map((group, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          Position {index + 1}: {(group.names || []).join(', ') || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(group.names || []).length} player
                          {(group.names || []).length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {index > 0 && (
                          <button
                            onClick={() => moveInWaitlist(index, index - 1)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <ChevronLeft size={20} />
                          </button>
                        )}
                        {index < waitingGroups.length - 1 && (
                          <button
                            onClick={() => moveInWaitlist(index, index + 1)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <ChevronRight size={20} />
                          </button>
                        )}
                        <button
                          onClick={() => removeFromWaitlist(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'analytics' &&
            (typeof AnalyticsDashboard !== 'undefined' ? (
              <AnalyticsDashboard onClose={null} backend={backend} />
            ) : (
              <div className="p-8 text-center">
                <h3 className="text-lg font-semibold text-gray-600">Analytics Dashboard</h3>
                <p className="text-gray-500 mt-2">Analytics component not available</p>
              </div>
            ))}
          {activeTab === 'history' && (
            <HistorySection backend={backend} GameHistorySearch={GameHistorySearch} />
          )}
        </div>
        {/* System tab - outside the white wrapper so cards have visible separation */}
        {activeTab === 'system' && (
          <SystemSettings
            backend={backend}
            onSettingsChanged={() => {
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
            }}
          />
        )}
      </div>

      {/* AI Assistant Button and Modal */}
      {(activeTab === 'calendar' ||
        activeTab === 'blocking' ||
        activeTab === 'analytics' ||
        activeTab === 'system' ||
        activeTab === 'history') && (
        <>
          {/* Floating AI Assistant Button */}
          <div className="fixed bottom-8 right-8 z-40">
            <button
              onClick={() => setShowAIAssistant(true)}
              className="bg-[#D97757] text-white p-3 rounded-full shadow-lg hover:bg-[#C4624A] transition-all transform hover:scale-110"
              title="Claude AI Assistant"
            >
              <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 0 C52 35 65 48 100 50 C65 52 52 65 50 100 C48 65 35 52 0 50 C35 48 48 35 50 0Z" />
              </svg>
            </button>
          </div>

          {/* AI Assistant Modal */}
          {showAIAssistant &&
            (USE_REAL_AI ? (
              <AIAssistant
                backend={backend}
                onClose={() => setShowAIAssistant(false)}
                onSettingsChanged={async () => {
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
                }}
              />
            ) : (
              <MockAIAdmin
                onClose={() => setShowAIAssistant(false)}
                dataStore={dataStore}
                courts={courts}
                loadData={loadData}
                clearCourt={clearCourt}
                clearAllCourts={clearAllCourts}
                moveCourt={moveCourt}
                settings={settings}
                updateBallPrice={updateBallPrice}
                waitingGroups={waitingGroups}
                refreshData={() => {
                  loadData();
                  setRefreshTrigger((prev) => prev + 1);
                }}
                clearWaitlist={async () => {
                  const res = await backend.commands.clearWaitlist();
                  return res;
                }}
              />
            ))}
        </>
      )}
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
      console.error('AdminPanelV2 render error:', error);
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
