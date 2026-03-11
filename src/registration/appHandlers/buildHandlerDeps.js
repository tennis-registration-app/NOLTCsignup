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
    groupGuest: app.players.groupGuest,
    courtAssignment: app.court.courtAssignment,
    services: app.services,
    helpers: app.helpers,
    blockAdmin: app.admin.blockAdmin,
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
 * @param {object} workflow - WorkflowContext value (subset for group)
 * @param {{ clearSuccessResetTimer: Function, resetForm: Function, isPlayerAlreadyPlaying: Function }} core
 * @param {object} court - Return value of useCourtHandlers
 */
export function buildGroupHandlerDeps(app, workflow, core, court) {
  return {
    groupGuest: workflow.groupGuest,
    derived: app.derived,
    mobile: app.mobile,
    streak: workflow.streak,
    search: app.search,
    memberIdentity: workflow.memberIdentity,
    setters: {
      ...app.setters,
      setShowAddPlayer: workflow.setShowAddPlayer,
      setHasWaitlistPriority: workflow.setHasWaitlistPriority,
    },
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
 * @param {object} workflow - WorkflowContext value (subset for guest)
 */
export function buildGuestHandlerDeps(app, workflow) {
  return {
    groupGuest: workflow.groupGuest,
    guestCounterHook: app.session.guestCounterHook,
    memberIdentity: workflow.memberIdentity,
    derived: app.derived,
    setters: { ...app.setters, setShowAddPlayer: workflow.setShowAddPlayer },
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
    adminPriceFeedback: app.admin.adminPriceFeedback,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
    court,
  };
}

/**
 * @param {import('../../types/appTypes').AppState} app
 * @param {object} workflow - WorkflowContext value (subset for navigation)
 */
export function buildNavigationHandlerDeps(app, workflow) {
  return {
    state: { ...app.state, showAddPlayer: workflow.showAddPlayer },
    setters: { ...app.setters, setShowAddPlayer: workflow.setShowAddPlayer },
    groupGuest: workflow.groupGuest,
    memberIdentity: workflow.memberIdentity,
    mobile: app.mobile,
    alert: app.alert,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
  };
}
