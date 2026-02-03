import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from '../components';
import { CourtStatusGrid } from '../courts';
import {
  createStatusModel,
  createStatusActions,
  createWetCourtsModel,
  createWetCourtsActions,
  createAdminServices,
} from '../types/domainObjects.js';

export function StatusSection({
  // State
  courts,
  courtBlocks,
  selectedDate,
  currentTime,
  wetCourtsActive,
  wetCourts,
  waitingGroups,
  backend,
  // Handlers
  clearCourt,
  moveCourt,
  handleEditBlockFromStatus,
  handleEmergencyWetCourt,
  clearAllCourts,
  deactivateWetCourts,
  clearWetCourt,
  moveInWaitlist,
  removeFromWaitlist,
}) {
  const statusModel = useMemo(
    () =>
      createStatusModel({
        courts,
        courtBlocks,
        selectedDate,
        currentTime,
        waitingGroups,
      }),
    [courts, courtBlocks, selectedDate, currentTime, waitingGroups]
  );

  const statusActions = useMemo(
    () =>
      createStatusActions({
        clearCourt,
        moveCourt,
        clearAllCourts,
        handleEditBlockFromStatus,
        moveInWaitlist,
        removeFromWaitlist,
      }),
    [
      clearCourt,
      moveCourt,
      clearAllCourts,
      handleEditBlockFromStatus,
      moveInWaitlist,
      removeFromWaitlist,
    ]
  );

  const wetCourtsModel = useMemo(
    () =>
      createWetCourtsModel({
        wetCourtsActive,
        wetCourts,
      }),
    [wetCourtsActive, wetCourts]
  );

  const wetCourtsActions = useMemo(
    () =>
      createWetCourtsActions({
        handleEmergencyWetCourt,
        deactivateWetCourts,
        onClearWetCourt: clearWetCourt,
      }),
    [handleEmergencyWetCourt, deactivateWetCourts, clearWetCourt]
  );

  const adminServices = useMemo(() => createAdminServices({ backend }), [backend]);

  return (
    <div className="p-6">
      <CourtStatusGrid
        statusModel={statusModel}
        statusActions={statusActions}
        wetCourtsModel={wetCourtsModel}
        wetCourtsActions={wetCourtsActions}
        services={adminServices}
        // DEAD PROPS - still passed for now
        onEditBlock={handleEditBlockFromStatus}
        onEditGame={undefined}
        onEmergencyWetCourt={handleEmergencyWetCourt}
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
