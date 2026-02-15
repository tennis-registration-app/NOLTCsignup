// @ts-check
/**
 * CourtSelectionScreen Presenter
 *
 * Pure function that transforms app state into the model props
 * expected by CourtSelectionScreen.
 *
 * Extracted from CourtRoute.jsx — maintains exact prop mapping.
 *
 * NOTE: CourtRoute has complex inline async handlers that depend on
 * route-level state and closures. Only the model (data) props are
 * extracted here. Handlers remain in the route.
 */

/**
 * Build the model (data) props for CourtSelectionScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {Object} computed - Route-computed values
 * @param {number[]} computed.availableCourts
 * @param {boolean} computed.showingOvertimeCourts
 * @param {boolean} computed.hasWaitingGroups
 * @param {number} computed.waitingGroupsCount
 * @param {Array} computed.upcomingBlocks
 * @returns {Object} Model props for CourtSelectionScreen
 */
export function buildCourtModel(app, computed) {
  // Destructure from app (verbatim from CourtRoute)
  const { derived, groupGuest, state } = app;
  const { isMobileView } = derived;
  const { currentGroup } = groupGuest;
  const { hasWaitlistPriority, currentWaitlistEntryId } = state;

  return {
    // Computed values (from route)
    availableCourts: computed.availableCourts,
    showingOvertimeCourts: computed.showingOvertimeCourts,
    hasWaitingGroups: computed.hasWaitingGroups,
    waitingGroupsCount: computed.waitingGroupsCount,
    upcomingBlocks: computed.upcomingBlocks,
    // Direct state values
    currentGroup,
    isMobileView,
    hasWaitlistPriority,
    currentWaitlistEntryId,
  };
}
