import React from 'react';
import { TennisBall } from './Icons';
import { ReservedCourtsPanel, selectReservedItemsFromBlocks } from './ReservedCourtsPanel';

/**
 * NextAvailablePanel - Display panel showing next available courts
 * Shows timeline of when courts will become available
 */
export function NextAvailablePanel({
  courts,
  currentTime,
  waitlist = [],
  blocks = [],
  operatingHours = [],
  maxDisplay,
}) {
  const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;

  // Convert React courts state to the data format expected by availability functions
  const courtsToData = (courtsArray) => ({ courts: courtsArray || [] });

  // Calculate court availability timeline
  const getCourtAvailabilityTimeline = (waitlist = []) => {
    if (!courts || !Array.isArray(courts)) {
      return [];
    }

    // Registration buffer: 15 minutes before block starts
    const REGISTRATION_BUFFER_MS = 15 * 60 * 1000;
    // Minimum useful session: 20 minutes
    const MIN_USEFUL_SESSION_MS = 20 * 60 * 1000;

    // Get today's closing time from admin-configured operating hours
    // Handle both array format [{ dayOfWeek, closesAt }] and legacy object { opensAt, closesAt }
    const todayDayOfWeek = currentTime.getDay(); // 0=Sun, 1=Mon, etc.
    const todayHours = Array.isArray(operatingHours)
      ? operatingHours.find((h) => h.dayOfWeek === todayDayOfWeek)
      : operatingHours;
    // closesAt format is "HH:MM:SS" (e.g., "21:00:00") or "HH:MM"
    const closingHour = todayHours?.closesAt ? parseInt(todayHours.closesAt.split(':')[0], 10) : 23; // fallback to 11pm if no config
    const closingTime = new Date(currentTime);
    closingTime.setHours(closingHour, 0, 0, 0);
    const closingBufferTime = new Date(closingTime.getTime() - REGISTRATION_BUFFER_MS);

    const courtAvailability = [];
    const overtimeCourts = [];
    const emptyCourts = [];

    // blocks prop is already merged by parent

    // Check if ALL courts are currently wet
    const activeWetBlocks = blocks.filter(
      (block) =>
        block.isWetCourt === true &&
        new Date(block.startTime) <= currentTime &&
        new Date(block.endTime) > currentTime
    );
    const wetCourtNumbers = new Set(activeWetBlocks.map((block) => block.courtNumber));

    // If all courts are wet, return special marker
    const totalCourts = courts.length;
    if (wetCourtNumbers.size === totalCourts && totalCourts > 0) {
      return [{ allCourtsWet: true }];
    }

    // Check each court for availability
    courts.forEach((court, index) => {
      const courtNumber = index + 1;

      // Tournament courts have no predictable end time — exclude entirely
      if (court?.session?.isTournament) return;

      let endTime = null;

      // Check for blocks that affect this court's availability
      let blockingUntil = null;

      // First check currently active blocks (including those starting within buffer)
      const activeBlock = blocks.find(
        (block) =>
          block.courtNumber === courtNumber &&
          new Date(block.startTime).getTime() - REGISTRATION_BUFFER_MS <= currentTime.getTime() &&
          new Date(block.endTime) > currentTime
      );

      if (activeBlock) {
        blockingUntil = activeBlock.endTime;
      } else if (court) {
        // Court has players - check for overtime or regular game
        if (court.session && court.session.scheduledEndAt) {
          endTime = court.session.scheduledEndAt;
        } else if (court.endTime) {
          endTime = court.endTime;
        }

        // Check for future blocks that would overlap with game availability
        // Extend to block end if:
        // 1. Block starts before or within buffer of session end, OR
        // 2. Gap between session end and block start < 20 min (not useful)
        if (endTime) {
          const gameEndTime = new Date(endTime).getTime();
          const futureBlock = blocks.find(
            (block) =>
              block.courtNumber === courtNumber &&
              new Date(block.startTime).getTime() > currentTime.getTime() &&
              (new Date(block.startTime).getTime() - REGISTRATION_BUFFER_MS < gameEndTime ||
                new Date(block.startTime).getTime() - gameEndTime < MIN_USEFUL_SESSION_MS) &&
              new Date(block.endTime).getTime() > currentTime.getTime()
          );

          if (futureBlock) {
            blockingUntil = futureBlock.endTime;
          }
        }

        // Check if this is an overtime court (game has exceeded scheduled duration)
        if (endTime) {
          const parsedEndTime = new Date(endTime);
          // Domain format: session.group.players
          const hasPlayers = court.session?.group?.players?.length > 0;

          if (hasPlayers && parsedEndTime <= currentTime) {
            // Check if a block starts within buffer OR within 20 min (not useful session)
            const imminentBlock = blocks.find(
              (block) =>
                block.courtNumber === courtNumber &&
                new Date(block.startTime).getTime() > currentTime.getTime() &&
                (new Date(block.startTime).getTime() - REGISTRATION_BUFFER_MS <=
                  currentTime.getTime() ||
                  new Date(block.startTime).getTime() - currentTime.getTime() <
                    MIN_USEFUL_SESSION_MS)
            );

            if (imminentBlock) {
              // Don't show as "Now" - extend availability to after the block
              blockingUntil = imminentBlock.endTime;
            } else {
              overtimeCourts.push({
                courtNumber,
                endTime: null, // Special marker for "Now"
                isOvertime: true,
              });
              return; // Don't add to regular availability
            }
          }
        }
      }

      // Use the blocking time if blocks interfere, otherwise use game end time
      const finalEndTime = blockingUntil || endTime;

      // Parse and validate the end time for future availability
      if (finalEndTime) {
        try {
          const parsedEndTime = new Date(finalEndTime);
          // Exclude if availability is within buffer of closing time
          if (
            !isNaN(parsedEndTime.getTime()) &&
            parsedEndTime > currentTime &&
            parsedEndTime <= closingBufferTime
          ) {
            courtAvailability.push({
              courtNumber,
              endTime: parsedEndTime,
            });
          }
        } catch (error) {
          console.error(`Error parsing end time for court ${courtNumber}:`, error);
        }
      } else {
        // Empty court (no session, no active block) - available now
        // Check for upcoming blocks that would limit available time
        const hasSession = court?.session?.group?.players?.length > 0;
        if (!hasSession && !activeBlock) {
          const upcomingBlock = blocks.find(
            (block) =>
              block.courtNumber === courtNumber &&
              new Date(block.startTime) > currentTime &&
              new Date(block.startTime) <= closingBufferTime
          );

          // Calculate minutes until block starts (if any)
          const minutesUntilBlock = upcomingBlock
            ? Math.floor(
                (new Date(upcomingBlock.startTime).getTime() - currentTime.getTime()) / 60000
              )
            : null;

          emptyCourts.push({
            courtNumber,
            endTime: null,
            isEmpty: true,
            minutesUntilBlock,
          });
        }
      }
    });

    // Sort future availability by time
    courtAvailability.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

    // Check if we should show overtime courts as "Now"
    // Only show overtime as available if there aren't surplus empty courts
    let filteredOvertimeCourts = overtimeCourts;

    try {
      if (A && A.getFreeCourtsInfo) {
        const now = new Date();
        const data = courtsToData(courts); // Use React state instead of localStorage
        const wetSet = new Set(
          blocks
            .filter(
              (b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
            )
            .map((b) => b.courtNumber)
        );
        const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
        const emptyCount = info.free ? info.free.length : 0;
        const waitingCount = waitlist.length;

        // If there are surplus empty courts, overtime courts aren't truly "available now"
        if (emptyCount > waitingCount) {
          filteredOvertimeCourts = [];
        }
      }
    } catch (error) {
      console.error('Error filtering overtime courts:', error);
    }

    // Combine: empty courts first, then overtime, then future availability
    // Sort empty courts by court number for consistent display
    emptyCourts.sort((a, b) => a.courtNumber - b.courtNumber);
    return [...emptyCourts, ...filteredOvertimeCourts, ...courtAvailability];
  };

  const timeline = getCourtAvailabilityTimeline(waitlist);

  // Calculate if courts are available after serving the waitlist
  let emptyCourtCount = 0;
  try {
    if (A && A.getFreeCourtsInfo) {
      const now = new Date();
      const data = courtsToData(courts); // Use React state instead of localStorage
      const wetSet = new Set(
        blocks
          .filter((b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now)
          .map((b) => b.courtNumber)
      );
      const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
      emptyCourtCount = info.free ? info.free.length : 0;
    }
  } catch (error) {
    console.error('Error getting free court count:', error);
  }

  // Modified logic: Show "available now" if more empty courts than waiting groups
  const surplusCourts = emptyCourtCount - waitlist.length;
  const hasAvailableNow = surplusCourts > 0;

  // Check club hours for closed message
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTimeDecimal = currentHour + currentMinutes / 60;
  const dayOfWeek = currentTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const openingTime = isWeekend ? 7 : 6.5; // 7:00 AM weekend, 6:30 AM weekday
  const openingTimeString = isWeekend ? '7:00 AM' : '6:30 AM';

  // Get closing time for display (uses same logic as getCourtAvailabilityTimeline)
  // Handle both array format [{ dayOfWeek, closesAt }] and legacy object { opensAt, closesAt }
  const todayHours = Array.isArray(operatingHours)
    ? operatingHours.find((h) => h.dayOfWeek === dayOfWeek)
    : operatingHours;
  const closingHour = todayHours?.closesAt ? parseInt(todayHours.closesAt.split(':')[0], 10) : 23;
  const closingDisplay = todayHours?.closesAt
    ? todayHours.closesAt.replace(/^(\d{1,2}):(\d{2}).*$/, (_, h, m) => {
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${m} ${ampm}`;
      })
    : `${closingHour > 12 ? closingHour - 12 : closingHour}:00 PM`;

  // Show opening message when courts are available but club is closed
  const isInEarlyHours = currentTimeDecimal >= 4 && currentTimeDecimal < openingTime;
  const shouldShowOpeningMessage = hasAvailableNow && isInEarlyHours;

  return (
    <div className="next-available-section h-full min-h-0 flex flex-col">
      <div className="bg-slate-800/50 rounded-xl shadow-2xl p-4 backdrop-blur flex-1">
        {hasAvailableNow ? (
          <>
            <h2 className="courtboard-text-xl font-bold mb-3 flex items-center text-gray-400">
              <TennisBall className="mr-3 icon-grey" size={24} />
              Next Available
            </h2>
            <div className="text-center mt-12">
              <p className="text-gray-400 courtboard-text-base">
                {shouldShowOpeningMessage
                  ? `Courts open at ${openingTimeString}`
                  : 'Courts available now'}
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="courtboard-text-xl font-bold mb-3 flex items-center text-blue-300">
              <TennisBall className="mr-3" size={24} />
              Next Available
            </h2>
            <div className="border-b border-gray-600 mb-2"></div>
            <div className="space-y-2 mt-4">
              {timeline.length > 0 ? (
                timeline[0]?.allCourtsWet ? (
                  <div className="text-center mt-8">
                    <p className="text-yellow-400 courtboard-text-lg">
                      Courts will become available as they dry
                    </p>
                  </div>
                ) : (
                  timeline.slice(0, maxDisplay).map((availability, idx) => (
                    <div key={idx} className="bg-slate-700/50 p-2 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="courtboard-text-base font-medium text-white">
                            Court {availability.courtNumber}
                          </span>
                        </div>
                        <div className="courtboard-text-base font-semibold text-white">
                          {availability.isEmpty ? (
                            <span className="text-white font-bold">
                              Now
                              {availability.minutesUntilBlock
                                ? ` (${availability.minutesUntilBlock}m)`
                                : ''}
                            </span>
                          ) : availability.isOvertime ? (
                            <span className="text-white font-bold">Now</span>
                          ) : availability.endTime ? (
                            availability.endTime.toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          ) : (
                            'Time TBD'
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="text-center mt-8">
                  <p className="text-gray-400 courtboard-text-lg">
                    The Club closes at {closingDisplay}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto pt-4">
        <ReservedCourtsPanel
          className="bg-slate-800/50 rounded-xl shadow-2xl p-4 backdrop-blur"
          items={selectReservedItemsFromBlocks(
            blocks.filter((b) => !b.isWetCourt),
            currentTime
          )}
        />
      </div>
    </div>
  );
}
