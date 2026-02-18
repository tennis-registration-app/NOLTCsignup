/**
 * CourtStatusGrid Component
 *
 * Displays a grid of all courts with their current status.
 * Handles wet courts, blocks, games, and player movements.
 */
import React from 'react';
import { EditGameModal } from '../components';
import EventDetailsModal from '../calendar/EventDetailsModal.jsx';
import { getCourtStatus } from './courtStatusUtils.js';
import { useCourtActions } from './useCourtActions.js';
import CourtCard from './CourtCard.jsx';
import WetCourtsToolbar from './WetCourtsToolbar.jsx';

/**
 * 12-court status grid with wet court indicators.
 *
 * @param {Object} props
 * @param {import('../types/domainObjects.js').StatusModel} props.statusModel
 * @param {import('../types/domainObjects.js').StatusActions} props.statusActions
 * @param {import('../types/domainObjects.js').WetCourtsModel} props.wetCourtsModel
 * @param {import('../types/domainObjects.js').WetCourtsActions} props.wetCourtsActions
 * @param {import('../types/domainObjects.js').AdminServices} props.services
 */
const CourtStatusGrid = ({
  statusModel,
  statusActions,
  wetCourtsModel,
  wetCourtsActions,
  services,
}) => {
  // Destructure domain objects to preserve original local names
  const { courts, courtBlocks, selectedDate, currentTime } = statusModel;
  const { clearAllCourts: onClearAllCourts } = statusActions;
  const { active: wetCourtsActive, courts: wetCourts } = wetCourtsModel;
  const { activateEmergency: handleEmergencyWetCourt, deactivateAll: deactivateWetCourts } =
    wetCourtsActions;
  const { backend } = services;

  const {
    movingFrom,
    showActions,
    editingGame,
    editingBlock,
    savingGame,
    handleWetCourtToggle,
    handleClearCourt,
    handleSaveGame,
    handleAllCourtsDry,
    handleEditClick,
    handleMoveCourt,
    initiateMove,
    toggleActions,
    closeEditingGame,
    closeEditingBlock,
    handleBlockSaved,
  } = useCourtActions({ statusActions, wetCourtsActions, services, courtBlocks, wetCourts });

  // Get data for grid rendering - use courts prop from TennisBackend API
  // Create a lookup map by court number for efficient access
  const courtsByNumber = {};
  (courts || []).forEach((c) => {
    courtsByNumber[c.number] = c;
  });

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Court Status</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onClearAllCourts}
              className="px-3 py-1 bg-white text-red-500 border-2 border-red-400 rounded-lg hover:bg-red-50 hover:border-red-500 text-xs font-medium transition-colors"
            >
              Clear All Courts
            </button>
            <div className="text-sm text-gray-500">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }, (_, index) => {
            const courtNum = index + 1;
            const court = courtsByNumber[courtNum] || null;
            const { status, info } = getCourtStatus(court, courtNum, {
              wetCourts,
              courtBlocks,
              selectedDate,
              currentTime,
            });

            return (
              <CourtCard
                key={courtNum}
                courtNum={courtNum}
                status={status}
                info={info}
                currentTime={currentTime}
                movingFrom={movingFrom}
                showActionsMenu={showActions === courtNum}
                handlers={{
                  onToggleActions: toggleActions,
                  onWetToggle: handleWetCourtToggle,
                  onMoveTarget: handleMoveCourt,
                  onEditClick: handleEditClick,
                  onClearCourt: handleClearCourt,
                  onInitiateMove: initiateMove,
                }}
              />
            );
          })}
        </div>

        <WetCourtsToolbar
          wetCourtsActive={wetCourtsActive}
          wetCourts={wetCourts}
          onActivateEmergency={handleEmergencyWetCourt}
          onDeactivate={deactivateWetCourts}
          onAllCourtsDry={handleAllCourtsDry}
        />
      </div>

      {editingGame && (
        <EditGameModal
          game={editingGame}
          onSave={handleSaveGame}
          onClose={closeEditingGame}
          saving={savingGame}
        />
      )}

      {editingBlock && (
        <EventDetailsModal
          event={editingBlock}
          courts={courts.map((court, idx) => ({
            id: court?.id || `court-${idx + 1}`,
            courtNumber: idx + 1,
          }))}
          backend={backend}
          onClose={closeEditingBlock}
          onSaved={handleBlockSaved}
        />
      )}
    </>
  );
};

export default CourtStatusGrid;
