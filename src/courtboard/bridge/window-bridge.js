/**
 * Courtboard Window Bridge
 *
 * Single writer for window.CourtboardState.
 * This is the ONLY location that should assign to window.CourtboardState.
 *
 * Keys:
 * - courts: Court data array
 * - courtBlocks: Active blocks array
 * - upcomingBlocks: Future blocks for today
 * - waitingGroups: Waitlist entries
 * - freeCourts: Count of playable courts
 * - timestamp: State update timestamp
 */
export function writeCourtboardState(nextState) {
  window.CourtboardState = nextState;
}

/**
 * Get the legacy availability domain object (window.Tennis.Domain.availability).
 * Centralizes the single remaining ESM read so courtboard components
 * don't access window.Tennis directly (ADR-006 Phase 1).
 * @returns {Object|undefined}
 */
export function getLegacyAvailabilityDomain() {
  return window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
}
