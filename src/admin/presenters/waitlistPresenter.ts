/**
 * Waitlist Presenter
 *
 * Pure functions that structure the controller domain objects
 * into the shape needed by WaitlistSection rendering.
 *
 * Extracted from WaitlistSection.jsx — maintains exact prop mapping.
 */

/**
 * Build the data props for WaitlistSection.
 *
 * @param {import('../types/domainObjects.js').WaitlistModel} waitlistModel - Domain model from controller
 * @returns {Object} Data props for WaitlistSection rendering
 */
export function buildWaitlistModel(waitlistModel) {
  return {
    waitingGroups: waitlistModel.waitingGroups,
  };
}

/**
 * Build the action/callback props for WaitlistSection.
 *
 * @param {import('../types/domainObjects.js').WaitlistActions} waitlistActions - Domain actions from controller
 * @returns {Object} Action props for WaitlistSection rendering
 */
export function buildWaitlistActions(waitlistActions) {
  return {
    moveInWaitlist: waitlistActions.moveInWaitlist,
    removeFromWaitlist: waitlistActions.removeFromWaitlist,
  };
}
