/**
 * DayViewEnhanced Component
 *
 * Calendar day view with court grid layout.
 * Shows events for all 12 courts across hours 6am-9pm.
 */
import React, { memo, useMemo } from 'react';
import InteractiveEvent from './InteractiveEvent.jsx';
import { getEventColor, calculateEventLayout } from './utils.js';

const DayViewEnhanced = memo(
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
    // Check for override on selected date
    const override = useMemo(() => {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      return hoursOverrides.find((o) => o.date === dateStr);
    }, [selectedDate, hoursOverrides]);

    const { courts, eventsByCourtWithLayout, hours } = useMemo(() => {
      const hoursArray = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
      const courtsArray = Array.from({ length: 12 }, (_, i) => i + 1); // Courts 1-12

      // Filter events for selected date
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === selectedDate.toDateString();
      });

      // Group events by court and calculate layout
      const eventsByCourt = {};
      courtsArray.forEach((courtNum) => {
        const courtEvents = dayEvents.filter(
          (event) => event.courtNumbers?.includes(courtNum) || event.courtNumber === courtNum
        );

        const layout = calculateEventLayout(courtEvents);

        eventsByCourt[courtNum] = courtEvents.map((event) => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
          const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;

          const layoutInfo = layout.get(event.id || `${event.startTime}-${courtNum}`) || {
            column: 0,
            totalColumns: 1,
          };

          return {
            ...event,
            courtNumber: courtNum,
            top: (startHour - 6) * 60,
            height: (endHour - startHour) * 60,
            startHour,
            endHour,
            column: layoutInfo.column,
            totalColumns: layoutInfo.totalColumns,
          };
        });
      });

      return { courts: courtsArray, eventsByCourtWithLayout: eventsByCourt, hours: hoursArray };
    }, [selectedDate, events]);

    // Now line calculations
    const { showNowLine, nowLinePosition } = useMemo(() => {
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      const nowHour = currentTime.getHours() + currentTime.getMinutes() / 60;
      const showNowLine = isToday && nowHour >= 6 && nowHour <= 21;
      const nowLinePosition = (nowHour - 6) * 60 + 48; // +48 for header height
      return { showNowLine, nowLinePosition };
    }, [selectedDate, currentTime]);

    return (
      <div className="h-full overflow-auto">
        {/* Holiday/Override Banner */}
        {override && (
          <div
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
              override.is_closed ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full ${override.is_closed ? 'bg-red-500' : 'bg-orange-400'}`}
            />
            {override.is_closed ? (
              <span>CLOSED{override.reason ? ` — ${override.reason}` : ''}</span>
            ) : (
              <span>
                Modified Hours: {override.opens_at?.slice(0, 5)} - {override.closes_at?.slice(0, 5)}
                {override.reason ? ` — ${override.reason}` : ''}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          {/* Now Line */}
          {showNowLine && (
            <div
              className="absolute left-16 right-0 z-30 pointer-events-none flex items-center"
              style={{ top: `${nowLinePosition}px` }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          )}
          <div className="flex min-w-max">
            {/* Time column */}
            <div className="w-16 flex-shrink-0 bg-gray-50">
              <div className="h-12 border-b border-gray-300 bg-gray-50 sticky top-0 z-20"></div>
              <div className="relative" style={{ height: `${hours.length * 60}px` }}>
                {hours.map(
                  (hour, idx) =>
                    hour >= 7 && (
                      <div
                        key={hour}
                        className="absolute right-2 text-xs text-gray-500"
                        style={{ top: `${idx * 60 - 8}px` }}
                      >
                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                      </div>
                    )
                )}
              </div>
            </div>

            {/* Court columns */}
            <div
              className="flex bg-gray-200 min-w-0"
              style={{ minHeight: `${hours.length * 60 + 48}px` }}
            >
              {courts.map((courtNum) => {
                const courtEvents = eventsByCourtWithLayout[courtNum] || [];

                return (
                  <div
                    key={courtNum}
                    className="w-[105px] bg-white border-r border-gray-200 last:border-r-0 flex-shrink-0"
                  >
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
                          <div
                            className="absolute w-full h-px bg-gray-100"
                            style={{ top: '30px' }}
                          />
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
                              marginRight: '2px',
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
      </div>
    );
  }
);

DayViewEnhanced.displayName = 'DayViewEnhanced';

export default DayViewEnhanced;
