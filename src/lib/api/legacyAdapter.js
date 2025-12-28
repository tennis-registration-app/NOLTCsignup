/**
 * Legacy Adapter — TEMPORARY BRIDGE
 *
 * @deprecated This adapter exists only to support legacy localStorage data.
 *
 * REMOVAL CRITERIA (all must be true):
 * 1. All data flows through API (no localStorage reads for court/session data)
 * 2. TennisDataService.js is deleted (currently deprecated, not imported)
 * 3. All fallback chains removed from App.jsx and main.jsx
 * 4. Zero usages of: court.current, court.isUnoccupied, entry.participants, court.players
 *
 * CURRENT STATUS (as of Batch 2 migration):
 * - court.current: 0 usages ✓
 * - court.isUnoccupied: 0 usages ✓
 * - entry.participants: 0 usages ✓
 * - court.players: 0 usages ✓
 * - court.endTime: 4 fallback usages (acceptable)
 *
 * MIGRATION DEADLINE: Before Phase 2
 */

import { logger } from '../logger.js';

// Track legacy field usage in development
let legacyAccessCount = 0;

function warnLegacyUsage(field) {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    legacyAccessCount++;
    if (legacyAccessCount <= 10) {
      logger.warn('LegacyAdapter', `Legacy field accessed: ${field}. Migrate to Domain fields.`);
    }
  }
}

/**
 * Convert Domain Board to legacy shape for unmigrated components
 *
 * @deprecated Migrate components to use Domain Board directly
 * @param {import('../types/domain.js').Board} board - Domain Board
 * @param {Object} raw - Raw API response (for fields not yet in Domain)
 * @returns {Object} Legacy-shaped board
 */
export function toLegacyBoard(board, raw = {}) {
  warnLegacyUsage('toLegacyBoard');

  const legacyCourts = board.courts.map((court) => {
    const rawCourt = (raw.courts || []).find((c) => (c.court_number || c.number) === court.number);

    const players =
      court.session?.group?.players?.map((p) => ({
        id: p.memberId,
        name: p.displayName || 'Unknown',
        member_id: p.memberId,
      })) || [];

    const participants =
      court.session?.group?.players?.map((p) => ({
        memberId: p.memberId,
        displayName: p.displayName,
        isGuest: p.isGuest || false,
      })) || [];

    return {
      ...court,
      // Legacy ID (some code uses court.id as UUID)
      id: rawCourt?.court_id || court.number.toString(),
      name: `Court ${court.number}`,
      // Legacy status string
      status:
        rawCourt?.status ||
        (court.isOccupied ? 'occupied' : court.isBlocked ? 'blocked' : 'available'),
      // Legacy availability flags
      isUnoccupied: !court.isOccupied && !court.isBlocked,
      isActive: court.isOccupied && !court.isOvertime,
      // Legacy players at top level
      players,
      // Legacy timing at top level (null instead of empty string to avoid Invalid Date)
      endTime: court.session?.scheduledEndAt || null,
      startTime: court.session?.startedAt || null,
      // Legacy current object for CourtStatusGrid
      current: court.session
        ? {
            players,
            endTime: court.session.scheduledEndAt || null,
            startTime: court.session.startedAt || null,
          }
        : null,
      // Enhanced session with participants
      session: court.session
        ? {
            ...court.session,
            participants,
            groupType: court.session.group?.type,
            minutesRemaining: rawCourt?.minutes_remaining ?? null,
          }
        : null,
      // Enhanced block with legacy fields
      block: court.block
        ? {
            ...court.block,
            endTime: court.block.endsAt,
          }
        : null,
    };
  });

  const legacyWaitlist = board.waitlist.map((entry) => ({
    ...entry,
    // Legacy participants array (from group.players)
    participants:
      entry.group?.players?.map((p) => ({
        memberId: p.memberId,
        displayName: p.displayName,
        isGuest: p.isGuest || false,
      })) || [],
    players: entry.group?.players || [],
    groupType: entry.group?.type,
    names: entry.group?.players?.map((p) => p.displayName) || [],
  }));

  // Add operatingHours from raw response (not in Domain yet)
  const operatingHours = (raw.operatingHours || []).map((h) => ({
    dayOfWeek: h.day_of_week,
    opensAt: h.opens_at,
    closesAt: h.closes_at,
    isClosed: h.is_closed,
  }));

  return {
    ...board,
    courts: legacyCourts,
    waitlist: legacyWaitlist,
    operatingHours,
    // Legacy alias
    waitingGroups: legacyWaitlist,
  };
}

/**
 * Get legacy access count (for migration tracking)
 */
export function getLegacyAccessCount() {
  return legacyAccessCount;
}

/**
 * Reset legacy access count (for testing)
 */
export function resetLegacyAccessCount() {
  legacyAccessCount = 0;
}
