// @ts-check
import React from 'react';

/**
 * WaitlistManagement - Waitlist management section
 */
const WaitlistManagement = ({
  data,
  waitlistMoveFrom,
  setWaitlistMoveFrom,
  onClearWaitlist,
  onRemoveFromWaitlist,
  onReorderWaitlist,
}) => (
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
      <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No groups in waitlist</p>
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
                {(group.group?.players || []).map((p) => p.displayName || 'Unknown').join(', ')}
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
);

export default WaitlistManagement;
