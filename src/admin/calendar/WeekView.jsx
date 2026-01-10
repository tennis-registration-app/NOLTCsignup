/**
 * WeekView Component
 *
 * Calendar week view with collision detection for overlapping events.
 * Shows 7 days with events displayed in time slots.
 */
import React, { memo, useMemo } from 'react';
import InteractiveEvent from './InteractiveEvent.jsx';
import { getEventColor, calculateEventLayout } from './utils.js';

const WeekView = memo(
  ({
    selectedDate,
    events,
    currentTime,
    hoursOverrides = [],
    onEventClick,
    onEventHover,
    onEventLeave,
    onQuickAction,
  }) => {
    // Create a map for quick lookup of overrides by date
    const overridesByDate = useMemo(() => {
      const map = {};
      hoursOverrides.forEach((o) => {
        map[o.date] = o;
      });
      return map;
    }, [hoursOverrides]);
    const { days, eventsByDayWithLayout, hours } = useMemo(() => {
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);

      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(day.getDate() + i);
        weekDays.push(day);
      }

      const hoursArray = Array.from({ length: 16 }, (_, i) => i + 6);

      // Group events by day and calculate layout
      const eventsByDay = {};
      weekDays.forEach((day, dayIndex) => {
        const dayEvents = events.filter((event) => {
          const eventDate = new Date(event.startTime);
          return eventDate.toDateString() === day.toDateString();
        });

        const layout = calculateEventLayout(dayEvents);

        eventsByDay[dayIndex] = dayEvents.map((event) => {
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
            dayIndex,
            top: (startHour - 6) * 60,
            height: (endHour - startHour) * 60,
            startHour,
            endHour,
            column: layoutInfo.column,
            totalColumns: layoutInfo.totalColumns,
            hasConflict:
              layoutInfo.totalColumns > 1 &&
              layoutInfo.group?.some(
                (otherEvent) =>
                  otherEvent !== event &&
                  event.courtNumbers?.some((court) => otherEvent.courtNumbers?.includes(court))
              ),
          };
        });
      });

      return { days: weekDays, eventsByDayWithLayout: eventsByDay, hours: hoursArray };
    }, [selectedDate, events]);

    return (
      <div className="flex h-full">
        {/* Time column */}
        <div className="w-16 flex-shrink-0">
          <div className="h-12"></div>
          <div className="relative" style={{ height: `${hours.length * 60}px` }}>
            {hours.map((hour, idx) => (
              <div
                key={hour}
                className="absolute right-2 text-xs text-gray-500"
                style={{ top: `${idx * 60 - 8}px` }}
              >
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        <div
          className="flex-1 flex bg-gray-200 min-w-0"
          style={{ minHeight: `${hours.length * 60 + 48}px` }}
        >
          {days.map((day, dayIndex) => {
            const isToday = day.toDateString() === currentTime.toDateString();
            const dayEvents = eventsByDayWithLayout[dayIndex] || [];
            // Check for holiday/override on this day
            const dateStr = day.toISOString().slice(0, 10);
            const override = overridesByDate[dateStr];

            return (
              <div
                key={dayIndex}
                className="flex-1 bg-white border-r border-gray-200 last:border-r-0"
              >
                <div
                  className={`relative group h-12 p-2 text-center border-b border-gray-300 sticky top-0 z-20 ${
                    override?.is_closed
                      ? 'bg-red-100'
                      : override
                        ? 'bg-orange-50'
                        : isToday
                          ? 'bg-blue-50'
                          : 'bg-gray-50'
                  }`}
                >
                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    {override && (
                      <span
                        className={`w-2 h-2 rounded-full ${override.is_closed ? 'bg-red-500' : 'bg-orange-400'}`}
                      />
                    )}
                  </div>
                  <div
                    className={`text-sm font-medium ${override?.is_closed ? 'text-red-600' : isToday ? 'text-blue-600' : ''}`}
                  >
                    {day.getDate()}
                  </div>
                  {/* Hover tooltip for holiday/override */}
                  {override && (
                    <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap z-50 shadow-lg">
                      {override.reason || 'Special Hours'}
                      {override.is_closed
                        ? ' (CLOSED)'
                        : `: ${override.opens_at?.slice(0, 5)} - ${override.closes_at?.slice(0, 5)}`}
                    </div>
                  )}
                </div>

                <div className="relative" style={{ height: `${hours.length * 60}px` }}>
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

                  {/* Events with collision handling */}
                  {dayEvents.map((event, idx) => {
                    const width = `${100 / event.totalColumns}%`;
                    const left = `${(100 / event.totalColumns) * event.column}%`;

                    return (
                      <InteractiveEvent
                        key={idx}
                        event={event}
                        className={`absolute p-1 rounded shadow-sm ${getEventColor(event)} text-xs overflow-hidden border-l-2 group hover:z-10`}
                        style={{
                          top: `${event.top}px`,
                          height: `${event.height}px`,
                          minHeight: '20px',
                          left: left,
                          width: width,
                          marginRight: '2px',
                        }}
                        onEventClick={onEventClick}
                        onEventHover={onEventHover}
                        onEventLeave={onEventLeave}
                        onQuickAction={onQuickAction}
                        isWeekView={true}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

WeekView.displayName = 'WeekView';

export default WeekView;
