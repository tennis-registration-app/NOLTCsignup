/**
 * buildHandlerDeps
 * ================
 * Pure mapping functions that assemble handler dependency objects
 * from AppState slices. Each function returns the EXACT object
 * currently expected by the corresponding handler hook.
 *
 * No logic — just property selection and assembly.
 *
 * @module buildHandlerDeps
 */

/**
 * @param {import('../../types/appTypes').AppState} app
 * @param {{ clearSuccessResetTimer: Function, resetForm: Function, isPlayerAlreadyPlaying: Function }} core
 */
export function buildCourtHandlerDeps(app, core) {
  return {
    state: app.state,
    setters: app.setters,
    mobile: app.mobile,
    groupGuest: app.groupGuest,
    courtAssignment: app.courtAssignment,
    services: app.services,
    helpers: app.helpers,
    blockAdmin: app.blockAdmin,
    alert: app.alert,
    refs: app.refs,
    assignCourtToGroupOrchestrated: app.assignCourtToGroupOrchestrated,
    changeCourtOrchestrated: app.changeCourtOrchestrated,
    sendGroupToWaitlistOrchestrated: app.sendGroupToWaitlistOrchestrated,
    validateGroupCompat: app.validateGroupCompat,
    dbg: app.dbg,
    CONSTANTS: app.CONSTANTS,
    API_CONFIG: app.API_CONFIG,
    core,
  };
}

/**
 * @param {import('../../types/appTypes').AppState} app
 * @param {{ clearSuccessResetTimer: Function, resetForm: Function, isPlayerAlreadyPlaying: Function }} core
 * @param {object} court - Return value of useCourtHandlers
 */
export function buildGroupHandlerDeps(app, core, court) {
  return {
    groupGuest: app.groupGuest,
    derived: app.derived,
    mobile: app.mobile,
    streak: app.streak,
    search: app.search,
    memberIdentity: app.memberIdentity,
    setters: app.setters,
    alert: app.alert,
    refs: app.refs,
    services: app.services,
    helpers: app.helpers,
    court,
    core,
    handleSuggestionClickOrchestrated: app.handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated: app.handleAddPlayerSuggestionClickOrchestrated,
    CONSTANTS: app.CONSTANTS,
  };
}

/**
 * @param {import('../../types/appTypes').AppState} app
 */
export function buildGuestHandlerDeps(app) {
  return {
    groupGuest: app.groupGuest,
    guestCounterHook: app.guestCounterHook,
    memberIdentity: app.memberIdentity,
    derived: app.derived,
    setters: app.setters,
    search: app.search,
    helpers: app.helpers,
  };
}

/**
 * @param {import('../../types/appTypes').AppState} app
 * @param {object} court - Return value of useCourtHandlers
 */
export function buildAdminHandlerDeps(app, court) {
  return {
    services: app.services,
    alert: app.alert,
    helpers: app.helpers,
    setters: app.setters,
    search: app.search,
    state: app.state,
    adminPriceFeedback: app.adminPriceFeedback,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
    court,
  };
}

/**
 * @param {import('../../types/appTypes').AppState} app
 */
export function buildNavigationHandlerDeps(app) {
  return {
    state: app.state,
    setters: app.setters,
    groupGuest: app.groupGuest,
    memberIdentity: app.memberIdentity,
    mobile: app.mobile,
    clearCourtFlow: app.clearCourtFlow,
    alert: app.alert,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
  };
}
