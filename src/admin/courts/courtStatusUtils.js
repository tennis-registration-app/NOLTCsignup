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
  { wetCourts, courtBlocks, selectedDate, currentTime }
) {
  // Check if court has a wet block from API data
  // Data structure: court.block.reason contains the block title/reason
  const hasWetBlock = court?.block?.id && court.block.reason?.toLowerCase().includes('wet');

  // Also check wetCourts prop (from parent state) as fallback
  const isWetFromProp = wetCourts?.has(courtNumber);

  if (hasWetBlock || isWetFromProp) {
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
    if (block.courtNumber !== courtNumber || block.isWetCourt) return false;
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
 * @param {string|Date} endTime
 * @param {Date} currentTime
 * @returns {string} Human-readable time remaining
 */
export function formatTimeRemaining(endTime, currentTime) {
  const end = new Date(endTime);
  const diff = end.getTime() - currentTime.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 0) {
    const absMinutes = Math.abs(minutes);
    if (absMinutes >= 60) {
      const hours = Math.floor(absMinutes / 60);
      const mins = absMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m over` : `${hours}h over`;
    }
    return `${absMinutes}m over`;
  }
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
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
