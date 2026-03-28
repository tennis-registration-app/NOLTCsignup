import React, { memo, useMemo } from 'react';
import { getEventIcon } from '../utils/eventIcons';

// Event Summary Component
export const EventSummary = memo(function EventSummary({ events, currentTime, onEventClick }) {
  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => new Date(event.startTime) > currentTime)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
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
