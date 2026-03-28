import React from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from './Icons';

/**
 * WaitlistGroupList - Shared presentational component for waitlist group rows.
 *
 * Renders the list of waiting groups with move/remove controls.
 * Used by both StatusSection and WaitlistSection.
 *
 * @param {Object} props
 * @param {Array<Object>} props.waitingGroups - Current waitlist entries
 * @param {Function} props.moveInWaitlist - Reorder waitlist entry (fromIndex, toIndex)
 * @param {Function} props.removeFromWaitlist - Remove waitlist entry (index)
 */
export function WaitlistGroupList({ waitingGroups, moveInWaitlist, removeFromWaitlist }) {
  return (
    <div className="space-y-3">
      {waitingGroups.map((group, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">
              Position {index + 1}: {(group.names || []).join(', ') || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600">
              {(group.names || []).length} player
              {(group.names || []).length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                onClick={() => moveInWaitlist(index, index - 1)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {index < waitingGroups.length - 1 && (
              <button
                onClick={() => moveInWaitlist(index, index + 1)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <button
              onClick={() => removeFromWaitlist(index)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
