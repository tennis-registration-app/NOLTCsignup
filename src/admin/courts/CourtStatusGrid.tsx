/**
 * CourtStatusGrid Component
 *
 * Displays a grid of all courts with their current status.
 * Handles wet courts, blocks, games, and player movements.
 */
import React from 'react';
import { EditGameModal } from '../components';
import type { CalendarEvent } from '../calendar/utils';
import EventDetailsModal, { AdminBackend } from '../calendar/EventDetailsModal';
import { getCourtStatus } from './courtStatusUtils';
import { useCourtActions } from './useCourtActions';
import CourtCard from './CourtCard';
import type { CourtBlock } from './courtStatusUtils';

interface CourtStatusGridProps {
  statusModel: {
    courts?: Record<string, unknown>[];
    courtBlocks?: CourtBlock[];
    selectedDate?: Date;
    currentTime?: Date;
    waitingGroups?: Record<string, unknown>[];
  };
  statusActions: Record<string, unknown>;
  wetCourtsModel: {
    active?: boolean;
    courts?: Set<number>;
    enabled?: boolean;
  };
  wetCourtsActions: {
    activateEmergency?: () => Promise<{success?: boolean; error?: string}>;
    deactivateAll?: () => Promise<{success?: boolean; error?: string}>;
    clearCourt?: (n: number) => void;
    clearAllCourts?: () => Promise<{success?: boolean; error?: string}>;
  };
  services: {
    backend: AdminBackend;
  };
}

import WetCourtsToolbar from './WetCourtsToolbar';

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
const CourtStatusGrid: React.FC<CourtStatusGridProps> = ({
  statusModel,
  statusActions,
  wetCourtsModel,
  wetCourtsActions,
  services,
}) => {
  // Destructure domain objects to preserve original local names
  const {
    courts = /** @type {any[]} */ ([]),
    courtBlocks = /** @type {any[]} */ ([]),
    selectedDate,
    currentTime = new Date(),
  } = statusModel;
  const onClearAllCourts = statusActions.clearAllCourts as (() => void) | undefined;
  const { active: wetCourtsActive, courts: wetCourts = /** @type {Set<any>} */ (new Set()) } =
    wetCourtsModel;
  // activateEmergency/deactivateAll no longer used directly — routed through useCourtActions
  // for optimistic UX (kept in wetCourtsActions for useCourtActions to consume)
  const { backend } = services;

  const {
    movingFrom,
    optimisticCourts,
    optimisticWetCourts,
    showActions,
    editingGame,
    editingBlock,
    savingGame,
    handleActivateWet,
    handleDeactivateWet,
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
  } = useCourtActions({
    statusActions,
    wetCourtsActions,
    services,
    courts,
    courtBlocks,
    wetCourts,
  });

  // Get data for grid rendering — use optimistic overrides during in-flight operations,
  // otherwise fall back to real data from TennisBackend API
  const displayCourts = optimisticCourts || courts;
  const displayWetCourts = optimisticWetCourts || wetCourts;
  const courtsByNumber: Record<number, Record<string, unknown>> = {};
  (displayCourts || []).forEach((c: Record<string, unknown>) => {
    courtsByNumber[c.number as number] = c;
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
              wetCourts: displayWetCourts,
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
          wetCourts={displayWetCourts}
          onActivateEmergency={handleActivateWet}
          onDeactivate={handleDeactivateWet}
          onAllCourtsDry={handleAllCourtsDry}
        />
      </div>

      {editingGame && (
        <EditGameModal
          game={editingGame as never}
          onSave={handleSaveGame}
          onClose={closeEditingGame}
          saving={savingGame}
        />
      )}

      {editingBlock && (
        <EventDetailsModal
          event={editingBlock as unknown as CalendarEvent}
          courts={(courts as Record<string, unknown>[]).map((court: Record<string, unknown>, idx: number) => ({
            id: (court?.id as string) || `court-${idx + 1}`,
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
