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
