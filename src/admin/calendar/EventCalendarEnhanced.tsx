/**
 * EventCalendarEnhanced Component
 *
 * Main calendar component with day/week/month views and event management.
 * Coordinates all calendar views and handles event interactions.
 * Fetches block data from API via TennisBackend.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CalendarToolbar from './CalendarToolbar';
import DayViewEnhanced from './DayViewEnhanced';
import WeekView from './WeekView';
import EventDetailsModal from './EventDetailsModal';
import { getEventTypeFromReason } from './utils';
import type { CalendarEvent } from './utils';
import type { HoursOverride } from './DayViewEnhanced';
import { logger } from '../../lib/logger';
import { normalizeCalendarBlock } from '../../lib/normalize/index';
import { useAdminNotification } from '../context/NotificationContext';
import { useAdminConfirm } from '../context/ConfirmContext';
import {
  buildCalendarEvents,
  filterCalendarEvents,
  formatCalendarHeader,
} from '../presenters/eventCalendarPresenter';

interface CalendarAdminBackend {
  admin: {
    getBlocks: (params: Record<string, unknown>) => Promise<{ ok: boolean; message?: string; blocks?: Record<string, unknown>[] }>;
    cancelBlock: (params: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
    cancelBlockGroup: (params: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
    updateBlock?: (params: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
    createBlock?: (params: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
  };
}

interface CalendarCourt {
  id?: string;
  court_number?: number;
  courtNumber?: number;
}

interface EventCalendarEnhancedProps {
  courts: CalendarCourt[];
  currentTime: Date;
  refreshTrigger?: unknown;
  onRefresh: () => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDuplicateEvent: (event: CalendarEvent) => void;
  defaultView?: string;
  disableEventClick?: boolean;
  backend?: CalendarAdminBackend | null;
  hoursOverrides?: HoursOverride[];
  MonthView?: React.ComponentType<any>;
  EventSummary?: React.ComponentType<any>;
  HoverCard?: React.ComponentType<any>;
  QuickActionsMenu?: React.ComponentType<any>;
}

const EventCalendarEnhanced: React.FC<EventCalendarEnhancedProps> = ({
  courts,
  currentTime,
  refreshTrigger,
  onRefresh,
  onEditEvent: _onEditEvent,
  onDuplicateEvent,
  defaultView = 'day',
  disableEventClick = false,
  backend,
  hoursOverrides = [],
  // These components are passed from parent until they are extracted
  MonthView,
  EventSummary: _EventSummary,
  HoverCard,
  QuickActionsMenu,
}) => {
  const showNotification = useAdminNotification();
  const confirmDialog = useAdminConfirm();
  const [viewMode, setViewMode] = useState(defaultView);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [quickActionEvent, setQuickActionEvent] = useState<CalendarEvent | null>(null);
  const [quickActionPosition, setQuickActionPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // API-sourced block state
  const [blocks, setBlocks] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setViewMode(defaultView);
  }, [defaultView]);

  // Fetch blocks from API when date range or view changes
  useEffect(() => {
    const fetchBlocks = async () => {
      if (!backend) {
        logger.warn('AdminCalendar', 'No backend provided, cannot fetch blocks');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Calculate date range based on viewMode
        // Fetch a broader range to allow smooth navigation
        let fromDate, toDate;

        if (viewMode === 'month') {
          // For month view: fetch 1 month before and 2 months after
          fromDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
          toDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 3, 0);
        } else if (viewMode === 'week') {
          // For week view: fetch 2 weeks before and 4 weeks after
          fromDate = new Date(selectedDate);
          fromDate.setDate(fromDate.getDate() - 14);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date(selectedDate);
          toDate.setDate(toDate.getDate() + 28);
          toDate.setHours(23, 59, 59, 999);
        } else {
          // Day view: fetch 7 days before and 14 days after
          fromDate = new Date(selectedDate);
          fromDate.setDate(fromDate.getDate() - 7);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date(selectedDate);
          toDate.setDate(toDate.getDate() + 14);
          toDate.setHours(23, 59, 59, 999);
        }

        const result = await backend.admin.getBlocks({
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
        });

        if (result.ok) {
          // Transform API response to calendar event format
          // Normalize at ingestion, then use camelCase
          const transformedBlocks: CalendarEvent[] = (result.blocks ?? []).map((b): CalendarEvent => {
            const normalized = normalizeCalendarBlock(b);

            return {
              id: normalized.id,
              courtId: normalized.courtId,
              courtNumber: normalized.courtNumber,
              courtNumbers: ([normalized.courtNumber]).filter((x: unknown): x is number => x != null).map(Number), // Calendar expects array
              title: normalized.title,
              startTime: normalized.startsAt || "",
              endTime: normalized.endsAt || "",
              reason: normalized.blockType,
              blockType: normalized.blockType,
              eventType: normalized.blockType ? getEventTypeFromReason(normalized.blockType) : null,
              isRecurring: normalized.isRecurring,
              recurrenceRule: normalized.recurrenceRule,
              recurrenceGroupId: normalized.recurrenceGroupId,
              isBlock: true,
              isEvent:
                normalized.blockType === 'event' ||
                normalized.blockType === 'clinic' ||
                normalized.blockType === 'lesson',
              isWetCourt:
                normalized.blockType === 'wet' || normalized.title?.toLowerCase().includes('wet'),
            };
          });
          setBlocks(transformedBlocks);
        } else {
          logger.error('AdminCalendar', 'API error', result.message);
          setError(result.message || 'Failed to fetch blocks');
        }
      } catch (err) {
        logger.error('AdminCalendar', 'Fetch error', err);
        setError('Failed to fetch blocks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocks();
  }, [backend, viewMode, selectedDate, refreshTrigger]);

  // Memoized event extraction and processing
  const events = useMemo(
    () => buildCalendarEvents({ blocks, courts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshTrigger intentionally forces re-compute on external events (block creation/deletion)
    [blocks, courts, refreshTrigger]
  );

  // Memoized filtered events based on view and date range
  const filteredEvents = useMemo(
    () => filterCalendarEvents({ events, viewMode, selectedDate }),
    [events, viewMode, selectedDate]
  );

  // Event handlers
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (!disableEventClick) {
        setSelectedEvent(event);
      }
      setHoveredEvent(null);
    },
    [disableEventClick]
  );

  const handleEventHover = useCallback(
    (event: CalendarEvent, element: Element | null) => {
      if (!quickActionEvent && element) {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const cardWidth = 320; // HoverCard width (w-80 = 20rem = 320px)

        // Calculate optimal position
        let leftPosition;

        // Try positioning to the right first
        if (rect.right + 10 + cardWidth <= viewportWidth) {
          leftPosition = rect.right + 10;
        }
        // If right doesn't fit, try left
        else if (rect.left - cardWidth - 10 >= 0) {
          leftPosition = rect.left - cardWidth - 10;
        }
        // If neither fits well, center it with some margin
        else {
          leftPosition = Math.max(
            10,
            Math.min(viewportWidth - cardWidth - 10, rect.left + rect.width / 2 - cardWidth / 2)
          );
        }

        setHoveredEvent(event);
        setHoverPosition({
          top: rect.top + rect.height / 2,
          left: leftPosition,
        });
      }
    },
    [quickActionEvent]
  );

  const handleEventLeave = useCallback(() => {
    setHoveredEvent(null);
  }, []);

  const handleQuickAction = useCallback((event: CalendarEvent, position: { top: number; left: number }) => {
    setQuickActionEvent(event);
    setQuickActionPosition(position);
    setHoveredEvent(null);
  }, []);

  const handleEdit = useCallback(
    (event: CalendarEvent) => {
      // Find the block in our API-sourced data to get full details
      const blockToEdit = blocks.find((block) => {
        if (event.id && block.id) {
          return block.id === event.id;
        }
        return block.title === event.title && block.startTime === event.startTime;
      });

      // Open EventDetailsModal with the block (it has built-in edit mode)
      setSelectedEvent(blockToEdit || event);
      setQuickActionEvent(null);
    },
    [blocks]
  );

  const handleDelete = useCallback(
    async (event: CalendarEvent) => {
      if (!backend) {
        logger.error('AdminCalendar', 'No backend available for delete');
        return;
      }

      try {
        const groupId = event.recurrenceGroupId;

        if (groupId) {
          // Series block: offer choices via sequential confirms
          if (
            await confirmDialog(
              'This block is part of a recurring series.\n\nDelete ALL blocks in this series?'
            )
          ) {
            const result = await backend.admin.cancelBlockGroup({
              recurrenceGroupId: groupId,
              futureOnly: false,
            });
            if (result.ok) {
              setSelectedEvent(null);
              onRefresh();
            } else {
              showNotification(`Failed to delete series: ${result.message}`, 'error');
            }
            return;
          }
          if (await confirmDialog('Delete only FUTURE blocks in this series?')) {
            const result = await backend.admin.cancelBlockGroup({
              recurrenceGroupId: groupId,
              futureOnly: true,
            });
            if (result.ok) {
              setSelectedEvent(null);
              onRefresh();
            } else {
              showNotification(`Failed to delete future blocks: ${result.message}`, 'error');
            }
            return;
          }
          if (!(await confirmDialog('Delete just this single block?'))) {
            return;
          }
        }

        // Single block delete (or user chose "just this block")
        const result = await backend.admin.cancelBlock({
          blockId: event.id,
        });

        if (result.ok) {
          logger.debug('AdminCalendar', 'Block deleted successfully');
          setSelectedEvent(null);
          onRefresh();
        } else {
          logger.error('AdminCalendar', 'Failed to delete block', result.message);
          showNotification(`Failed to delete block: ${result.message}`, 'error');
        }
      } catch (error) {
        logger.error('AdminCalendar', 'Error deleting block', error);
        showNotification('Error deleting block. Please try again.', 'error');
      }
    },
    [backend, onRefresh]
  );

  const handleDuplicate = useCallback(
    (event: CalendarEvent) => {
      logger.debug('AdminCalendar', 'Duplicate event', event);
      setSelectedEvent(null); // Close modal
      onDuplicateEvent(event); // Let parent handle the duplication
    },
    [onDuplicateEvent]
  );

  // Memoized callbacks
  const navigateDate = useCallback(
    (direction: number) => {
      setSelectedDate((prevDate) => {
        const newDate = new Date(prevDate);

        if (viewMode === 'month') {
          newDate.setMonth(newDate.getMonth() + direction);
        } else if (viewMode === 'week') {
          newDate.setDate(newDate.getDate() + direction * 7);
        } else {
          newDate.setDate(newDate.getDate() + direction);
        }

        return newDate;
      });
    },
    [viewMode]
  );

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleViewModeChange = useCallback((mode: string) => {
    setViewMode(mode);
  }, []);

  // Memoized header text
  const headerText = useMemo(
    () => formatCalendarHeader({ viewMode, selectedDate }),
    [viewMode, selectedDate]
  );

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setQuickActionEvent(null);
    };

    if (quickActionEvent) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [quickActionEvent]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <CalendarToolbar
        headerText={headerText}
        viewMode={viewMode}
        onPrev={() => navigateDate(-1)}
        onNext={() => navigateDate(1)}
        onToday={handleToday}
        onViewModeChange={handleViewModeChange}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
          <p>Loading events...</p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg">
          <p className="font-medium">Error loading events</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Calendar View */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow-sm p-1">
          <div className="border-t border-gray-300">
            {viewMode === 'month' && MonthView && (
              <MonthView
                selectedDate={selectedDate}
                events={filteredEvents}
                currentTime={currentTime}
                hoursOverrides={hoursOverrides}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'week' && (
              <div className="h-[600px] overflow-auto">
                <WeekView
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  currentTime={currentTime}
                  hoursOverrides={hoursOverrides}
                  onEventClick={handleEventClick}
                  onEventHover={handleEventHover}
                  onEventLeave={handleEventLeave}
                  onQuickAction={handleQuickAction}
                />
              </div>
            )}

            {viewMode === 'day' && (
              <div className="h-[600px] overflow-auto">
                <DayViewEnhanced
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  currentTime={currentTime}
                  hoursOverrides={hoursOverrides}
                  onEventClick={handleEventClick}
                  onEventHover={handleEventHover}
                  onEventLeave={handleEventLeave}
                  onQuickAction={handleQuickAction}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* REMOVED: Upcoming Events panel
      {EventSummary && (
        <EventSummary events={events} currentTime={currentTime} onEventClick={handleEventClick} />
      )}
      */}

      {/* Hover Card */}
      {hoveredEvent && !quickActionEvent && HoverCard && (
        <HoverCard
          event={hoveredEvent}
          position={hoverPosition}
          onClose={() => setHoveredEvent(null)}
        />
      )}

      {/* Quick Actions Menu */}
      {quickActionEvent && QuickActionsMenu && (
        <QuickActionsMenu
          event={quickActionEvent}
          position={quickActionPosition}
          onClose={() => setQuickActionEvent(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Event Details Modal (unified view/edit) */}
      {selectedEvent && !disableEventClick && (
        <EventDetailsModal
          event={selectedEvent}
          courts={courts.map((court, idx) => ({
            id: court?.id || `court-${idx + 1}`,
            courtNumber: idx + 1,
          }))}
          backend={backend}
          onClose={() => setSelectedEvent(null)}
          onSaved={() => {
            setSelectedEvent(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default EventCalendarEnhanced;
