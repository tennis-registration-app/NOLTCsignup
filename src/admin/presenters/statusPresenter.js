/**
 * Status Presenter
 *
 * Pure functions that transform controller domain objects into the props
 * needed by StatusSection's two children:
 * 1. CourtStatusGrid — receives domain objects directly (pass-through)
 * 2. Inline waitlist UI — receives extracted data/actions
 *
 * Extracted from StatusSection.jsx — maintains exact prop mapping.
 */

/**
 * Build the data props for StatusSection's CourtStatusGrid and waitlist UI.
 *
 * @param {import('../types/domainObjects.js').StatusModel} statusModel
 * @param {import('../types/domainObjects.js').WetCourtsModel} wetCourtsModel
 * @param {import('../types/domainObjects.js').AdminServices} services
 * @returns {Object} Props for StatusSection rendering
 */
export function buildStatusModel(statusModel, wetCourtsModel, services) {
  return {
    // Pass-through domain objects for CourtStatusGrid
    statusModel,
    wetCourtsModel,
    services,
    // Extracted for inline waitlist UI
    waitingGroups: statusModel.waitingGroups,
  };
}

/**
 * Build the action/callback props for StatusSection.
 *
 * @param {import('../types/domainObjects.js').StatusActions} statusActions
 * @param {import('../types/domainObjects.js').WetCourtsActions} wetCourtsActions
 * @returns {Object} Action props for StatusSection rendering
 */
export function buildStatusActions(statusActions, wetCourtsActions) {
  return {
    // Pass-through domain objects for CourtStatusGrid
    statusActions,
    wetCourtsActions,
    // Extracted for inline waitlist UI
    moveInWaitlist: statusActions.moveInWaitlist,
    removeFromWaitlist: statusActions.removeFromWaitlist,
  };
}
