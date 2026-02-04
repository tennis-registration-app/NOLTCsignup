import React from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from '../components';
import { CourtStatusGrid } from '../courts';

/**
 * StatusSection - Pass-through wrapper for court status display.
 *
 * Receives domain objects constructed by App.jsx and forwards to CourtStatusGrid.
 * Renders waitlist UI directly (not delegated).
 *
 * @param {Object} props
 * @param {import('../types/domainObjects.js').StatusModel} props.statusModel
 * @param {import('../types/domainObjects.js').StatusActions} props.statusActions
 * @param {import('../types/domainObjects.js').WetCourtsModel} props.wetCourtsModel
 * @param {import('../types/domainObjects.js').WetCourtsActions} props.wetCourtsActions
 * @param {import('../types/domainObjects.js').AdminServices} props.services
 */
export function StatusSection({
  statusModel,
  statusActions,
  wetCourtsModel,
  wetCourtsActions,
  services,
}) {
  // Extract values needed for local waitlist UI
  const { waitingGroups } = statusModel;
  const { moveInWaitlist, removeFromWaitlist } = statusActions;

  return (
    <div className="p-6">
      <CourtStatusGrid
        statusModel={statusModel}
        statusActions={statusActions}
        wetCourtsModel={wetCourtsModel}
        wetCourtsActions={wetCourtsActions}
        services={services}
      />

      {/* Waitlist Section */}
      <div
        className={`bg-white rounded-lg shadow-sm ${waitingGroups.length === 0 ? 'p-4' : 'p-6'}`}
      >
        {waitingGroups.length > 0 && (
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Waiting Groups ({waitingGroups.length})
          </h3>
        )}

        {waitingGroups.length === 0 ? (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Waiting Groups (0)</h3>
            <span className="text-sm text-gray-500">No groups waiting</span>
          </div>
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
    </div>
  );
}
