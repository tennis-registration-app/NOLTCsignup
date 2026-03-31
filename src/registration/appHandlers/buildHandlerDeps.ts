import type { AppState } from '../../types/appTypes';
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
 * @param {object} workflow - WorkflowContext value (subset for court)
 * @param {{ clearSuccessResetTimer: Function, resetForm: Function, isPlayerAlreadyPlaying: Function }} core
 */
export function buildCourtHandlerDeps(app: AppState, workflow: Record<string, unknown>, core: Record<string, unknown>) {
  return {
    state: {
      ...(app.state as unknown as Record<string, unknown>),
      isAssigning: workflow.isAssigning,
      currentWaitlistEntryId: workflow.currentWaitlistEntryId,
      canChangeCourt: workflow.canChangeCourt,
      isJoiningWaitlist: workflow.isJoiningWaitlist,
      replacedGroup: workflow.replacedGroup,
    },
    setters: {
      ...(app.setters as unknown as Record<string, unknown>),
      setIsAssigning: workflow.setIsAssigning,
      setCurrentWaitlistEntryId: workflow.setCurrentWaitlistEntryId,
      setHasWaitlistPriority: workflow.setHasWaitlistPriority,
      setReplacedGroup: workflow.setReplacedGroup,
      setDisplacement: workflow.setDisplacement,
      setOriginalCourtData: workflow.setOriginalCourtData,
      setIsChangingCourt: workflow.setIsChangingCourt,
      setWasOvertimeCourt: workflow.setWasOvertimeCourt,
      setCanChangeCourt: workflow.setCanChangeCourt,
      setChangeTimeRemaining: workflow.setChangeTimeRemaining,
      setIsTimeLimited: workflow.setIsTimeLimited,
      setTimeLimitReason: workflow.setTimeLimitReason,
      setIsJoiningWaitlist: workflow.setIsJoiningWaitlist,
      setWaitlistPosition: workflow.setWaitlistPosition,
    },
    mobile: app.mobile,
    groupGuest: workflow.groupGuest,
    courtAssignment: workflow.courtAssignment,
    services: app.services,
    helpers: app.helpers,
    blockAdmin: (app.admin as unknown as Record<string, unknown>).blockAdmin,
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
export function buildGroupHandlerDeps(app: AppState, workflow: Record<string, unknown>, core: Record<string, unknown>, court: Record<string, unknown>) {
  return {
    groupGuest: workflow.groupGuest,
    derived: app.derived,
    mobile: app.mobile,
    streak: workflow.streak,
    search: app.search,
    memberIdentity: workflow.memberIdentity,
    setters: {
      ...(app.setters as unknown as Record<string, unknown>),
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
export function buildGuestHandlerDeps(app: AppState, workflow: Record<string, unknown>) {
  return {
    groupGuest: workflow.groupGuest,
    guestCounterHook: (app.session as unknown as Record<string, unknown>).guestCounterHook,
    memberIdentity: workflow.memberIdentity,
    derived: app.derived,
    setters: { ...(app.setters as unknown as Record<string, unknown>), setShowAddPlayer: workflow.setShowAddPlayer },
    search: app.search,
    helpers: app.helpers,
  };
}

/**
 * @param {import('../../types/appTypes').AppState} app
 * @param {object} court - Return value of useCourtHandlers
 */
export function buildAdminHandlerDeps(app: AppState, court: Record<string, unknown>) {
  return {
    services: app.services,
    alert: app.alert,
    helpers: app.helpers,
    setters: app.setters,
    search: app.search,
    state: app.state,
    adminPriceFeedback: (app.admin as unknown as Record<string, unknown>).adminPriceFeedback,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
    court,
  };
}

/**
 * @param {import('../../types/appTypes').AppState} app
 * @param {object} workflow - WorkflowContext value (subset for navigation)
 */
export function buildNavigationHandlerDeps(app: AppState, workflow: Record<string, unknown>) {
  return {
    state: { ...(app.state as unknown as Record<string, unknown>), showAddPlayer: workflow.showAddPlayer },
    setters: { ...(app.setters as unknown as Record<string, unknown>), setShowAddPlayer: workflow.setShowAddPlayer },
    groupGuest: workflow.groupGuest,
    memberIdentity: workflow.memberIdentity,
    mobile: app.mobile,
    alert: app.alert,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
  };
}
