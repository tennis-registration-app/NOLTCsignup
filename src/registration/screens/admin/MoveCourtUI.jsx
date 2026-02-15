// @ts-check
import React from 'react';

/**
 * MoveCourtUI - UI for moving players from one court to another
 */
const MoveCourtUI = ({ courtToMove, setCourtToMove, data, onMoveCourt, CONSTANTS }) => (
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
);

export default MoveCourtUI;
