// @ts-check
/**
 * NOLTC Tennis Registration - Canonical Domain Types
 *
 * RULES:
 * - All times are ISO 8601 strings (e.g., "2025-12-27T22:00:00.000Z")
 * - IDs use consistent naming: id, memberId, courtNumber
 * - Player container is always Group.players (never participants, members)
 * - Derived fields (e.g., minutesWaiting) are computed in normalizeBoard()
 * - No snake_case in Domain — all camelCase
 *
 * Components consume ONLY these types, never raw API responses.
 */

/**
 * A club member or guest
 * @typedef {Object} Member
 * @property {string} memberId - Unique identifier
 * @property {string} displayName - Display name (e.g., "Anna Sinner")
 * @property {boolean} isGuest - True if guest, false if member
 */

/**
 * A group of players (1-4 people playing together)
 * @typedef {Object} Group
 * @property {string} id - Group identifier
 * @property {Member[]} players - Array of 1-4 members
 * @property {'singles'|'doubles'} type - Group type based on player count
 */

/**
 * An active or completed court session
 * @typedef {Object} Session
 * @property {string} id - Session identifier
 * @property {number} courtNumber - Court number (1-12)
 * @property {Group} group - The group playing
 * @property {string} startedAt - ISO string when session started
 * @property {string} scheduledEndAt - ISO string when session should end
 * @property {string|null} actualEndAt - ISO string when session actually ended, null if active
 * @property {'completed'|'cleared_early'|'admin_override'|null} endReason - Why session ended
 * @property {boolean} isOvertime - True if past scheduledEndAt and still active
 */

/**
 * A court block (reserved/unavailable time)
 * @typedef {Object} Block
 * @property {string} id - Block identifier
 * @property {number} courtNumber - Court number (1-12)
 * @property {string} startsAt - ISO string when block starts
 * @property {string} endsAt - ISO string when block ends
 * @property {string} reason - Why the court is blocked
 * @property {string} [blockType] - Block type enum (lesson, clinic, maintenance, wet, other)
 * @property {boolean} isActive - True if block is currently in effect
 */

/**
 * A court with its current state
 * @typedef {Object} Court
 * @property {string} id - Court UUID (for API commands)
 * @property {number} number - Court number (1-12)
 * @property {boolean} isOccupied - True if has active session
 * @property {boolean} isBlocked - True if has active block
 * @property {boolean} isOvertime - True if session is past scheduled end
 * @property {boolean} isAvailable - True if can be assigned (not occupied, not blocked)
 * @property {Session|null} session - Current session if occupied
 * @property {Block|null} block - Current block if blocked
 */

/**
 * A waitlist entry (group waiting for a court)
 * @typedef {Object} WaitlistEntry
 * @property {string} id - Waitlist entry identifier
 * @property {number} position - Position in queue (1 = next up)
 * @property {Group} group - The group waiting
 * @property {string} joinedAt - ISO string when joined waitlist
 * @property {number} minutesWaiting - Derived: minutes since joinedAt
 * @property {string|null} estimatedCourtTime - ISO string of estimated court availability
 */

/**
 * The complete board state
 * @typedef {Object} Board
 * @property {string} serverNow - ISO string of server time (use for all time calculations)
 * @property {Court[]} courts - All 12 courts with current state
 * @property {WaitlistEntry[]} waitlist - Current waitlist, ordered by position
 */

/**
 * Valid end reasons for sessions (matches database constraint)
 * @typedef {'completed'|'cleared_early'|'admin_override'} EndReason
 */

/**
 * Valid waitlist statuses (matches database constraint)
 * @typedef {'waiting'|'assigned'|'cancelled'} WaitlistStatus
 */

// Export constants for runtime validation
export const END_REASONS = ['completed', 'cleared_early', 'admin_override'];
export const WAITLIST_STATUSES = ['waiting', 'assigned', 'cancelled'];
export const GROUP_TYPES = ['singles', 'doubles'];
export const COURT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const SINGLES_ONLY_COURT_NUMBERS = [8];

/**
 * Check if a court is eligible for a group of the given size.
 * Singles-only courts reject groups of 4+ (doubles).
 * @param {number} courtNumber
 * @param {number} playerCount
 * @returns {boolean}
 */
export function isCourtEligibleForGroup(courtNumber, playerCount) {
  if (SINGLES_ONLY_COURT_NUMBERS.includes(courtNumber) && playerCount >= 4) {
    return false;
  }
  return true;
}
