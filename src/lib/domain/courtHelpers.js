/**
 * Domain Helper Functions for Courts and Sessions
 *
 * RULES:
 * - Pure functions only (no React, no DOM, no fetch, no localStorage)
 * - Accept Domain objects only
 * - Deterministic and easy to unit-test
 */

/**
 * Get player display names from a court's active session
 * @param {import('../types/domain.js').Court} court
 * @returns {string[]}
 */
export function getCourtPlayerNames(court) {
  if (!court?.session?.group?.players) return [];
  return court.session.group.players.map((p) => p.displayName);
}

/**
 * Calculate minutes remaining in session (rounds up for user-friendly display)
 * @param {import('../types/domain.js').Session|null} session
 * @param {string} serverNow - ISO string
 * @returns {number} Minutes remaining (0 if session ended or invalid)
 */
export function getSessionMinutesRemaining(session, serverNow) {
  if (!session?.scheduledEndAt || !serverNow) return 0;
  const endTime = new Date(session.scheduledEndAt).getTime();
  const now = new Date(serverNow).getTime();
  const diffMs = endTime - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60000); // Round up for user-friendly display
}

/**
 * Check if session is in overtime
 * @param {import('../types/domain.js').Session|null} session
 * @param {string} serverNow - ISO string
 * @returns {boolean}
 */
export function isSessionOvertime(session, serverNow) {
  if (!session?.scheduledEndAt || !serverNow) return false;
  if (session.actualEndAt) return false; // Session already ended
  return new Date(serverNow) > new Date(session.scheduledEndAt);
}

/**
 * Get display names from a waitlist entry
 * @param {import('../types/domain.js').WaitlistEntry} entry
 * @returns {string[]}
 */
export function getWaitlistEntryNames(entry) {
  if (!entry?.group?.players) return [];
  return entry.group.players.map((p) => p.displayName);
}

/**
 * Get available (unoccupied and unblocked) courts
 * @param {import('../types/domain.js').Court[]} courts
 * @returns {import('../types/domain.js').Court[]}
 */
export function getAvailableCourts(courts) {
  if (!Array.isArray(courts)) return [];
  return courts.filter((c) => c.isAvailable);
}

/**
 * Get occupied courts
 * @param {import('../types/domain.js').Court[]} courts
 * @returns {import('../types/domain.js').Court[]}
 */
export function getOccupiedCourts(courts) {
  if (!Array.isArray(courts)) return [];
  return courts.filter((c) => c.isOccupied);
}

/**
 * Find court by number
 * @param {import('../types/domain.js').Court[]} courts
 * @param {number} courtNumber
 * @returns {import('../types/domain.js').Court|undefined}
 */
export function findCourtByNumber(courts, courtNumber) {
  if (!Array.isArray(courts)) return undefined;
  return courts.find((c) => c.number === courtNumber);
}
