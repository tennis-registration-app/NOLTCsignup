// @ts-check
/**
 * AdminScreen Component
 * Admin panel for court management, waitlist management, and system settings.
 * All state is managed by parent (App.jsx) - this component receives state and callbacks as props.
 */
import React from 'react';
import { Check, AlertDisplay, ToastHost } from '../components';

const AdminScreen = ({
  // Data
  data,
  currentTime,

  // Alert state (read only)
  showAlert,
  alertMessage,

  // Block modal state
  showBlockModal,
  setShowBlockModal,
  selectedCourtsToBlock,
  setSelectedCourtsToBlock,
  blockMessage,
  setBlockMessage,
  blockStartTime,
  setBlockStartTime,
  blockEndTime,
  setBlockEndTime,
  blockingInProgress,
  setBlockingInProgress,

  // Move state
  courtToMove,
  setCourtToMove,
  waitlistMoveFrom,
  setWaitlistMoveFrom,

  // Price state
  ballPriceInput,
  setBallPriceInput,
  priceError,
  setPriceError,
  showPriceSuccess,
  setShowPriceSuccess,

  // Callbacks (handlers defined in App.jsx)
  onClearAllCourts,
  onClearCourt,
  onCancelBlock,
  onBlockCreate,
  onMoveCourt,
  onClearWaitlist,
  onRemoveFromWaitlist,
  onReorderWaitlist,
  onPriceUpdate,
  onExit,
  showAlertMessage,

  // Utilities
  getCourtBlockStatus,
  CONSTANTS,
  // TENNIS_CONFIG available if needed
}) => {
  const now = new Date();

  // Compute derived values from data
  const occupiedCourts = data.courts.filter(
    (court) => court !== null && court.session?.group?.players?.length > 0 && !court.wasCleared
  );

  const overtimeCourts = data.courts.filter(
    (court) =>
      court &&
      court.session?.group?.players?.length > 0 &&
      !court.wasCleared &&
      new Date(court.session?.scheduledEndAt) <= currentTime
  );

  // Count only currently blocked courts
  const blockedCourts = data.courts.filter((court) => {
    if (!court || !court.blocked || !court.blocked.startTime || !court.blocked.endTime)
      return false;
    const blockStartTime = new Date(court.blocked.startTime);
    const blockEndTime = new Date(court.blocked.endTime);
    return now >= blockStartTime && now < blockEndTime;
  });

  console.log('Admin data loaded:', {
    totalCourts: data.courts.length,
    occupied: occupiedCourts.length,
    blocked: blockedCourts.length,
    blockedDetails: blockedCourts,
  });

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-8 flex items-center justify-center">
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-6xl h-full max-h-[95vh] overflow-y-auto scrollbar-hide">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400 text-sm sm:text-base">System management and controls</p>
        </div>

        {/* Court Management */}
        <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Court Management
              <span className="text-sm sm:text-lg font-normal text-gray-400 block sm:inline sm:ml-3">
                ({occupiedCourts.length} occupied, {overtimeCourts.length} overtime)
              </span>
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setShowBlockModal(true);
                  setSelectedCourtsToBlock([]);
                  setBlockMessage('');
                  setBlockStartTime('');
                  setBlockEndTime('');
                  setBlockingInProgress(false);
                }}
                className="bg-yellow-700 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-yellow-800 transition-colors flex-1 sm:flex-initial"
              >
                Block Courts
              </button>
              <button
                onClick={onClearAllCourts}
                className="bg-orange-600 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-700 transition-colors flex-1 sm:flex-initial"
              >
                Clear All Courts
              </button>
            </div>
          </div>

          {/* Block Courts Modal */}
          {showBlockModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto modal-mobile-full">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Block Courts</h3>

                {/* Court Selection */}
                <div className="mb-4">
                  <label className="block text-white mb-2 text-sm sm:text-base">
                    Select Courts to Block
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
                    {[...Array(CONSTANTS.COURT_COUNT)].map((_, index) => {
                      const courtNum = index + 1;
                      const isSelected = selectedCourtsToBlock.includes(courtNum);

                      return (
                        <button
                          key={courtNum}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCourtsToBlock(
                                selectedCourtsToBlock.filter((c) => c !== courtNum)
                              );
                            } else {
                              setSelectedCourtsToBlock([...selectedCourtsToBlock, courtNum]);
                            }
                            setBlockingInProgress(false);
                          }}
                          className={`py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Court {courtNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      if (selectedCourtsToBlock.length === CONSTANTS.COURT_COUNT) {
                        setSelectedCourtsToBlock([]);
                      } else {
                        setSelectedCourtsToBlock(
                          [...Array(CONSTANTS.COURT_COUNT)].map((_, i) => i + 1)
                        );
                      }
                      setBlockingInProgress(false);
                    }}
                    className="text-yellow-400 text-xs sm:text-sm hover:text-yellow-300"
                  >
                    {selectedCourtsToBlock.length === CONSTANTS.COURT_COUNT
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                {/* Message Selection */}
                <div className="mb-4">
                  <label className="block text-white mb-2 text-sm sm:text-base">Block Reason</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      onClick={() => {
                        setBlockMessage('WET COURT');
                        setBlockingInProgress(false);
                      }}
                      className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                        blockMessage === 'WET COURT'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      WET COURT
                    </button>
                    <button
                      onClick={() => {
                        setBlockMessage('COURT WORK');
                        setBlockingInProgress(false);
                      }}
                      className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                        blockMessage === 'COURT WORK'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      COURT WORK
                    </button>
                    <button
                      onClick={() => {
                        setBlockMessage('LESSON');
                        setBlockingInProgress(false);
                      }}
                      className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                        blockMessage === 'LESSON'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      LESSON
                    </button>
                  </div>
                  <input
                    type="text"
                    value={blockMessage}
                    onChange={(e) => {
                      setBlockMessage(e.target.value);
                      setBlockingInProgress(false);
                    }}
                    placeholder="Or enter custom message..."
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none text-sm sm:text-base"
                  />
                </div>

                {/* Time Selection */}
                <div className="mb-4">
                  <label className="block text-white mb-2 text-sm sm:text-base">Start Time</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => {
                        setBlockStartTime('now');
                        setBlockingInProgress(false);
                      }}
                      className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
                        blockStartTime === 'now'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      Now
                    </button>
                    <input
                      type="time"
                      value={blockStartTime === 'now' ? '' : blockStartTime}
                      onChange={(e) => {
                        setBlockStartTime(e.target.value);
                        setBlockingInProgress(false);
                      }}
                      className="p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="mb-4 sm:mb-6">
                  <label className="block text-white mb-2 text-sm sm:text-base">End Time</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <button
                      onClick={() => {
                        const end = new Date();
                        if (blockStartTime && blockStartTime !== 'now') {
                          const [hours, minutes] = blockStartTime.split(':');
                          end.setHours(parseInt(hours), parseInt(minutes));
                        }
                        end.setHours(end.getHours() + 1);
                        const endHours = end.getHours().toString().padStart(2, '0');
                        const endMinutes = end.getMinutes().toString().padStart(2, '0');
                        setBlockEndTime(`${endHours}:${endMinutes}`);
                        setBlockingInProgress(false);
                      }}
                      className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
                    >
                      +1 hour
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date();
                        if (blockStartTime && blockStartTime !== 'now') {
                          const [hours, minutes] = blockStartTime.split(':');
                          end.setHours(parseInt(hours), parseInt(minutes));
                        }
                        end.setHours(end.getHours() + 2);
                        const endHours = end.getHours().toString().padStart(2, '0');
                        const endMinutes = end.getMinutes().toString().padStart(2, '0');
                        setBlockEndTime(`${endHours}:${endMinutes}`);
                      }}
                      className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
                    >
                      +2 hours
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date();
                        if (blockStartTime && blockStartTime !== 'now') {
                          const [hours, minutes] = blockStartTime.split(':');
                          end.setHours(parseInt(hours), parseInt(minutes));
                        }
                        end.setHours(end.getHours() + 4);
                        const endHours = end.getHours().toString().padStart(2, '0');
                        const endMinutes = end.getMinutes().toString().padStart(2, '0');
                        setBlockEndTime(`${endHours}:${endMinutes}`);
                      }}
                      className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
                    >
                      +4 hours
                    </button>
                  </div>
                  <input
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => {
                      setBlockEndTime(e.target.value);
                      setBlockingInProgress(false);
                    }}
                    required
                    className="p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none w-full text-sm sm:text-base"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowBlockModal(false)}
                    className="px-4 sm:px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm sm:text-base"
                  >
                    Close
                  </button>
                  <button
                    onClick={onBlockCreate}
                    disabled={blockingInProgress}
                    className={`px-4 sm:px-6 py-2 rounded transition-colors text-sm sm:text-base ${
                      blockingInProgress
                        ? 'bg-yellow-400 text-white cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    {blockingInProgress ? 'Applied' : 'Apply Blocks'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Move Court UI */}
          {courtToMove && (
            <div className="mb-4 p-3 sm:p-4 bg-blue-900/30 border-2 border-blue-600 rounded-lg">
              <p className="text-white font-medium mb-3 text-sm sm:text-base">
                Moving players from Court {courtToMove} to:
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                {[...Array(CONSTANTS.COURT_COUNT)].map((_, index) => {
                  const targetCourtNum = index + 1;
                  const isOccupied = data.courts[index] !== null;
                  const isCurrent = targetCourtNum === courtToMove;

                  return (
                    <button
                      key={targetCourtNum}
                      disabled={isOccupied || isCurrent}
                      onClick={() => onMoveCourt(courtToMove, targetCourtNum)}
                      className={`py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                        isCurrent
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isOccupied
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Court {targetCourtNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCourtToMove(null)}
                className="bg-gray-600 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(12)].map((_, index) => {
              const court = data.courts[index];
              const courtNum = index + 1;

              // Check block status using unified system only
              let blockStatus = null;
              const blockStatusResult = getCourtBlockStatus(courtNum);

              if (blockStatusResult && blockStatusResult.isBlocked) {
                blockStatus = blockStatusResult.isCurrent ? 'current' : 'future';
              }

              const isBlocked = blockStatus === 'current';
              const isFutureBlock = blockStatus === 'future';
              const isCleared = court && court.wasCleared;
              // Domain format: court.session.group.players, court.session.scheduledEndAt
              const sessionPlayers = court?.session?.group?.players;
              const sessionEndTime = court?.session?.scheduledEndAt;
              const isOccupied = court && sessionPlayers?.length > 0 && !isCleared;
              const isOvertime =
                court &&
                sessionEndTime &&
                !isBlocked &&
                !isCleared &&
                new Date(sessionEndTime) <= currentTime;
              const timeRemaining =
                court && sessionEndTime && !isBlocked && !isCleared
                  ? Math.max(
                      0,
                      Math.floor(
                        (new Date(sessionEndTime).getTime() - currentTime.getTime()) / 60000
                      )
                    )
                  : 0;

              return (
                <div
                  key={courtNum}
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    isBlocked
                      ? 'bg-red-900 border-red-700'
                      : isFutureBlock
                        ? 'bg-yellow-900 border-yellow-700'
                        : !court
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-gray-700 border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 sm:gap-4 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-white">
                          Court {courtNum}
                        </h3>
                        {isOccupied && !isBlocked && (
                          <span className={`text-xs sm:text-sm font-medium text-gray-400`}>
                            {isOvertime ? 'Overtime' : `${timeRemaining} min remaining`}
                          </span>
                        )}
                      </div>
                      {isBlocked ? (
                        <div>
                          <p className="text-red-400 font-medium text-sm sm:text-base">
                            🚫 {blockStatusResult ? blockStatusResult.reason : 'BLOCKED'}
                          </p>

                          <p className="text-gray-400 text-xs sm:text-sm">
                            Until{' '}
                            {new Date(blockStatusResult.endTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ) : isFutureBlock ? (
                        <div>
                          <p className="text-yellow-400 font-medium text-sm sm:text-base">
                            Future: {blockStatusResult.reason}
                          </p>
                          <p className="text-gray-400 text-xs sm:text-sm">
                            {new Date(blockStatusResult.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(blockStatusResult.endTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ) : isOccupied ? (
                        <div>
                          <div className="flex flex-col">
                            {sessionPlayers.map((player, idx) => (
                              <span key={idx} className="text-gray-300 text-xs sm:text-sm">
                                {player.name?.split(' ').pop() ||
                                  player.displayName?.split(' ').pop() ||
                                  'Unknown'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : isCleared ? (
                        <p className="text-gray-500 text-xs sm:text-sm">
                          Available (History Preserved)
                        </p>
                      ) : (
                        <p className="text-gray-500 text-xs sm:text-sm">Available</p>
                      )}
                    </div>
                    {(isOccupied || isBlocked || isFutureBlock) && (
                      <div className="flex flex-col gap-1 ml-2">
                        {!isBlocked && !isFutureBlock && isOccupied && (
                          <button
                            onClick={() => setCourtToMove(courtNum)}
                            className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-700 transition-colors"
                          >
                            Move
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Check if court has an active block from API data
                            if (court && court.block && court.block.id) {
                              onCancelBlock(court.block.id, courtNum);
                            } else if (isOccupied) {
                              onClearCourt(courtNum);
                            } else {
                              showAlertMessage(`Court ${courtNum} has nothing to clear`);
                            }
                          }}
                          className="bg-orange-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-orange-700 transition-colors"
                        >
                          {court && court.block ? 'Unblock' : 'Clear'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Waitlist Management */}
        <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Waitlist Management
              <span className="text-sm sm:text-lg font-normal text-gray-400 block sm:inline sm:ml-3">
                ({data.waitlist.length} groups waiting)
              </span>
            </h2>
            {data.waitlist.length > 0 && (
              <button
                onClick={onClearWaitlist}
                className="bg-orange-600 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-700 transition-colors w-full sm:w-auto"
              >
                Clear Waitlist
              </button>
            )}
          </div>
          {data.waitlist.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm sm:text-base">
              No groups in waitlist
            </p>
          ) : (
            <div className="space-y-3">
              {waitlistMoveFrom !== null && (
                <div className="mb-4 p-3 sm:p-4 bg-blue-900/30 border-2 border-blue-600 rounded-lg">
                  <p className="text-white font-medium mb-3 text-sm sm:text-base">
                    Moving group from position {waitlistMoveFrom + 1} to:
                  </p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {data.waitlist.map((_, index) => {
                      const position = index + 1;
                      const isCurrentPosition = index === waitlistMoveFrom;

                      return (
                        <button
                          key={position}
                          disabled={isCurrentPosition}
                          onClick={() => onReorderWaitlist(waitlistMoveFrom, index)}
                          className={`py-2 px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                            isCurrentPosition
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Position {position}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setWaitlistMoveFrom(null)}
                    className="bg-gray-600 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {data.waitlist.map((group, index) => (
                <div
                  key={index}
                  className="bg-gray-700 p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm sm:text-base">
                      Position {index + 1}:{' '}
                      {(group.group?.players || [])
                        .map((p) => p.displayName || 'Unknown')
                        .join(', ')}
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      {(group.group?.players || []).length} player
                      {(group.group?.players || []).length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setWaitlistMoveFrom(index)}
                      className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                    >
                      Move
                    </button>
                    <button
                      onClick={() => onRemoveFromWaitlist(group, index)}
                      className="bg-orange-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-orange-700 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Settings */}
        <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">System Settings</h2>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-medium text-white">Tennis Ball Price</h3>
                <p className="text-xs sm:text-sm text-gray-400">
                  Set the price for tennis ball purchases
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    max="50.00"
                    value={ballPriceInput}
                    onChange={(e) => {
                      setBallPriceInput(e.target.value);
                      setPriceError('');
                      setShowPriceSuccess(false);
                    }}
                    className="pl-8 pr-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none w-full sm:w-24"
                  />
                </div>

                <button
                  onClick={onPriceUpdate}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  Save
                </button>
              </div>
            </div>

            {showPriceSuccess && (
              <div className="mt-2 text-green-400 text-xs sm:text-sm flex items-center gap-2">
                {/* @ts-expect-error - lucide-react Check accepts className but types incomplete */}
                <Check size={14} className="sm:w-4 sm:h-4" />
                Price updated successfully
              </div>
            )}

            {priceError && <div className="mt-2 text-red-400 text-xs sm:text-sm">{priceError}</div>}
          </div>
        </div>

        {/* Exit Admin */}
        <div className="flex justify-center">
          <button
            onClick={onExit}
            className="bg-gray-600 text-white py-2 sm:py-3 px-6 sm:px-8 rounded-xl text-base sm:text-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Exit Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminScreen;
