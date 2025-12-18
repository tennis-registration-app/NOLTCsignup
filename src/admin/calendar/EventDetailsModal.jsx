/**
 * EventDetailsModal Component
 *
 * Full-screen modal for viewing event details with edit/delete actions.
 */
import React, { memo } from 'react';
import { getEventColor, getEventEmoji } from './utils.js';

const EventDetailsModal = memo(({ event, onClose, onEdit, onDelete, onDuplicate }) => {
  if (!event) return null;

  const emoji = getEventEmoji(event.eventDetails?.type || event.type || 'other');
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const duration = (endTime - startTime) / (1000 * 60); // minutes

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`p-6 ${getEventColor(event)}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div>
                <h2 className="text-2xl font-bold">{event.eventDetails?.title || event.reason}</h2>
                <p className="opacity-90 mt-1">
                  {startTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <span className="text-xl">✖️</span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b">
          <button
            onClick={() => onEdit(event)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>✏️</span>
            Edit Event
          </button>
          <button
            onClick={() => onDuplicate(event)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>📋</span>
            Duplicate
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this event?')) {
                onDelete(event);
                onClose();
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-auto"
          >
            <span>🗑️</span>
            Delete
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Time and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Schedule</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-gray-600">
                  <span>🕐</span>
                  <div>
                    <p className="font-medium">
                      {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                      {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-gray-500">
                      Duration: {Math.floor(duration / 60)}h {duration % 60}m
                    </p>
                  </div>
                </div>
                {event.eventDetails?.recurringInfo && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <span>🔄</span>
                    <div>
                      <p className="font-medium">{event.eventDetails.recurringInfo.pattern}</p>
                      <p className="text-sm text-gray-500">{event.eventDetails.recurringInfo.instance}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Location</h3>
              <div className="flex items-center gap-3 text-gray-600">
                <span>🎾</span>
                <div>
                  <p className="font-medium">Courts {event.courtNumbers.join(', ')}</p>
                  <p className="text-sm text-gray-500">{event.courtNumbers.length} court{event.courtNumbers.length > 1 ? 's' : ''} reserved</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.eventDetails?.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Description</h3>
              <p className="text-gray-600">{event.eventDetails.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            {event.eventDetails?.participants && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Participants</h3>
                <div className="flex items-center gap-3 text-gray-600">
                  <span>👥</span>
                  <span>{event.eventDetails.participants} registered</span>
                </div>
              </div>
            )}

            {event.eventDetails?.organizer && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Organizer</h3>
                <div className="flex items-center gap-3 text-gray-600">
                  <span>ℹ️</span>
                  <span>{event.eventDetails.organizer}</span>
                </div>
              </div>
            )}
          </div>

          {/* Conflicts */}
          {event.hasConflict && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-medium text-amber-900">Schedule Conflict</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    This event overlaps with other bookings during the same time period.
                    {event.conflictingEvents && (
                      <span className="block mt-2">
                        Conflicts with: {event.conflictingEvents.map(e => e.title).join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

EventDetailsModal.displayName = 'EventDetailsModal';

export default EventDetailsModal;
