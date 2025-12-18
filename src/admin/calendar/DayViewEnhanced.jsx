/**
 * DayViewEnhanced Component
 *
 * Calendar day view with court grid layout.
 * Shows events for all 12 courts across hours 6am-9pm.
 */
import React, { memo, useMemo } from 'react';
import InteractiveEvent from './InteractiveEvent.jsx';
import { getEventColor, calculateEventLayout } from './utils.js';

const DayViewEnhanced = memo(({
  selectedDate,
  events,
  currentTime,
  onEventClick,
  onEventHover,
  onEventLeave,
  onQuickAction
}) => {
  const { courts, eventsByCourtWithLayout, hours } = useMemo(() => {
    const hoursArray = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
    const courtsArray = Array.from({ length: 12 }, (_, i) => i + 1); // Courts 1-12

    // Filter events for selected date
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === selectedDate.toDateString();
    });

    // Group events by court and calculate layout
    const eventsByCourt = {};
    courtsArray.forEach(courtNum => {
      const courtEvents = dayEvents.filter(event =>
        event.courtNumbers?.includes(courtNum) || event.courtNumber === courtNum
      );

      const layout = calculateEventLayout(courtEvents);

      eventsByCourt[courtNum] = courtEvents.map(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
        const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;

        const layoutInfo = layout.get(event.id || `${event.startTime}-${courtNum}`) || {
          column: 0,
          totalColumns: 1
        };

        return {
          ...event,
          courtNumber: courtNum,
          top: (startHour - 6) * 60,
          height: (endHour - startHour) * 60,
          startHour,
          endHour,
          column: layoutInfo.column,
          totalColumns: layoutInfo.totalColumns
        };
      });
    });

    return { courts: courtsArray, eventsByCourtWithLayout: eventsByCourt, hours: hoursArray };
  }, [selectedDate, events]);

  return (
    <div className="h-full overflow-auto">
      <div className="flex min-w-max">
        {/* Time column */}
        <div className="w-16 flex-shrink-0 bg-gray-50">
          <div className="h-12 border-b border-gray-300 bg-gray-50 sticky top-0 z-20"></div>
          <div className="relative" style={{ height: `${hours.length * 60}px` }}>
            {hours.map((hour, idx) => (
              hour >= 7 && (
                <div key={hour} className="absolute right-2 text-xs text-gray-500" style={{ top: `${idx * 60 - 8}px` }}>
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </div>
              )
            ))}
          </div>
        </div>

        {/* Court columns */}
        <div className="flex bg-gray-200 min-w-0" style={{ minHeight: `${hours.length * 60 + 48}px` }}>
          {courts.map((courtNum) => {
            const courtEvents = eventsByCourtWithLayout[courtNum] || [];

            return (
              <div key={courtNum} className="w-24 bg-white border-r border-gray-200 last:border-r-0 flex-shrink-0">
                <div className="h-12 p-2 text-center border-b border-gray-300 bg-gray-50 sticky top-0 z-20">
                  <div className="text-xs text-gray-600">Court</div>
                  <div className="text-sm font-medium">{courtNum}</div>
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

                  {/* Events */}
                  {courtEvents.map((event, idx) => {
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
                          marginRight: '2px'
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
          })}
        </div>
      </div>
    </div>
  );
});

DayViewEnhanced.displayName = 'DayViewEnhanced';

export default DayViewEnhanced;
