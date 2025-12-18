/**
 * EventCalendarEnhanced Component
 *
 * Main calendar component with day/week/month views and event management.
 * Coordinates all calendar views and handles event interactions.
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
  defaultView = 'week',
  disableEventClick = false,
  // These components are passed from parent until they're extracted
  MonthView,
  EventSummary,
  HoverCard,
  QuickActionsMenu,
  Tennis
}) => {
  const [viewMode, setViewMode] = useState(defaultView);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const [quickActionEvent, setQuickActionEvent] = useState(null);
  const [quickActionPosition, setQuickActionPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setViewMode(defaultView);
  }, [defaultView]);

  // Memoized event extraction and processing
  const events = useMemo(() => {
    const processedEvents = new Map();

    // Get events from localStorage
    try {
      const courtBlocks = JSON.parse(localStorage.getItem('courtBlocks') || '[]');
      courtBlocks.forEach(block => {
        if (block.isEvent) {
          const eventKey = `${block.eventDetails?.title || block.reason}-${block.startTime}`;

          if (!processedEvents.has(eventKey)) {
            processedEvents.set(eventKey, {
              ...block,
              courtNumbers: block.eventDetails?.courts || [block.courtNumber],
              id: eventKey
            });
          }
        }
      });

      courtBlocks.forEach(block => {
        if (!block.isEvent) {
          const eventKey = `${block.eventDetails?.title || block.title || block.reason}-${block.courtNumber}-${block.startTime}`;

          if (!processedEvents.has(eventKey)) {
            processedEvents.set(eventKey, {
              id: block.id,
              title: block.eventDetails?.title || block.title || block.reason,
              startTime: block.startTime,
              endTime: block.endTime,
              eventType: getEventTypeFromReason(block.reason),
              courtNumbers: [block.courtNumber],
              isBlock: true,
              reason: block.reason
            });
          }
        }
      });

    } catch (error) {
      console.error('Error loading events:', error);
    }

    // Also check courts data for backward compatibility
    courts.forEach((court, idx) => {
      if (court && court.blocked && court.blocked.isEvent) {
        const eventKey = `${court.blocked.eventDetails.title}-${court.blocked.startTime}`;

        if (!processedEvents.has(eventKey)) {
          processedEvents.set(eventKey, {
            ...court.blocked,
            courtNumbers: court.blocked.eventDetails.courts || [idx + 1],
            id: eventKey
          });
        }
      }
    });

    return Array.from(processedEvents.values());
  }, [courts, refreshTrigger]);

  // Memoized filtered events based on view and date range
  const filteredEvents = useMemo(() => {
    let startDate, endDate;

    if (viewMode === 'month') {
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
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

    return events.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return (eventStart >= startDate && eventStart <= endDate) ||
             (eventEnd >= startDate && eventEnd <= endDate) ||
             (eventStart <= startDate && eventEnd >= endDate);
    });
  }, [events, viewMode, selectedDate]);

  // Event handlers
  const handleEventClick = useCallback((event) => {
    if (!disableEventClick) {
      setSelectedEvent(event);
    }
    setHoveredEvent(null);
  }, [disableEventClick]);

  const handleEventHover = useCallback((event, element) => {
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
        leftPosition = Math.max(10, Math.min(
          viewportWidth - cardWidth - 10,
          rect.left + (rect.width / 2) - (cardWidth / 2)
        ));
      }

      setHoveredEvent(event);
      setHoverPosition({
        top: rect.top + rect.height / 2,
        left: leftPosition
      });
    }
  }, [quickActionEvent]);

  const handleEventLeave = useCallback(() => {
    setHoveredEvent(null);
  }, []);

  const handleQuickAction = useCallback((event, position) => {
    setQuickActionEvent(event);
    setQuickActionPosition(position);
    setHoveredEvent(null);
  }, []);

  const handleEdit = useCallback((event) => {
    console.log('Edit event:', event);

    try {
      const courtBlocks = JSON.parse(localStorage.getItem('courtBlocks') || '[]');
      const blockToEdit = courtBlocks.find(block => {
        if (event.eventDetails?.title && block.eventDetails?.title) {
          return block.eventDetails.title === event.eventDetails.title &&
                 block.startTime === event.startTime;
        }
        return block.id === event.id;
      });

      if (blockToEdit) {
        setSelectedEvent(null); // Close modal
        if (typeof onEditEvent === 'function') {
          onEditEvent(blockToEdit); // Let parent handle the edit
        } else {
          // Default behavior: simulate what the blocking tab does
          console.log('Opening edit for block:', blockToEdit);
          alert('Edit functionality needs to be properly connected. Please use the Court Blocking tab for editing blocks.');
        }
      }
    } catch (error) {
      console.error('Error finding block to edit:', error);
    }
  }, [onEditEvent]);

  const handleDelete = useCallback(async (event) => {
    console.log('Delete event:', event);
    try {
      const courtBlocks = JSON.parse(localStorage.getItem('courtBlocks') || '[]');

      // Remove all blocks that match this event
      const updatedBlocks = courtBlocks.filter(block => {
        // Remove blocks with matching event details
        if (event.eventDetails?.title && block.eventDetails?.title) {
          return !(block.eventDetails.title === event.eventDetails.title &&
                  block.startTime === event.startTime);
        }
        // Fallback: remove by ID if available
        return block.id !== event.id;
      });

      await Tennis.BlocksService.saveBlocks(updatedBlocks);
      console.log('Event deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }, [onRefresh, Tennis]);

  const handleDuplicate = useCallback((event) => {
    console.log('Duplicate event:', event);
    setSelectedEvent(null); // Close modal
    onDuplicateEvent(event); // Let parent handle the duplication
  }, [onDuplicateEvent]);

  // Memoized callbacks
  const navigateDate = useCallback((direction) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);

      if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + direction);
      } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + (direction * 7));
      } else {
        newDate.setDate(newDate.getDate() + direction);
      }

      return newDate;
    });
  }, [viewMode]);

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
      return selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
      <div className="flex items-center justify-between mb-2 px-20">
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
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={32} />
          </button>

          <button
            onClick={() => handleToday()}
            className="px-4 py-1.5 bg-blue-100 hover:bg-blue-300 text-gray-800 border border-blue-300 hover:border-blue-400 rounded text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Today
          </button>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Date display on the right */}
        <h2 className="text-lg font-semibold w-64 text-right">{headerText}</h2>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <div className="border-t border-gray-300">
          {viewMode === 'month' && MonthView && (
            <MonthView
              selectedDate={selectedDate}
              events={filteredEvents}
              currentTime={currentTime}
              onEventClick={handleEventClick}
            />
          )}
          {viewMode === 'week' && (
            <div className="h-[600px] overflow-auto">
              <WeekView
                selectedDate={selectedDate}
                events={filteredEvents}
                currentTime={currentTime}
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
                onEventClick={handleEventClick}
                onEventHover={handleEventHover}
                onEventLeave={handleEventLeave}
                onQuickAction={handleQuickAction}
              />
            </div>
          )}
        </div>
      </div>

      {/* Event Summary */}
      {EventSummary && (
        <EventSummary events={events} currentTime={currentTime} onEventClick={handleEventClick} />
      )}

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
