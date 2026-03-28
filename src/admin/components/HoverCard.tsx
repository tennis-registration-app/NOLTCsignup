/**
 * HoverCard Component
 *
 * Displays event details on hover with position-aware placement.
 * Used in calendar views to show event information.
 */
import React, { memo } from 'react';

const HoverCard = memo(({ event, position, onClose }) => {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes, rounded

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-50%)',
      }}
      onMouseLeave={onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">
            {event.eventDetails?.title || event.reason}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            {startTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <span>🕐</span>
          <span>
            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
            {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}(
            {Math.floor(duration / 60)}h {duration % 60}m)
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <span>🎾</span>
          <span>Courts {event.courtNumbers.join(', ')}</span>
        </div>

        {event.eventDetails?.participants && (
          <div className="flex items-center gap-2 text-gray-600">
            <span>👥</span>
            <span>{event.eventDetails.participants} participants</span>
          </div>
        )}

        {event.eventDetails?.organizer && (
          <div className="flex items-center gap-2 text-gray-600">
            <span>ℹ️</span>
            <span>{event.eventDetails.organizer}</span>
          </div>
        )}
      </div>

      {event.hasConflict && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <span>⚠️</span>
            <span>This event conflicts with other bookings</span>
          </div>
        </div>
      )}
    </div>
  );
});

HoverCard.displayName = 'HoverCard';

export default HoverCard;
