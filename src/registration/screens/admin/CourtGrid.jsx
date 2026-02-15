// @ts-check
import React from 'react';

/**
 * CourtGrid - Grid of court cards showing status
 */
const CourtGrid = ({
  data,
  currentTime,
  setCourtToMove,
  onClearCourt,
  onCancelBlock,
  showAlertMessage,
  getCourtBlockStatus,
}) => (
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
              Math.floor((new Date(sessionEndTime).getTime() - currentTime.getTime()) / 60000)
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
                <h3 className="text-base sm:text-lg font-bold text-white">Court {courtNum}</h3>
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
                <p className="text-gray-500 text-xs sm:text-sm">Available (History Preserved)</p>
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
);

export default CourtGrid;
