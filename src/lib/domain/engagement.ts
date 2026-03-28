/**
 * Engagement Lookup — Domain-level query for player engagement
 *
 * Determines if a member is currently engaged (on a court or waitlist).
 * Uses ONLY memberId for matching — no name-based fallbacks.
 */

/**
 * @typedef {Object} Engagement
 * @property {'court'|'waitlist'} kind - Type of engagement
 * @property {number} [courtNumber] - Court number if on court
 * @property {number} [waitlistPosition] - Position if on waitlist
 * @property {string} [groupId] - Group ID
 * @property {string} [displayName] - Player display name
 */

/**
 * Find engagement for a member by ID
 * @param {import('../types/domain.js').Board} board - Domain board
 * @param {string} memberId - Member UUID to check
 * @returns {Engagement|null} - Engagement info or null if not engaged
 */
export function findEngagementByMemberId(board, memberId) {
  if (!board || !memberId) return null;

  // Check courts
  for (const court of board.courts || []) {
    const players = court.session?.group?.players || [];
    const found = players.find((p) => p.memberId === memberId);
    if (found) {
      return {
        kind: 'court',
        courtNumber: court.number,
        groupId: court.session?.group?.id,
        displayName: found.displayName,
      };
    }
  }

  // Check waitlist
  for (const entry of board.waitlist || []) {
    const players = entry.group?.players || [];
    const found = players.find((p) => p.memberId === memberId);
    if (found) {
      return {
        kind: 'waitlist',
        waitlistPosition: entry.position,
        groupId: entry.group?.id,
        displayName: found.displayName,
      };
    }
  }

  return null;
}

/**
 * Build an index of all engaged members for fast lookup
 * @param {import('../types/domain.js').Board} board - Domain board
 * @returns {Map<string, Engagement>} - Map of memberId to Engagement
 */
export function buildEngagementIndex(board) {
  const index = new Map();

  if (!board) return index;

  // Index court players
  for (const court of board.courts || []) {
    const players = court.session?.group?.players || [];
    for (const player of players) {
      if (player.memberId) {
        index.set(player.memberId, {
          kind: 'court',
          courtNumber: court.number,
          groupId: court.session?.group?.id,
          displayName: player.displayName,
        });
      }
    }
  }

  // Index waitlist players
  for (const entry of board.waitlist || []) {
    const players = entry.group?.players || [];
    for (const player of players) {
      if (player.memberId) {
        index.set(player.memberId, {
          kind: 'waitlist',
          waitlistPosition: entry.position,
          groupId: entry.group?.id,
          displayName: player.displayName,
        });
      }
    }
  }

  return index;
}

/**
 * Get a human-readable message for an engagement
 * @param {Engagement} engagement
 * @returns {string}
 */
export function getEngagementMessage(engagement) {
  if (!engagement) return '';

  if (engagement.kind === 'court') {
    return `${engagement.displayName || 'Player'} is already playing on Court ${engagement.courtNumber}`;
  }

  if (engagement.kind === 'waitlist') {
    return `${engagement.displayName || 'Player'} is already on the waitlist (position ${engagement.waitlistPosition})`;
  }

  return 'Player is already engaged';
}
