import React from 'react';
import { Users, AlertCircle } from './Icons';

/**
 * WaitingList - Display panel for groups waiting to play
 * Shows wait times calculated using domain availability functions
 */
export function WaitingList({
  waitlist,
  courts,
  currentTime: _currentTime,
  courtBlocks = [],
  upcomingBlocks = [],
  maxWaitingDisplay = 4,
}) {
  const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
  const W = window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist;

  // Convert React courts state to the data format expected by availability functions
  // This uses the passed props instead of reading from localStorage
  const courtsToData = (courtsArray) => ({ courts: courtsArray || [] });

  // Calculate estimated wait time using domain functions
  const calculateEstimatedWaitTime = (position) => {
    try {
      if (!A || !W) {
        return position * 15; // Fallback to simple estimate
      }

      const now = new Date();
      const data = courtsToData(courts); // Use React state instead of localStorage
      // Combine active blocks and future blocks for accurate availability calculation
      const blocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];

      // Derive wetSet for current moment
      const wetSet = new Set(
        blocks
          .filter((b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
          .map((b) => b.courtNumber)
      );

      // Get availability info
      const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
      const nextTimes = A.getNextFreeTimes ? A.getNextFreeTimes({ data, now, blocks, wetSet }) : [];

      // Calculate ETA using domain waitlist function
      if (W.estimateWaitForPositions) {
        const avgGame = window.Tennis?.Config?.Timing?.AVG_GAME || 75;
        const etas = W.estimateWaitForPositions({
          positions: [position],
          currentFreeCount: info.free?.length || 0,
          nextFreeTimes: nextTimes,
          avgGameMinutes: avgGame,
        });
        return etas[0] || 0;
      }

      return position * 15; // Fallback
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return position * 15; // Fallback
    }
  };

  // Check if a group can register now (courts are available)
  const canGroupRegisterNow = (idx) => {
    try {
      if (!A) return false;

      const now = new Date();
      const data = courtsToData(courts); // Use React state instead of localStorage
      // Combine active blocks and future blocks for accurate availability calculation
      const blocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];
      const wetSet = new Set(
        blocks
          .filter((b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
          .map((b) => b.courtNumber)
      );

      if (A.getFreeCourtsInfo) {
        const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
        const freeCount = info.free?.length || 0;
        const overtimeCount = info.overtime?.length || 0;
        const availableCount = freeCount > 0 ? freeCount : overtimeCount;

        if (idx === 0) {
          // First group can register if any courts available
          return availableCount > 0;
        } else if (idx === 1) {
          // Second group can register if 2+ courts available
          return availableCount >= 2;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error checking if group can register:', error);
      return false;
    }
  };

  return (
    <div className="bg-slate-700/50 p-4 rounded-xl backdrop-blur h-full overflow-hidden flex flex-col">
      <h3
        className={`font-bold mb-3 flex items-center justify-between ${
          waitlist.length === 0 ? 'text-gray-400' : 'text-yellow-400'
        }`}
      >
        <div className="flex items-center courtboard-text-xl">
          <Users className={`mr-5 ${waitlist.length === 0 ? 'icon-grey' : ''}`} size={24} />
          Waiting
        </div>
        {waitlist.length > 0 && (
          <span className="courtboard-text-sm text-emerald-400 font-normal">Estimated Time</span>
        )}
      </h3>

      {waitlist.length === 0 ? (
        <div className="text-center flex-1 flex flex-col justify-start pt-8">
          <p className="text-gray-400 courtboard-text-base">No groups waiting</p>
          <p className="text-gray-500 courtboard-text-sm mt-4">Register at the iPad station</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto mt-4">
          {waitlist.slice(0, maxWaitingDisplay).map((group, idx) => {
            // Check if this group can actually register now
            const canRegisterNow = canGroupRegisterNow(idx);

            // Calculate proper estimated wait time
            let estimatedWait = 0;
            if (!canRegisterNow) {
              estimatedWait = calculateEstimatedWaitTime(idx + 1);
            }

            // Show "You're Up!" only if they can actually register now
            const showAlert = canRegisterNow;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-lg courtboard-text-sm ${
                  idx === 0 && estimatedWait < 5
                    ? 'bg-gradient-to-r from-green-600/30 to-green-500/30 border-2 border-green-400'
                    : 'bg-slate-600/50'
                }`}
              >
                <div className="flex items-center flex-1">
                  <span className="courtboard-waiting-number font-bold mr-2 text-green-400">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <span className="courtboard-text-sm font-medium player-name">
                      {(group.names || [])
                        .map((name) => {
                          const names = name.split(' ');
                          return names[names.length - 1];
                        })
                        .join(' / ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showAlert && (
                    <div className="flex items-center text-yellow-400 animate-pulse">
                      <AlertCircle className="mr-1" size={16} />
                      <span className="courtboard-text-xs font-bold">You&apos;re Up!</span>
                    </div>
                  )}
                  {!showAlert && (
                    <div className="courtboard-text-xs text-gray-300 font-medium min-w-[40px] text-right">
                      {estimatedWait} min
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
