/**
 * CourtStatusGrid Component
 *
 * Displays a grid of all courts with their current status.
 * Handles wet courts, blocks, games, and player movements.
 */
import React from 'react';
import { Edit2, X, RefreshCw, Droplets } from '../components';
import { EditGameModal } from '../components';
import EventDetailsModal from '../calendar/EventDetailsModal.jsx';
import {
  getCourtStatus,
  getStatusColor,
  formatTimeRemaining,
  getPlayerNames,
} from './courtStatusUtils.js';
import { useCourtActions } from './useCourtActions.js';

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
            const isMoving = movingFrom === courtNum;
            const canReceiveMove = movingFrom && movingFrom !== courtNum && status === 'available';

            return (
              <div
                key={courtNum}
                className={`p-3 rounded-lg border-2 ${getStatusColor(status)} ${
                  isMoving ? 'ring-2 ring-blue-500' : ''
                } ${canReceiveMove ? 'cursor-pointer hover:bg-green-200' : ''}
                ${status === 'wet' ? 'cursor-pointer hover:bg-gray-300' : ''}
                min-h-[120px] h-[120px] flex flex-col justify-between relative`}
                onClick={
                  canReceiveMove
                    ? () => {
                        handleMoveCourt(Number(movingFrom), Number(courtNum));
                      }
                    : status === 'wet'
                      ? () => {
                          handleWetCourtToggle(courtNum);
                        }
                      : undefined
                }
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg">Court {courtNum}</h4>
                    {status !== 'available' && status !== 'wet' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActions(courtNum);
                        }}
                        className="p-1 hover:bg-white/50 rounded"
                      >
                        <span style={{ fontSize: '18px' }}>☰</span>
                      </button>
                    )}
                  </div>

                  {(status === 'occupied' || status === 'overtime') && info && (
                    <div
                      className={`text-xs font-medium ${
                        status === 'overtime' ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {formatTimeRemaining(info.endTime, currentTime)}
                    </div>
                  )}

                  {info && (
                    <div className="mt-1">
                      {status === 'wet' && (
                        <>
                          <p className="font-medium text-sm">💧 WET COURT</p>
                          <p className="text-xs text-gray-600">Click to mark dry</p>
                        </>
                      )}
                      {status === 'blocked' && (
                        <>
                          <p className="font-medium text-sm truncate">{info.reason}</p>
                          <p className="text-xs text-gray-600">
                            Until{' '}
                            {new Date(info.endTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      )}
                      {(status === 'occupied' || status === 'overtime') && (
                        <>
                          <p className="font-medium text-sm truncate">
                            {getPlayerNames(info.players)}
                          </p>
                          <p className="text-xs text-gray-600">
                            Since{' '}
                            {new Date(info.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {canReceiveMove && (
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium text-green-700">Click to move here</p>
                    </div>
                  )}
                </div>

                {showActions === courtNum && status !== 'available' && status !== 'wet' && (
                  <div className="absolute top-12 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {status !== 'blocked' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateMove(courtNum);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <RefreshCw size={14} />
                          Move Players
                        </div>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(courtNum, info);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Edit2 size={14} />
                        Edit {info.type === 'block' ? 'Block' : 'Game'}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearCourt(courtNum);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                    >
                      <div className="flex items-center gap-2">
                        <X size={14} />
                        Clear Court
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={wetCourtsActive ? deactivateWetCourts : handleEmergencyWetCourt}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${
              wetCourtsActive
                ? 'bg-gray-600 text-white border-blue-400 ring-1 ring-blue-400 shadow-md'
                : 'bg-blue-50 hover:bg-blue-100 text-gray-700 border-blue-300 hover:border-blue-400'
            }`}
          >
            <Droplets size={20} />
            WET COURTS
            {wetCourts && wetCourts.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {wetCourts.size}
              </span>
            )}
          </button>

          {wetCourts && wetCourts.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                💧 Click wet courts as they dry to resume normal operations
              </span>
              <button
                onClick={handleAllCourtsDry}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
              >
                All Courts Dry
              </button>
            </div>
          )}
        </div>
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
