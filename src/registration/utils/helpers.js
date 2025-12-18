/**
 * Registration Helper Utilities
 *
 * Pure utility functions for player/name normalization and engagement detection.
 * These functions are used for duplicate checking and validation.
 */

/**
 * Normalize a player name for comparison
 * Handles various input formats (string, object with name property)
 *
 * @param {string|object} n - Name or player object
 * @returns {string} - Normalized lowercase name
 */
export function normalizeName(n) {
  return (n?.name ?? n?.fullName ?? n?.playerName ?? n ?? '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Find if a player is already engaged (playing or on waitlist)
 *
 * @param {string|object} name - Player name or object
 * @param {object} data - Court data with courts and waitingGroups arrays
 * @returns {object|null} - { type: 'playing', court: n } or { type: 'waitlist', position: n } or null
 */
export function findEngagementFor(name, data) {
  const norm = normalizeName(name);

  // 1) Check courts for playing players
  const courts = Array.isArray(data?.courts) ? data.courts : [];
  for (let i = 0; i < courts.length; i++) {
    const cur = courts[i]?.current;
    if (!cur) continue;
    const players = Array.isArray(cur.players) ? cur.players : [];
    for (const p of players) {
      if (normalizeName(p) === norm || normalizeName(p?.name) === norm) {
        return { type: 'playing', court: i + 1 };
      }
    }
  }

  // 2) Check waitlist
  const wg = Array.isArray(data?.waitingGroups) ? data.waitingGroups : [];
  for (let i = 0; i < wg.length; i++) {
    const players = Array.isArray(wg[i]?.players) ? wg[i].players : [];
    for (const p of players) {
      if (normalizeName(p) === norm || normalizeName(p?.name) === norm) {
        return { type: 'waitlist', position: i + 1 };
      }
    }
  }

  return null;
}

/**
 * Validate a guest name (must have first and last name)
 *
 * @param {string} name - Guest name to validate
 * @returns {boolean} - Whether name is valid
 */
export function validateGuestName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  // Must have at least two words (first and last name)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  return words.length >= 2;
}

/**
 * Get occupied courts from domain status
 *
 * @returns {object} - { occupied: number[], data: object }
 */
export function computeOccupiedCourts() {
  const A = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
  const S = window.Tennis?.Storage;
  const now = new Date();
  const data = S.readDataSafe();
  const blocks = S.readJSON(S.STORAGE?.BLOCKS) || [];
  const wetSet = new Set(
    (blocks || [])
      .filter(b => b?.isWetCourt && new Date(b.startTime ?? b.start) <= now && now < new Date(b.endTime ?? b.end))
      .map(b => b.courtNumber)
  );
  const statuses = A.getCourtStatuses({ data, now, blocks, wetSet });
  const occupied = statuses.filter(s => s.status === 'occupied').map(s => s.courtNumber);
  return { occupied, data };
}

/**
 * Get courts that can be cleared (occupied or overtime, not blocked)
 *
 * @returns {number[]} - Array of court numbers that can be cleared
 */
export function getCourtsOccupiedForClearing() {
  const Av = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
  const S = window.Tennis?.Storage;
  const now = new Date();
  const data = S.readDataSafe();
  const blocks = S.readJSON(S.STORAGE?.BLOCKS) || [];
  const wetSet = new Set(
    blocks
      .filter(b => b?.isWetCourt && new Date(b.startTime ?? b.start) <= now && now < new Date(b.endTime ?? b.end))
      .map(b => b.courtNumber)
  );

  const statuses = Av.getCourtStatuses({ data, now, blocks, wetSet });
  const clearableCourts = statuses
    .filter(s => (s.isOccupied || s.isOvertime) && !s.isBlocked)
    .map(s => s.courtNumber)
    .sort((a, b) => a - b);
  return clearableCourts;
}
