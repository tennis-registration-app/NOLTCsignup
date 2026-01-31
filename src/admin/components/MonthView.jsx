import React, { memo, useMemo } from 'react';
import { getEventIcon } from '../utils/eventIcons';
import { getEventColor } from '../calendar';

// Month View Component with memoization
export const MonthView = memo(function MonthView({
  selectedDate,
  events,
  currentTime,
  hoursOverrides = [],
  onEventClick,
}) {
  // Create a map for quick lookup of overrides by date
  const overridesByDate = useMemo(() => {
    const map = {};
    hoursOverrides.forEach((o) => {
      map[o.date] = o;
    });
    return map;
  }, [hoursOverrides]);

  const { calendarDays, eventsByDate } = useMemo(() => {
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
          // Check for holiday/override on this day
          const dateStr = date ? date.toISOString().slice(0, 10) : null;
          const override = dateStr ? overridesByDate[dateStr] : null;

          return (
            <div
              key={index}
              className={`relative group bg-white p-2 min-h-[100px] ${
                !date ? 'bg-gray-50' : ''
              } ${override?.is_closed ? 'bg-red-50' : override ? 'bg-orange-50' : isToday ? 'bg-blue-50' : ''}`}
            >
              {date && (
                <>
                  <div
                    className={`text-sm font-medium mb-1 flex items-center gap-1 ${
                      override?.is_closed
                        ? 'text-red-600'
                        : isToday
                          ? 'text-blue-600'
                          : 'text-gray-900'
                    }`}
                  >
                    {date.getDate()}
                    {override && (
                      <span
                        className={`w-2 h-2 rounded-full ${override.is_closed ? 'bg-red-500' : 'bg-orange-400'}`}
                      />
                    )}
                  </div>
                  {/* Hover tooltip for holiday/override */}
                  {override && (
                    <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 top-1 right-1 whitespace-nowrap z-50 shadow-lg">
                      {override.reason || 'Special Hours'}
                      {override.is_closed
                        ? ' (CLOSED)'
                        : `: ${override.opens_at?.slice(0, 5)} - ${override.closes_at?.slice(0, 5)}`}
                    </div>
                  )}
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
