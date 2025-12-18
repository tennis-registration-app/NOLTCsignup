/**
 * Calendar Utility Functions
 *
 * Shared helpers for calendar components.
 */

/**
 * Get CSS classes for event color based on event type or reason
 */
export const getEventColor = (event) => {
  const eventType = event.eventType || event.type;
  const reason = (event.reason || '').toUpperCase();

  // First check explicit eventType
  if (eventType) {
    switch (eventType) {
      case 'tournament':
        return 'bg-purple-200 border-purple-300 text-purple-800';
      case 'league':
        return 'bg-yellow-300 border-yellow-400 text-yellow-900';
      case 'clinic':
        return 'bg-purple-100 border-purple-200 text-purple-700';
      case 'lesson':
        return 'bg-teal-500 border-teal-600 text-white';
      case 'maintenance':
        return 'bg-amber-200 border-amber-300 text-amber-800';
    }
  }

  // Then check by reason for blocks without explicit eventType
  if (reason.includes('WET') || reason.includes('WET COURT')) {
    return 'bg-blue-200 border-blue-300 text-blue-800';
  }
  if (reason.includes('MAINTENANCE') || reason.includes('COURT WORK')) {
    return 'bg-orange-200 border-orange-300 text-orange-800';
  }
  if (reason.includes('LESSON')) {
    return 'bg-green-200 border-green-300 text-green-800';
  }
  if (reason.includes('CLINIC')) {
    return 'bg-purple-100 border-purple-200 text-purple-700';
  }
  if (reason.includes('TOURNAMENT')) {
    return 'bg-purple-200 border-purple-300 text-purple-800';
  }
  if (reason.includes('LEAGUE')) {
    return 'bg-yellow-300 border-yellow-400 text-yellow-900';
  }

  // Default color for unknown types
  return 'bg-gray-200 border-gray-300 text-gray-700';
};

/**
 * Get event type from reason string
 */
export const getEventTypeFromReason = (reason) => {
  const reasonUpper = reason.toUpperCase();

  if (reasonUpper.includes('TOURNAMENT')) return 'tournament';
  if (reasonUpper.includes('LEAGUE')) return 'league';
  if (reasonUpper.includes('CLINIC')) return 'clinic';
  if (reasonUpper.includes('LESSON')) return 'lesson';
  if (reasonUpper.includes('MAINTENANCE') || reasonUpper.includes('COURT WORK')) return 'maintenance';

  // Reasons that shouldn't be events by default
  if (reasonUpper.includes('WET')) return null;

  return 'other'; // For custom reasons
};

/**
 * Get emoji for event type
 */
export const getEventEmoji = (type) => {
  switch (type) {
    case 'league':
      return '🏆';
    case 'tournament':
      return '⭐';
    case 'clinic':
      return '🎓';
    case 'lesson':
      return '👥';
    case 'maintenance':
      return '🔧';
    default:
      return '📅';
  }
};

/**
 * Collision detection algorithm for overlapping events
 * Returns a Map with layout info for each event
 */
export const calculateEventLayout = (events) => {
  // Sort events by start time, then by duration (longer events first)
  const sortedEvents = [...events].sort((a, b) => {
    const aStart = new Date(a.startTime).getTime();
    const bStart = new Date(b.startTime).getTime();
    if (aStart !== bStart) return aStart - bStart;

    const aDuration = new Date(a.endTime).getTime() - aStart;
    const bDuration = new Date(b.endTime).getTime() - bStart;
    return bDuration - aDuration;
  });

  // Group overlapping events
  const groups = [];
  sortedEvents.forEach(event => {
    const eventStart = new Date(event.startTime).getTime();
    const eventEnd = new Date(event.endTime).getTime();

    // Find a group this event overlaps with
    let foundGroup = false;
    for (const group of groups) {
      const groupStart = Math.min(...group.map(e => new Date(e.startTime).getTime()));
      const groupEnd = Math.max(...group.map(e => new Date(e.endTime).getTime()));

      if (eventStart < groupEnd && eventEnd > groupStart) {
        group.push(event);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push([event]);
    }
  });

  // Assign columns within each group
  const layoutInfo = new Map();

  groups.forEach(group => {
    const columns = [];

    group.forEach(event => {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();

      // Find the first available column
      let column = 0;
      while (true) {
        const canFit = !columns[column] || columns[column].every(e => {
          const eStart = new Date(e.startTime).getTime();
          const eEnd = new Date(e.endTime).getTime();
          return eventEnd <= eStart || eventStart >= eEnd;
        });

        if (canFit) {
          if (!columns[column]) columns[column] = [];
          columns[column].push(event);
          break;
        }
        column++;
      }

      layoutInfo.set(event.id || `${event.startTime}-${event.courtNumbers?.[0]}`, {
        column,
        totalColumns: columns.length,
        group
      });
    });

    // Update total columns for all events in group
    group.forEach(event => {
      const key = event.id || `${event.startTime}-${event.courtNumbers?.[0]}`;
      const info = layoutInfo.get(key);
      if (info) {
        info.totalColumns = columns.length;
      }
    });
  });

  return layoutInfo;
};
