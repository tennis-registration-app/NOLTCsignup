import React from 'react';
import { Users, AlertCircle } from './Icons';
import { getTennisDomain, getTennisNamespaceConfig } from '../../platform/windowBridge.js';
import { isCourtEligibleForGroup } from '../../lib/types/domain.js';
import { getUpcomingBlockWarningFromBlocks } from '@lib';

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
  maxWaitingDisplay,
}) {
  const domain = getTennisDomain();
  const A = domain?.availability || domain?.Availability;
  const W = domain?.Waitlist || domain?.waitlist;

  // Convert React courts state to the data format expected by availability functions
  const courtsToData = (courtsArray) => ({ courts: courtsArray || [] });

  // Calculate all estimated wait times using new simulation function
  const calculateAllEstimatedWaitTimes = () => {
    try {
      if (!W?.simulateWaitlistEstimates) {
        // Fallback to simple estimate if function not available
        return waitlist.map((_, idx) => (idx + 1) * 15);
      }

      const now = new Date();
      const allBlocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];

      return W.simulateWaitlistEstimates({
        courts: courts || [],
        waitlist: waitlist || [],
        blocks: allBlocks,
        now,
        avgGameMinutes: getTennisNamespaceConfig()?.Timing?.AVG_GAME || 75,
      });
    } catch (error) {
      console.error('Error calculating wait times:', error);
      return waitlist.map((_, idx) => (idx + 1) * 15);
    }
  };

  // Calculate all wait times once before rendering
  const estimatedWaitTimes = calculateAllEstimatedWaitTimes();

  // Count full-time courts for a group (used by deferred groups for CTA eligibility)
  const countFullTimeCourts = (groupPlayerCount) => {
    const allBlocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];
    const now = new Date();
    const data = courtsToData(courts);
    const wetSet = new Set(
      allBlocks
        .filter((b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
        .map((b) => b.courtNumber)
    );

    if (!A?.getFreeCourtsInfo) return 0;
    const info = A.getFreeCourtsInfo({ data, now, blocks: allBlocks, wetSet });
    const eligibleFree = (info.free || []).filter((courtNum) =>
      isCourtEligibleForGroup(courtNum, groupPlayerCount)
    );
    const eligibleOvertime = (info.overtime || []).filter((courtNum) =>
      isCourtEligibleForGroup(courtNum, groupPlayerCount)
    );
    const eligibleCourts = eligibleFree.length > 0 ? eligibleFree : eligibleOvertime;

    // No blocks = all courts have full time
    if (allBlocks.length === 0) return eligibleCourts.length;

    const sessionDuration = groupPlayerCount >= 4 ? 90 : 60;
    return eligibleCourts.filter((courtNum) => {
      const warning = getUpcomingBlockWarningFromBlocks(
        courtNum,
        sessionDuration + 5,
        allBlocks,
        now
      );
      return warning == null; // null = no restriction = full time
    }).length;
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

        // Filter courts by singles-only eligibility for this group's player count
        const groupPlayerCount = waitlist[idx]?.players?.length || 0;
        const isDeferred = waitlist[idx]?.deferred ?? false;
        const eligibleFree = (info.free || []).filter((courtNum) =>
          isCourtEligibleForGroup(courtNum, groupPlayerCount)
        );
        const eligibleOvertime = (info.overtime || []).filter((courtNum) =>
          isCourtEligibleForGroup(courtNum, groupPlayerCount)
        );
        const totalAvailable =
          eligibleFree.length > 0 ? eligibleFree.length : eligibleOvertime.length;

        // Deferred groups count only full-time courts
        const availableCount = isDeferred ? countFullTimeCourts(groupPlayerCount) : totalAvailable;

        if (idx === 0) {
          // First group can register if any eligible courts available
          return availableCount > 0;
        } else if (idx === 1) {
          // If first group has no eligible courts, second group only needs 1
          const firstGroupCanPlay = canGroupRegisterNow(0);
          const courtsNeeded = firstGroupCanPlay ? 2 : 1;
          return availableCount >= courtsNeeded;
        } else {
          // Position 2+: only show "You're Up!" if NO group ahead can play
          const anyAheadCanPlay = Array.from({ length: idx }, (_, i) => i).some((i) =>
            canGroupRegisterNow(i)
          );
          if (anyAheadCanPlay) return false;
          return availableCount >= 1;
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

            // Get pre-calculated estimated wait time for this position
            const estimatedWait = canRegisterNow ? 0 : estimatedWaitTimes[idx] || 0;

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
                  {group.deferred && !canRegisterNow ? (
                    <div
                      data-testid="deferred-label"
                      className="courtboard-text-xs text-blue-400 font-medium text-right"
                    >
                      <div>Waiting for full court</div>
                      {estimatedWaitTimes[idx] > 0 && (
                        <div className="text-gray-400">~{estimatedWaitTimes[idx]} min</div>
                      )}
                    </div>
                  ) : showAlert ? (
                    <div
                      data-testid="you-are-up"
                      className="flex items-center text-yellow-400 animate-pulse"
                    >
                      <AlertCircle className="mr-1" size={16} />
                      <span className="courtboard-text-xs font-bold">You&apos;re Up!</span>
                    </div>
                  ) : (
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
