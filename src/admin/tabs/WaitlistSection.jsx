import React from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from '../components';

export function WaitlistSection({ waitingGroups, moveInWaitlist, removeFromWaitlist }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Waiting Groups ({waitingGroups.length})
      </h3>

      {waitingGroups.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No groups waiting</p>
      ) : (
        <div className="space-y-3">
          {waitingGroups.map((group, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
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
      )}
    </div>
  );
}
