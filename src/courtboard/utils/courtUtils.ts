/**
 * Court display utilities for CourtBoard
 * Helper functions for court status, formatting, and display logic
 */


interface StatusObj {
  status?: string;
  selectable?: boolean;
}

interface PlayerLike {
  name?: string;
}

interface CourtSession {
  group?: { players?: PlayerLike[] };
  scheduledEndAt?: string;
  startedAt?: string;
}

interface CourtObjLike {
  session?: CourtSession | null;
  history?: Array<{ players?: PlayerLike[] }> | null;
  blockedLabel?: string;
  reason?: string;
  blockedEnd?: string;
}
/**
 * Map status to Tailwind CSS classes
 * @param {Object|string} statusObj - Status object or string
 * @returns {string} Tailwind class string
 */
export function classForStatus(statusObj: StatusObj | string | null | undefined): string {
  const s = typeof statusObj === 'string' ? statusObj : (statusObj as StatusObj)?.status;
  const selectable = typeof statusObj === 'object' && statusObj !== null ? (statusObj as StatusObj).selectable : undefined;

  switch (s) {
    case 'occupied':
      return 'bg-gradient-to-b from-blue-300 to-blue-400 border-blue-300';
    case 'overtime':
      return selectable
        ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-600'
        : 'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-500';
    case 'overtime-available':
      return 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-600';
    case 'overtimeAvailable':
      return 'bg-gradient-to-b from-green-600 to-green-700 border-green-600';
    case 'wet':
      return 'bg-gradient-to-b from-gray-300 to-gray-400 border-gray-300';
    case 'blocked':
      return 'bg-gradient-to-b from-slate-300 to-slate-400 border-slate-400';
    case 'free':
    default:
      return 'bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-400';
  }
}

/**
 * Extract player names from a court object
 * @param {Object} courtObj - Court object with session/history data
 * @returns {string} Comma-separated player names
 */
export function namesFor(courtObj: CourtObjLike | null | undefined): string {
  if (Array.isArray(courtObj?.session?.group?.players)) {
    return courtObj!.session!.group!.players!
      .map((p: PlayerLike) => p?.name)
      .filter(Boolean)
      .join(', ');
  }
  const history = courtObj?.history;
  const last =
    Array.isArray(history) && history.length
      ? history[history.length - 1]
      : null;
  if (Array.isArray(last?.players)) {
    return last!.players!
      .map((p: PlayerLike) => p?.name)
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

/**
 * Format a date/time for display
 * @param {Date|string} dt - Date or ISO string
 * @returns {string|null} Formatted time string
 */
export function formatTime(dt: Date | string | null | undefined): string | null {
  if (!dt) return null;
  const d = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(+d)) return null;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Compute clock display text for a court
 * @param {string} status - Court status
 * @param {Object} courtObj - Court object
 * @param {Date} now - Current time
 * @param {number} checkStatusMinutes - Minutes threshold for "check status" warning
 * @returns {Object} { primary, secondary, secondaryColor }
 */
export function computeClock(
  status: string,
  courtObj: CourtObjLike | null | undefined,
  now: Date,
  checkStatusMinutes = 150
): { primary: string; secondary: string; secondaryColor?: string } {
  // Helper to compute "+X min over" label
  const getOvertimeLabel = (endTime: Date | null | undefined): string => {
    if (!endTime) return 'Overtime';
    const minutesOver = Math.round((now.getTime() - endTime.getTime()) / 60000);
    return minutesOver > 0 ? `+${minutesOver} min over` : 'Overtime';
  };

  if (status === 'occupied') {
    const session = courtObj?.session;
    const end = session?.scheduledEndAt
      ? new Date(session.scheduledEndAt)
      : null;
    if (end && end > now) {
      const mins = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 60000));
      return {
        primary: `${mins} min`,
        secondary: `Until ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      };
    }
    return { primary: getOvertimeLabel(end), secondary: '' };
  }
  if (status === 'overtime') {
    const session2 = courtObj?.session;
    const end = session2?.scheduledEndAt
      ? new Date(session2.scheduledEndAt)
      : null;
    const start = session2?.startedAt ? new Date(session2.startedAt) : null;
    if (start) {
      const minutesPlaying = Math.floor((now.getTime() - start.getTime()) / 60000);
      if (checkStatusMinutes > 0 && minutesPlaying >= checkStatusMinutes) {
        return {
          primary: getOvertimeLabel(end),
          secondary: 'check status',
          secondaryColor: 'yellow',
        };
      }
    }
    return { primary: getOvertimeLabel(end), secondary: '' };
  }
  if (status === 'free') return { primary: 'Available', secondary: '' };
  if (status === 'wet') return { primary: '🌧️\nWET COURT', secondary: '' };
  if (status === 'blocked') {
    const s = courtObj || {};
    const rawLabel = (s.blockedLabel || s.reason || 'Blocked') as string;

    let label = rawLabel.toUpperCase();
    if (label.includes('COURT WORK') || label.includes('MAINTENANCE')) {
      label = 'COURT WORK';
    } else if (label.includes('LESSON')) {
      label = 'LESSON';
    } else if (label.includes('CLINIC')) {
      label = 'CLINIC';
    } else if (label.includes('LEAGUE')) {
      label = 'LEAGUE';
    }

    const until = s.blockedEnd ? (s.blockedEnd as string) : null;
    let secondary = '';
    if (until) {
      try {
        const endTime = new Date(until);
        if (!isNaN(endTime.getTime())) {
          secondary = `Until ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        }
      } catch {
        // ignore invalid date
      }
    }
    return { primary: label, secondary };
  }
  return { primary: '', secondary: '' };
}
