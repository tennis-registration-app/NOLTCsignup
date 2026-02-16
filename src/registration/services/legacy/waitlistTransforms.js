/**
 * Waitlist Transforms (Legacy Compatibility)
 *
 * Extracted from ApiTennisService._transformWaitlist
 * Transforms API waitlist entries to app-facing canonical format.
 */

/**
 * Transform API waitlist response to app-facing format.
 * @param {Array} apiWaitlist - Raw waitlist entries from API
 * @returns {Array} Transformed waitlist entries
 */
export function transformWaitlist(apiWaitlist) {
  if (!apiWaitlist) return [];

  return apiWaitlist.map((entry) => ({
    id: entry.id,
    position: entry.position,
    type: entry.group_type,
    players: entry.participants || [],
    joinedAt: new Date(entry.joined_at).getTime(),
    waitTime: (entry.minutes_waiting || 0) * 60 * 1000,
  }));
}
