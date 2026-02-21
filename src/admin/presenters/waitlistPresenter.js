/**
 * Waitlist Presenter
 *
 * Pure functions that structure the raw waitlist props (which currently
 * bypass the controller) into model/actions shape for WaitlistSection.
 *
 * Extracted from WaitlistSection.jsx — maintains exact prop mapping.
 */

/**
 * Build the data props for WaitlistSection.
 *
 * @param {Array<Object>} waitingGroups - Current waitlist entries
 * @returns {Object} Data props for WaitlistSection rendering
 */
export function buildWaitlistModel(waitingGroups) {
  return {
    waitingGroups,
  };
}

/**
 * Build the action/callback props for WaitlistSection.
 *
 * @param {Function} moveInWaitlist - Reorder waitlist entry
 * @param {Function} removeFromWaitlist - Remove waitlist entry
 * @returns {Object} Action props for WaitlistSection rendering
 */
export function buildWaitlistActions(moveInWaitlist, removeFromWaitlist) {
  return {
    moveInWaitlist,
    removeFromWaitlist,
  };
}
