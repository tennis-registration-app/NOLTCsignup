/**
 * Admin Panel - Main App Component
 *
 * Extracted from Admin.html's inline React code.
 * This is the initial monolithic extraction (~7,100 lines).
 * Future phases will break this into smaller component files.
 */
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { createBackend } from '../registration/backend/index.js';
import { normalizeWaitlist } from '../lib/normalizeWaitlist.js';

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
  Calendar2,
  CalendarDays,
  Clock,
  Users,
  GraduationCap,
  Settings,
  Copy,
  Trash2,
  Save,
  X,
  Plus,
  Edit,
  Edit2,
  Edit3,
  Download,
  RefreshCw,
  Move,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Grid,
  Grid3X3,
  List,
  Filter,
  MoreHorizontal,
  BarChart,
  FileText,
  TrendingUp,
  Activity,
  Play,
  Pause,
  Square,
  Eye,
  EyeOff,
  Wrench,
  Droplets,
  TennisBall,
  Court,
  Trophy,
  Star,
  Bot,
  MessageCircle,
  greyFilter,
  // UI Components
  HoverCard,
  QuickActionsMenu,
  EditGameModal,
} from './components';

// Calendar components
import {
  EventCalendarEnhanced,
  getEventColor,
  getEventEmoji,
  getEventTypeFromReason,
} from './calendar';

// Block management components
import {
  BlockTemplateManager,
  RecurrenceConfig,
  EditBlockModal,
  BlockTimeline,
  CompleteBlockManagerEnhanced,
} from './blocks';

// Court management components
import { CourtStatusGrid } from './courts';

// Analytics components
import {
  UsageHeatmap,
  UtilizationChart,
  WaitTimeAnalysis,
  BallPurchaseLog,
  GuestChargeLog,
} from './analytics';

// AI components
import { MockAIAdmin } from './ai';

// Screen components
import { GameHistorySearch, AnalyticsDashboard } from './screens';

// Access shared utils from window (loaded via shared scripts in index.html)
const U = window.APP_UTILS || {};
const {
  STORAGE,
  EVENTS,
  readJSON,
  writeJSON,
  getEmptyData,
  readDataSafe: _sharedReadDataSafe,
  COURT_COUNT,
  TennisCourtDataStore,
  TENNIS_CONFIG: _sharedTennisConfig,
} = U;

// --- One-time guard helper (no UI change)
const _one = (key) => (window[key] ? true : ((window[key] = true), false));

// Idempotent coalescer
(function () {
  if (window.scheduleAdminRefresh) return;

  window.__adminRefreshPending = false;
  window.__adminCoalesceHits = 0; // dev-only metric

  window.scheduleAdminRefresh = function scheduleAdminRefresh() {
    if (window.__adminRefreshPending) return;
    window.__adminRefreshPending = true;

    setTimeout(() => {
      try {
        window.__adminCoalesceHits++;
        const fn = window.refreshAdminView || window.loadData || null;

        if (typeof fn === 'function') {
          fn(); // direct path
          return;
        }
        // bridge path
        window.dispatchEvent(new Event('ADMIN_REFRESH'));
      } finally {
        window.__adminRefreshPending = false;
      }
    }, 0);
  };
})();

// Idempotent wiring (window + document, just in case)
(function wireAdminListenersOnce() {
  if (window.__wiredAdminListeners) return;
  window.__wiredAdminListeners = true;

  const h = window.scheduleAdminRefresh;
  if (typeof h !== 'function') return;

  window.addEventListener('tennisDataUpdate', h, { passive: true });
  window.addEventListener('DATA_UPDATED', h, { passive: true });
  window.addEventListener('BLOCKS_UPDATED', h, { passive: true });

  // backup (some environments dispatch on document)
  document.addEventListener('tennisDataUpdate', h, { passive: true });
  document.addEventListener('DATA_UPDATED', h, { passive: true });
  document.addEventListener('BLOCKS_UPDATED', h, { passive: true });
})();

// Shared domain modules
const USE_SHARED_DOMAIN = true;
const WC = window.Tennis?.Domain?.wetCourts || window.Tennis?.Domain?.WetCourts;
const Storage = window.Tennis?.Storage;
const Events = window.Tennis?.Events;
const BL = window.Tennis?.Domain?.blocks || window.Tennis?.Domain?.Blocks;

// Local readDataSafe wraps the shared version for backward compatibility
const readDataSafe = () =>
  _sharedReadDataSafe ? _sharedReadDataSafe() : readJSON(STORAGE.DATA) || getEmptyData();

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

// ---- Debounce helper (no UI change) ----
const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

// ---- Logger (no UI change) ----
const LOG_LEVEL = DEV ? 'debug' : 'warn';
const _PREFIX = '[Admin]';
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
    } catch {}
  });
  _timers.length = 0;
};

// Global cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      clearAllTimers();
    } catch {}
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

// Utility Functions
const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const getDayOfWeek = (date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// BlockTemplateManager and RecurrenceConfig moved to ./blocks/
// CourtStatusGrid moved to ./courts/
// MockAIAdmin moved to ./ai/
// UsageHeatmap, UtilizationChart, WaitTimeAnalysis, BallPurchaseLog, GuestChargeLog moved to ./analytics/
// EditGameModal - imported from ./components
// EditBlockModal moved to ./blocks/
// Note: getEventTypeFromReason and calculateEventLayout moved to ./calendar/utils.js

const getEventIcon = (type) => {
  switch (type) {
    case 'league':
      return Trophy;
    case 'tournament':
      return Star;
    case 'clinic':
      return GraduationCap;
    default:
      return Calendar;
  }
};

// Note: getEventColor and InteractiveEvent moved to ./calendar/

// Enhanced Time Entry Component
const VisualTimeEntry = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  selectedDate = new Date(),
  selectedCourts = [],
  blockReason = '',
  timePickerMode = 'visual',
  setTimePickerMode = null,
  hideToggleButton = false,
}) => {
  const [duration, setDuration] = useState({ hours: 0, minutes: 0 });
  const [validationError, setValidationError] = useState('');
  const [lastUsedDuration, setLastUsedDuration] = useState(null);

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const isPast =
          isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinutes));

        slots.push({
          hour,
          minute,
          label: `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`,
          value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          isPast,
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (startTime && endTime && startTime !== 'now') {
      const start = new Date();
      const end = new Date();
      const [startHours, startMinutes] = startTime.split(':');
      const [endHours, endMinutes] = endTime.split(':');

      start.setHours(parseInt(startHours), parseInt(startMinutes), 0);
      end.setHours(parseInt(endHours), parseInt(endMinutes), 0);

      if (end < start) {
        end.setDate(end.getDate() + 1);
      }

      const diffMs = end - start;
      const diffMinutes = Math.floor(diffMs / 60000);

      setDuration({
        hours: Math.floor(diffMinutes / 60),
        minutes: diffMinutes % 60,
      });

      if (diffMinutes <= 0) {
        setValidationError('End time must be after start time');
      } else if (diffMinutes > 720) {
        setValidationError('Block duration cannot exceed 12 hours');
      } else {
        setValidationError('');
      }
    } else if (startTime === 'now' && endTime) {
      const now = new Date();
      const end = new Date();
      const [endHours, endMinutes] = endTime.split(':');
      end.setHours(parseInt(endHours), parseInt(endMinutes), 0);

      if (end < now) {
        end.setDate(end.getDate() + 1);
      }

      const diffMs = end - now;
      const diffMinutes = Math.floor(diffMs / 60000);

      setDuration({
        hours: Math.floor(diffMinutes / 60),
        minutes: diffMinutes % 60,
      });

      if (diffMinutes <= 0) {
        setValidationError('End time must be in the future');
      } else {
        setValidationError('');
      }
    }
  }, [startTime, endTime]);

  const durationPresets = [
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '2 hours', minutes: 120 },
    { label: '4 hours', minutes: 240 },
  ];

  const applyPresetDuration = (minutes) => {
    let baseTime = new Date();

    if (startTime !== 'now' && startTime) {
      const [hours, mins] = startTime.split(':');
      baseTime.setHours(parseInt(hours), parseInt(mins), 0);
    }

    const endDate = new Date(baseTime.getTime() + minutes * 60000);
    const endTimeString = endDate.toTimeString().slice(0, 5);
    onEndTimeChange(endTimeString);
  };

  const handleSlotClick = (slot, isStart) => {
    if (slot.isPast && isStart) return;

    if (isStart) {
      onStartTimeChange(slot.value);
      if (!endTime) {
        const [hours, minutes] = slot.value.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        date.setMinutes(date.getMinutes() + 120);
        onEndTimeChange(date.toTimeString().slice(0, 5));
      }
    } else {
      onEndTimeChange(slot.value);
    }
  };

  const isSlotSelected = (slot, isStart) => {
    if (isStart) {
      return startTime === slot.value;
    } else {
      return endTime === slot.value;
    }
  };

  const isSlotInRange = (slot) => {
    if (!startTime || !endTime || startTime === 'now') return false;

    const slotTime = new Date();
    slotTime.setHours(slot.hour, slot.minute, 0);

    const start = new Date();
    const [startHours, startMinutes] = startTime.split(':');
    start.setHours(parseInt(startHours), parseInt(startMinutes), 0);

    const end = new Date();
    const [endHours, endMinutes] = endTime.split(':');
    end.setHours(parseInt(endHours), parseInt(endMinutes), 0);

    return slotTime > start && slotTime < end;
  };

  return (
    <div className="space-y-4">
      {startTime && endTime && (
        <div className={`p-3 rounded-lg ${validationError ? 'bg-red-50' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className={validationError ? 'text-red-600' : 'text-blue-600'} />
              <span className={`font-medium ${validationError ? 'text-red-700' : 'text-blue-700'}`}>
                {validationError
                  ? validationError
                  : `Duration: ${duration.hours}h ${duration.minutes}m`}
              </span>
            </div>
            {validationError && <AlertCircle size={16} className="text-red-600" />}
          </div>
        </div>
      )}

      {!hideToggleButton && setTimePickerMode && (
        <div className="flex items-center">
          <button
            onClick={() => setTimePickerMode(timePickerMode === 'visual' ? 'manual' : 'visual')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {timePickerMode === 'visual' ? 'Switch to manual input' : 'Switch to visual picker'}
          </button>
        </div>
      )}

      {timePickerMode === 'visual' ? (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Start Time</label>
                {selectedDate.toDateString() === new Date().toDateString() && (
                  <button
                    onClick={() => onStartTimeChange('now')}
                    className={`px-3 py-1 text-sm rounded-lg transition-all ${
                      startTime === 'now'
                        ? 'bg-blue-600 text-white'
                        : selectedCourts.length > 0 && blockReason
                          ? 'bg-blue-50 hover:bg-blue-100 border border-blue-300 shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Start Now
                  </button>
                )}
              </div>
              {setTimePickerMode && (
                <button
                  onClick={() =>
                    setTimePickerMode(timePickerMode === 'visual' ? 'manual' : 'visual')
                  }
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {timePickerMode === 'visual'
                    ? 'Switch to manual input'
                    : 'Switch to visual picker'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  onClick={() => handleSlotClick(slot, true)}
                  disabled={slot.isPast}
                  className={`py-2 px-3 text-sm rounded-lg transition-colors ${
                    isSlotSelected(slot, true)
                      ? 'bg-blue-600 text-white'
                      : slot.isPast
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {startTime && (
            <div>
              <label className="block text-sm font-medium mb-2">Quick Duration</label>
              <div className="grid grid-cols-4 gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      applyPresetDuration(preset.minutes);
                      setLastUsedDuration(preset.minutes);
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all shadow-sm border ${
                      lastUsedDuration === preset.minutes
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-300 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">End Time</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {timeSlots.map((slot) => {
                const isDisabled = startTime && startTime !== 'now' && slot.value <= startTime;
                return (
                  <button
                    key={slot.value}
                    onClick={() => handleSlotClick(slot, false)}
                    disabled={isDisabled}
                    className={`py-2 px-3 text-sm rounded-lg transition-colors ${
                      isSlotSelected(slot, false)
                        ? 'bg-blue-600 text-white'
                        : isSlotInRange(slot)
                          ? 'bg-blue-100 text-blue-700'
                          : isDisabled
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <div className="flex gap-2">
              {selectedDate.toDateString() === new Date().toDateString() && (
                <button
                  onClick={() => onStartTimeChange('now')}
                  className={`px-3 py-2 rounded-lg font-medium transition-all shadow-sm border ${
                    startTime === 'now'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                      : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-300 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  Now
                </button>
              )}
              <input
                type="time"
                value={startTime === 'now' ? '' : startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationError ? 'border-red-300 focus:ring-red-500' : 'focus:ring-blue-500'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const MiniCalendar = ({ selectedDate, onDateSelect, minDate = new Date() }) => {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const changeMonth = (increment) => {
    const newMonth = new Date(viewMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setViewMonth(newMonth);
  };

  const days = getDaysInMonth(viewMonth);
  const monthYear = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft size={16} />
        </button>
        <h3 className="font-medium text-sm">{monthYear}</h3>
        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="text-center text-xs text-gray-500 font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} />;
          }

          const isPast = isPastDate(date);
          const isDateToday = isToday(date);
          const isDateSelected = isSelected(date);

          return (
            <button
              key={index}
              onClick={() => !isPast && onDateSelect(date)}
              disabled={isPast}
              className={`
                      aspect-square flex items-center justify-center text-sm rounded
                      ${isDateSelected ? 'bg-blue-600 text-white font-medium' : ''}
                      ${isDateToday && !isDateSelected ? 'bg-blue-100 text-blue-600 font-medium' : ''}
                      ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                      ${!isDateSelected && !isDateToday && !isPast ? 'hover:bg-gray-100' : ''}
                    `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Day View Component with collision detection
const DayView = memo(
  ({
    selectedDate,
    events,
    currentTime,
    onEventClick,
    onEventHover,
    onEventLeave,
    onQuickAction,
  }) => {
    const { eventsWithLayout, hours, showCurrentTime } = useMemo(() => {
      const isToday = selectedDate.toDateString() === currentTime.toDateString();
      const hoursArray = Array.from({ length: 15 }, (_, i) => i + 7);

      // Filter events for this day
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === selectedDate.toDateString();
      });

      // Calculate layout for collision detection
      const layout = calculateEventLayout(dayEvents);

      const positions = dayEvents.map((event) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
        const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;

        const layoutInfo = layout.get(
          event.id || `${event.startTime}-${event.courtNumbers?.[0]}`
        ) || {
          column: 0,
          totalColumns: 1,
        };

        return {
          ...event,
          top: (startHour - 7) * 60,
          height: (endHour - startHour) * 60,
          startHour,
          endHour,
          column: layoutInfo.column,
          totalColumns: layoutInfo.totalColumns,
          hasConflict:
            layoutInfo.totalColumns > 1 &&
            layoutInfo.group.some(
              (otherEvent) =>
                otherEvent !== event &&
                event.courtNumbers?.some((court) => otherEvent.courtNumbers?.includes(court))
            ),
        };
      });

      return {
        eventsWithLayout: positions,
        hours: hoursArray,
        showCurrentTime: isToday,
      };
    }, [selectedDate, events, currentTime]);

    return (
      <div className="flex h-full">
        {/* Time column */}
        <div className="w-20 flex-shrink-0 relative" style={{ height: `${hours.length * 60}px` }}>
          {hours.map((hour, idx) => (
            <div
              key={hour}
              className="absolute right-2 text-sm text-gray-500"
              style={{ top: `${idx * 60 - 8}px` }}
            >
              {hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`}
            </div>
          ))}
        </div>

        {/* Event column */}
        <div
          className="flex-1 bg-white relative border-l border-gray-300"
          style={{ height: `${hours.length * 60}px` }}
        >
          {/* Hour blocks with grid lines */}
          {hours.map((hour, idx) => (
            <div
              key={hour}
              className="absolute w-full h-[60px] border-t border-gray-200"
              style={{ top: `${idx * 60}px` }}
            >
              {/* Half-hour line */}
              <div className="absolute w-full h-px bg-gray-100" style={{ top: '30px' }} />
            </div>
          ))}

          {/* Current time indicator */}
          {showCurrentTime && (
            <div
              className="absolute left-0 right-0 border-t-2 border-red-500 z-10"
              style={{
                top: `${(currentTime.getHours() + currentTime.getMinutes() / 60 - 7) * 60}px`,
              }}
            >
              <div className="absolute -top-2 left-0 bg-red-500 text-white text-xs px-1 rounded">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* Events with collision handling */}
          {eventsWithLayout.map((event, idx) => {
            const width = `calc(${100 / event.totalColumns}% - 16px)`;
            const left = `calc(${(100 / event.totalColumns) * event.column}% + 8px)`;

            return (
              <InteractiveEvent
                key={idx}
                event={event}
                className={`absolute p-3 rounded-lg shadow-md ${getEventColor(event)} border-2 group hover:z-10 hover:shadow-lg transition-shadow`}
                style={{
                  top: `${event.top}px`,
                  height: `${event.height}px`,
                  minHeight: '60px',
                  left: left,
                  width: width,
                }}
                onEventClick={onEventClick}
                onEventHover={onEventHover}
                onEventLeave={onEventLeave}
                onQuickAction={onQuickAction}
                isWeekView={false}
              />
            );
          })}
        </div>
      </div>
    );
  }
);

// Note: DayViewEnhanced moved to ./calendar/DayViewEnhanced.jsx

// Month View Component with memoization
const MonthView = memo(({ selectedDate, events, currentTime, onEventClick }) => {
  const { start, end, calendarDays, eventsByDate } = useMemo(() => {
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    ).getDate();

    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i));
    }

    // Group events by date
    const evtsByDate = {};
    events.forEach((event) => {
      const dateKey = new Date(event.startTime).toDateString();
      if (!evtsByDate[dateKey]) {
        evtsByDate[dateKey] = [];
      }
      evtsByDate[dateKey].push(event);
    });

    return {
      start: firstDay,
      end: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999),
      calendarDays: days,
      eventsByDate: evtsByDate,
    };
  }, [selectedDate, events]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 mt-px">
        {calendarDays.map((date, index) => {
          const isToday = date && date.toDateString() === currentTime.toDateString();
          const dateEvents = date ? eventsByDate[date.toDateString()] || [] : [];

          return (
            <div
              key={index}
              className={`bg-white p-2 min-h-[100px] ${
                !date ? 'bg-gray-50' : ''
              } ${isToday ? 'bg-blue-50' : ''}`}
            >
              {date && (
                <>
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dateEvents.slice(0, 2).map((event, idx) => {
                      const Icon = getEventIcon(event.eventDetails?.type);
                      return (
                        <div
                          key={idx}
                          onClick={() => onEventClick(event)}
                          className={`text-xs p-1 rounded flex items-center gap-1 cursor-pointer hover:opacity-80 ${getEventColor(event)}`}
                        >
                          <Icon size={10} />
                          <span className="truncate">
                            {event.eventDetails?.title || event.reason}
                          </span>
                        </div>
                      );
                    })}
                    {dateEvents.length > 2 && (
                      <div className="text-xs text-gray-500">+{dateEvents.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Event Summary Component
const EventSummary = memo(({ events, currentTime, onEventClick }) => {
  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => new Date(event.startTime) > currentTime)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 3);
  }, [events, currentTime]);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-medium text-gray-700 mb-2">Upcoming Events</h3>
      <div className="space-y-2">
        {upcomingEvents.map((event) => {
          const Icon = getEventIcon(event.eventDetails?.type);
          return (
            <div
              key={event.id}
              onClick={() => onEventClick(event)}
              className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-100 p-2 -m-2 rounded transition-colors"
            >
              <Icon size={16} className="text-gray-600" />
              <div className="flex-1">
                <span className="font-medium">{event.eventDetails?.title || event.reason}</span>
                <span className="text-gray-500 ml-2">Courts {event.courtNumbers.join(', ')}</span>
              </div>
              <span className="text-gray-500">
                {new Date(event.startTime).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Note: WeekView moved to ./calendar/WeekView.jsx
// Note: EventCalendarEnhanced moved to ./calendar/EventCalendarEnhanced.jsx
// Note: Local MonthView and EventSummary are still here (not yet extracted)

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
  const [blockTemplates, setBlockTemplates] = useState([]);
  const [settings, setSettings] = useState({});
  const [notification, setNotification] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wetCourtsActive, setWetCourtsActive] = useState(false);
  const [wetCourts, setWetCourts] = useState(new Set());
  const [suspendedBlocks, setSuspendedBlocks] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [blockingView, setBlockingView] = useState('create');
  const [courtBlocks, setCourtBlocks] = useState([]);
  const [calendarView, setCalendarView] = useState('day');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
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
    // Switch to Court Blocking tab and edit mode
    setActiveTab('blocking');
    setBlockingView('create');

    // TODO: Pass the block to CompleteBlockManagerEnhanced
    setTimeout(() => {
      console.log('Edit block:', block);
      // You'll need to implement passing this to CompleteBlockManagerEnhanced
    }, 100);
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

      // Load court data
      const courtData = await dataStore.get(TENNIS_CONFIG.STORAGE.KEY);
      if (courtData) {
        setCourts(courtData.courts || []);
        // Normalize waitlist using shared helper
        setWaitingGroups(normalizeWaitlist(courtData.waitingGroups));
      }

      // courtBlocks now derived from API via TennisBackend subscription
      // No localStorage load needed

      // Load templates
      const templates = await dataStore.get(TENNIS_CONFIG.STORAGE.BLOCK_TEMPLATES_KEY);
      if (templates) {
        setBlockTemplates(templates);
      }

      // Load settings
      const settingsData = await dataStore.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY);
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      onNotification('Failed to load data', 'error');
    }
  }, []);

  window.refreshAdminView = loadData; // export for coalescer & tests

  // Event-driven refresh bridge listener
  React.useEffect(() => {
    const onAdminRefresh = () => {
      loadData();
    };
    window.addEventListener('ADMIN_REFRESH', onAdminRefresh);
    return () => window.removeEventListener('ADMIN_REFRESH', onAdminRefresh);
  }, []);

  // Save data to localStorage
  const saveData = useCallback(
    async (newCourts, newWaitingGroups) => {
      try {
        const key = TENNIS_CONFIG.STORAGE.KEY;
        const prev = Tennis.Storage?.readDataSafe
          ? Tennis.Storage.readDataSafe()
          : JSON.parse(localStorage.getItem(key) || 'null') || {};
        const next = {
          courts: newCourts || courts,
          waitingGroups: newWaitingGroups || waitingGroups,
          recentlyCleared: [],
        };
        const merged = window.APP_UTILS.preservePromotions(prev, next);

        await dataStore.set(key, merged, { immediate: true });
        window.dispatchEvent(new Event(TENNIS_CONFIG.STORAGE.UPDATE_EVENT));

        showNotification('Changes saved successfully', 'success');
      } catch (error) {
        console.error('Failed to save data:', error);
        showNotification('Failed to save changes', 'error');
      }
    },
    [courts, waitingGroups]
  );

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
        } catch {}
        try {
          window.removeEventListener('storage', handleStorageEvent);
        } catch {}
      },
      { once: true }
    );

    return () => {
      try {
        window.removeEventListener('storage', handleStorageEvent);
      } catch {}
    };
  }, [loadData]);

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
            courtNumber: c.number,
            reason: c.block.reason,
            startTime: c.block?.startsAt || c.block?.startTime || new Date().toISOString(),
            endTime: c.block?.endsAt || c.block?.endTime,
          }));

        setCourtBlocks(apiBlocks);
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
      } catch {}
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

  // Template operations
  const saveTemplate = async (template) => {
    const newTemplates = [...blockTemplates, template];
    setBlockTemplates(newTemplates);
    await dataStore.set(TENNIS_CONFIG.STORAGE.BLOCK_TEMPLATES_KEY, newTemplates, {
      immediate: true,
    });
    onNotification('Template saved', 'success');
  };

  const deleteTemplate = async (id) => {
    const newTemplates = blockTemplates.filter((t) => t.id !== id);
    setBlockTemplates(newTemplates);
    await dataStore.set(TENNIS_CONFIG.STORAGE.BLOCK_TEMPLATES_KEY, newTemplates, {
      immediate: true,
    });
    onNotification('Template deleted', 'success');
  };

  const applyTemplate = (template) => {
    const now = new Date();
    const [hours, minutes] = now.toTimeString().split(':');

    applyBlocks([
      {
        date: now.toISOString().split('T')[0],
        time: `${hours}:${minutes}`,
        duration: template.duration,
        courts: template.courts,
        reason: template.reason,
      },
    ]);
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

  const moveInWaitlist = (from, to) => {
    const newWaitingGroups = [...waitingGroups];
    const [group] = newWaitingGroups.splice(from, 1);
    newWaitingGroups.splice(to, 0, group);
    saveData(courts, newWaitingGroups);
  };

  // Settings operations
  const updateBallPrice = async (price) => {
    const newSettings = { ...settings, tennisBallPrice: parseFloat(price) };
    setSettings(newSettings);
    await dataStore.set(TENNIS_CONFIG.STORAGE.SETTINGS_KEY, newSettings, { immediate: true });
    onNotification('Ball price updated', 'success');
  };

  const updateWeekdayGuestFee = async (fee) => {
    const newSettings = {
      ...settings,
      guestFees: {
        ...(settings.guestFees || {}),
        weekday: parseFloat(fee),
      },
    };
    setSettings(newSettings);
    await dataStore.set(TENNIS_CONFIG.STORAGE.SETTINGS_KEY, newSettings, { immediate: true });
    onNotification('Weekday guest fee updated', 'success');
  };

  const updateWeekendGuestFee = async (fee) => {
    const newSettings = {
      ...settings,
      guestFees: {
        ...(settings.guestFees || {}),
        weekend: parseFloat(fee),
      },
    };
    setSettings(newSettings);
    await dataStore.set(TENNIS_CONFIG.STORAGE.SETTINGS_KEY, newSettings, { immediate: true });
    onNotification('Weekend guest fee updated', 'success');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <EventCalendarEnhanced
              courts={courts}
              currentTime={currentTime}
              refreshTrigger={refreshTrigger}
              defaultView={calendarView}
              disableEventClick={true}
              MonthView={MonthView}
              EventSummary={EventSummary}
              HoverCard={HoverCard}
              QuickActionsMenu={QuickActionsMenu}
              Tennis={window.Tennis}
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
              <AnalyticsDashboard onClose={null} />
            ) : (
              <div className="p-8 text-center">
                <h3 className="text-lg font-semibold text-gray-600">Analytics Dashboard</h3>
                <p className="text-gray-500 mt-2">Analytics component not available</p>
              </div>
            ))}
          {activeTab === 'history' && <GameHistorySearch />}
          {activeTab === 'system' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">System Settings</h3>

              <div className="space-y-6">
                {/* Tennis Ball Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tennis Ball Price
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.tennisBallPrice || TENNIS_CONFIG.PRICING.TENNIS_BALLS}
                      onChange={(e) => updateBallPrice(e.target.value)}
                      className="w-32 p-2 border rounded"
                    />
                  </div>
                </div>

                {/* Guest Fees Section */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-800 mb-4">Guest Fees</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weekday Guest Fee */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weekday Guest Fee (Mon-Fri)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.guestFees?.weekday || 15.0}
                          onChange={(e) => updateWeekdayGuestFee(e.target.value)}
                          className="w-32 p-2 border rounded"
                        />
                      </div>
                    </div>

                    {/* Weekend Guest Fee */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weekend Guest Fee (Sat-Sun)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.guestFees?.weekend || 20.0}
                          onChange={(e) => updateWeekendGuestFee(e.target.value)}
                          className="w-32 p-2 border rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Button and Modal */}
      {(activeTab === 'status' || activeTab === 'blocking' || activeTab === 'calendar') && (
        <>
          {/* Floating AI Assistant Button */}
          <div className="fixed bottom-8 right-8 z-40">
            <button
              onClick={() => setShowAIAssistant(true)}
              className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all transform hover:scale-110"
              title="AI Assistant - Use natural language commands"
            >
              <MessageCircle size={24} />
            </button>
          </div>

          {/* AI Assistant Modal */}
          {showAIAssistant && (
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
          )}
        </>
      )}
    </div>
  );
};

// Utility Functions
const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatHour = (hour) => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
};

// Note: getEventEmoji moved to ./calendar/utils.js

const downloadCSV = (data, filename) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      })
      .join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
};

// Export the main App component (renamed from TestMenu)
export default function App() {
  const [view, setView] = useState('menu');

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6">Tennis Admin Test</h1>

          <div className="space-y-4">
            <button
              onClick={() => setView('admin')}
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Open Admin Panel
            </button>

            <button
              onClick={() => setView('analytics')}
              className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Open Analytics
            </button>
          </div>
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <p className="text-sm text-gray-600">
              Status: {dataStore?.cache?.has('tennisClubData') ? '✓ Data Loaded' : '✗ No Data'}
            </p>
            <div className="mt-2 text-xs text-blue-600">
              📊 DataStore: {dataStore?.getMetrics?.().cacheHitRate || 0}% cache hit rate |{' '}
              {dataStore?.getMetrics?.().totalOperations || 0} ops
            </div>
          </div>
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
    return <AnalyticsDashboard onClose={() => setView('menu')} />;
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
