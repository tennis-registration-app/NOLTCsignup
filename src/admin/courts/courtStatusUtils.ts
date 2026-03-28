import { formatTimeRemaining as formatTimeRemainingCore } from '../../lib/formatters';

/**
 * Pure utility functions extracted from CourtStatusGrid.
 * Stateless — all dependencies passed as arguments.
 */

/**
 * Determine the display status of a court.
 *
 * @param {Object} court - Court domain object (may be null for empty courts)
 * @param {number} courtNumber - 1-based court number
 * @param {Object} deps - Contextual dependencies
 * @param {Set} deps.wetCourts - Set of court numbers currently marked wet
 * @param {Array} deps.courtBlocks - Array of block objects
 * @param {Date} [deps.selectedDate] - Currently selected date
 * @param {Date} [deps.currentTime] - Current time
 * @returns {{ status: string, info: Object|null }}
 */
export function getCourtStatus(
  court,
  courtNumber,
  { wetCourts, courtBlocks, selectedDate = new Date(), currentTime = new Date() }
) {
  // Single source of truth for wet status: the wetCourts Set.
  // The Set is maintained by useWetCourts reducer and updates immediately on
  // dispatch, whereas court.block data arrives asynchronously via board polling.
  // Using only the Set eliminates the bounce caused by the two sources updating
  // on different schedules.
  if (wetCourts?.has(courtNumber)) {
    return {
      status: 'wet',
      info: {
        id: court?.block?.id,
        reason: court?.block?.reason || 'WET COURT',
        type: 'wet',
      },
    };
  }

  // Then check for blocks on the selected date
  const activeBlock = courtBlocks.find((block) => {
    if (block.courtNumber !== courtNumber) return false;
    // Skip wet court blocks — these are system-managed and only shown via the
    // wetCourts Set above.  Check both the explicit flag and the reason text
    // because extractCourtBlocks() doesn't always set isWetCourt.
    if (block.isWetCourt) return false;
    if ((block.reason || '').toLowerCase().includes('wet')) return false;
    const blockStart = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);

    // Filter by selected date - show blocks that occur on the selected date
    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(0, 0, 0, 0);
    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(23, 59, 59, 999);

    // Check if block overlaps with selected date
    const blockOverlapsSelectedDate = blockStart < selectedDateEnd && blockEnd > selectedDateStart;
    if (!blockOverlapsSelectedDate) return false;

    // For today, show only currently active blocks
    // For other dates, show all blocks for that date
    if (selectedDate.toDateString() === new Date().toDateString()) {
      return currentTime >= blockStart && currentTime < blockEnd;
    } else {
      return true; // Show all blocks for non-today dates
    }
  });

  if (activeBlock) {
    return {
      status: 'blocked',
      info: {
        id: activeBlock.id,
        reason: activeBlock.reason,
        startTime: activeBlock.startTime,
        endTime: activeBlock.endTime,
        type: 'block',
        courtNumber: courtNumber,
      },
    };
  }

  // Check if court has players
  if (court && court.players && court.players.length > 0) {
    const endTime = new Date(court.endTime);
    const isOvertime = currentTime > endTime;

    return {
      status: isOvertime ? 'overtime' : 'occupied',
      info: {
        sessionId: court.sessionId || court.id,
        players: court.players,
        startTime: court.startTime,
        endTime: court.endTime,
        duration: court.duration,
        type: 'game',
        courtNumber: courtNumber,
      },
    };
  }

  // Check for current session (Domain format: court.session.group.players)
  const sessionPlayers = court?.session?.group?.players;
  if (sessionPlayers && sessionPlayers.length > 0) {
    const endTime = new Date(court.session.scheduledEndAt);
    const isOvertime = currentTime > endTime;

    return {
      status: isOvertime ? 'overtime' : 'occupied',
      info: {
        sessionId: court.session.id,
        players: sessionPlayers,
        startTime: court.session.startedAt,
        endTime: court.session.scheduledEndAt,
        duration: court.session.duration,
        type: 'game',
        courtNumber: courtNumber,
      },
    };
  }

  return { status: 'available', info: null };
}

/**
 * Map court status to Tailwind CSS color classes.
 * @param {string} status
 * @returns {string} Tailwind class string
 */
export function getStatusColor(status) {
  switch (status) {
    case 'available':
      return 'bg-green-100 border-green-300';
    case 'occupied':
      return 'bg-blue-100 border-blue-300';
    case 'overtime':
      return 'bg-gray-100 border-gray-300';
    case 'blocked':
      return 'bg-amber-50 border-amber-300';
    case 'wet':
      return 'bg-gray-200 border-gray-400';
    default:
      return 'bg-gray-100 border-gray-300';
  }
}

/**
 * Format time remaining until endTime relative to currentTime.
 * Delegates to canonical formatTimeRemaining with admin display options.
 * @param {string|Date} endTime
 * @param {Date} currentTime
 * @returns {string} Human-readable time remaining
 */
export function formatTimeRemaining(endTime, currentTime) {
  return formatTimeRemainingCore(endTime, currentTime || new Date(), {
    appendLeftSuffix: true,
    showOvertimeRemainder: true,
  });
}

/**
 * Format player names for display (last names joined by &).
 * @param {Array} players
 * @returns {string}
 */
export function getPlayerNames(players) {
  if (!players || players.length === 0) return 'No players';
  return players
    .map((p) => {
      const name = p.displayName || p.name || p.playerName || 'Unknown';
      return name.split(' ').pop();
    })
    .join(' & ');
}
