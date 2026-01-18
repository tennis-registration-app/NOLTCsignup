/**
 * EventCalendarEnhanced Component
 *
 * Main calendar component with day/week/month views and event management.
 * Coordinates all calendar views and handles event interactions.
 * Fetches block data from API via TennisBackend.
 */
import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from '../components';
import DayViewEnhanced from './DayViewEnhanced.jsx';
import WeekView from './WeekView.jsx';
import EventDetailsModal from './EventDetailsModal.jsx';
import { getEventTypeFromReason } from './utils.js';

const EventCalendarEnhanced = ({
  courts,
  currentTime,
  refreshTrigger,
  onRefresh,
  onEditEvent,
  onDuplicateEvent,
  defaultView = 'day',
  disableEventClick = false,
  backend,
  hoursOverrides = [],
  // These components are passed from parent until they're extracted
  MonthView,
  EventSummary,
  HoverCard,
  QuickActionsMenu,
  Tennis,
}) => {
  const [viewMode, setViewMode] = useState(defaultView);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const [quickActionEvent, setQuickActionEvent] = useState(null);
  const [quickActionPosition, setQuickActionPosition] = useState({ top: 0, left: 0 });

  // API-sourced block state
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setViewMode(defaultView);
  }, [defaultView]);

  // Fetch blocks from API when date range or view changes
  useEffect(() => {
    const fetchBlocks = async () => {
      if (!backend) {
        console.warn('[EventCalendar] No backend provided, cannot fetch blocks');
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
          const transformedBlocks = result.blocks.map((b) => ({
            id: b.id,
            courtId: b.courtId,
            courtNumber: b.courtNumber,
            courtNumbers: [b.courtNumber], // Calendar expects array
            title: b.title,
            startTime: b.startsAt,
            endTime: b.endsAt,
            reason: b.blockType,
            blockType: b.blockType,
            eventType: getEventTypeFromReason(b.blockType),
            isRecurring: b.isRecurring,
            recurrenceRule: b.recurrenceRule,
            isBlock: true,
            isEvent:
              b.blockType === 'event' || b.blockType === 'clinic' || b.blockType === 'lesson',
            isWetCourt: b.blockType === 'wet' || b.title?.toLowerCase().includes('wet'),
          }));
          setBlocks(transformedBlocks);
        } else {
          console.error('[EventCalendar] API error:', result.message);
          setError(result.message || 'Failed to fetch blocks');
        }
      } catch (err) {
        console.error('[EventCalendar] Fetch error:', err);
        setError('Failed to fetch blocks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocks();
  }, [backend, viewMode, selectedDate, refreshTrigger]);

  // Memoized event extraction and processing
  const events = useMemo(() => {
    const processedEvents = new Map();

    // Process API-sourced blocks
    blocks.forEach((block) => {
      if (block.isEvent) {
        const eventKey = `${block.title || block.reason}-${block.courtNumber}-${block.startTime}`;

        if (!processedEvents.has(eventKey)) {
          processedEvents.set(eventKey, {
            ...block,
            courtNumbers: block.courtNumbers || [block.courtNumber],
            id: block.id || eventKey,
          });
        }
      }
    });

    // Process non-event blocks
    blocks.forEach((block) => {
      if (!block.isEvent) {
        const eventKey = `${block.title || block.reason}-${block.courtNumber}-${block.startTime}`;

        if (!processedEvents.has(eventKey)) {
          processedEvents.set(eventKey, {
            id: block.id,
            title: block.title || block.reason,
            startTime: block.startTime,
            endTime: block.endTime,
            eventType: block.eventType || getEventTypeFromReason(block.reason),
            courtNumbers: [block.courtNumber],
            isBlock: true,
            reason: block.reason,
          });
        }
      }
    });

    // Also check courts data for backward compatibility with active blocks
    courts.forEach((court, idx) => {
      if (court && court.blocked && court.blocked.isEvent) {
        const eventKey = `${court.blocked.eventDetails?.title || court.blocked.title}-${court.blocked.startTime}`;

        if (!processedEvents.has(eventKey)) {
          processedEvents.set(eventKey, {
            ...court.blocked,
            courtNumbers: court.blocked.eventDetails?.courts || [idx + 1],
            id: eventKey,
          });
        }
      }
    });

    return Array.from(processedEvents.values());
  }, [blocks, courts, refreshTrigger]);

  // Memoized filtered events based on view and date range
  const filteredEvents = useMemo(() => {
    let startDate, endDate;

    if (viewMode === 'month') {
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      endDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
    } else if (viewMode === 'week') {
      startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    }

    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return (
        (eventStart >= startDate && eventStart <= endDate) ||
        (eventEnd >= startDate && eventEnd <= endDate) ||
        (eventStart <= startDate && eventEnd >= endDate)
      );
    });
  }, [events, viewMode, selectedDate]);

  // Event handlers
  const handleEventClick = useCallback(
    (event) => {
      if (!disableEventClick) {
        setSelectedEvent(event);
      }
      setHoveredEvent(null);
    },
    [disableEventClick]
  );

  const handleEventHover = useCallback(
    (event, element) => {
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

  const handleQuickAction = useCallback((event, position) => {
    setQuickActionEvent(event);
    setQuickActionPosition(position);
    setHoveredEvent(null);
  }, []);

  const handleEdit = useCallback(
    (event) => {
      // Find the block in our API-sourced data
      const blockToEdit = blocks.find((block) => {
        if (event.id && block.id) {
          return block.id === event.id;
        }
        return block.title === event.title && block.startTime === event.startTime;
      });

      if (blockToEdit) {
        setSelectedEvent(null); // Close modal
        if (typeof onEditEvent === 'function') {
          onEditEvent(blockToEdit);
        } else {
          console.log('Opening edit for block:', blockToEdit);
          alert(
            'Edit functionality needs to be properly connected. Please use the Court Blocking tab for editing blocks.'
          );
        }
      }
    },
    [blocks, onEditEvent]
  );

  const handleDelete = useCallback(
    async (event) => {
      if (!backend) {
        console.error('No backend available for delete');
        return;
      }

      try {
        // Call API to cancel the block
        const result = await backend.admin.cancelBlock({
          blockId: event.id,
        });

        if (result.ok) {
          console.log('Block deleted successfully');
          setSelectedEvent(null);
          onRefresh();
        } else {
          console.error('Failed to delete block:', result.message);
          alert(`Failed to delete block: ${result.message}`);
        }
      } catch (error) {
        console.error('Error deleting block:', error);
        alert('Error deleting block. Please try again.');
      }
    },
    [backend, onRefresh]
  );

  const handleDuplicate = useCallback(
    (event) => {
      console.log('Duplicate event:', event);
      setSelectedEvent(null); // Close modal
      onDuplicateEvent(event); // Let parent handle the duplication
    },
    [onDuplicateEvent]
  );

  // Memoized callbacks
  const navigateDate = useCallback(
    (direction) => {
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

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  // Memoized header text
  const headerText = useMemo(() => {
    if (viewMode === 'month') {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }, [viewMode, selectedDate]);

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
      <div className="flex items-center justify-between mb-2 px-4">
        {/* Day/Week/Month buttons on the left */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleViewModeChange('day')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'day' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => handleViewModeChange('week')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'week' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => handleViewModeChange('month')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'month' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
          >
            Month
          </button>
        </div>

        {/* Navigation arrows and Today button in center */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft size={32} />
          </button>

          <button
            onClick={() => handleToday()}
            className="px-4 py-1.5 bg-blue-100 hover:bg-blue-300 text-gray-800 border border-blue-300 hover:border-blue-400 rounded text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Today
          </button>
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded">
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Date display on the right */}
        <h2 className="text-lg font-semibold w-64 text-right">{headerText}</h2>
      </div>

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

      {/* Event Details Modal */}
      {selectedEvent && !disableEventClick && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
};

export default EventCalendarEnhanced;
