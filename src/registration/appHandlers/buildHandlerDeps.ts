import type {
  AppState,
  GroupGuestState,
  StreakState,
  MemberIdentityState,
  CourtAssignmentState,
  DisplacementInfo,
} from '../../types/appTypes';
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

/** Typed subset of WorkflowProvider context value consumed by handler dep builders */
interface WorkflowContextValue {
  groupGuest: GroupGuestState;
  streak: StreakState;
  memberIdentity: MemberIdentityState;
  courtAssignment: CourtAssignmentState;
  // Workflow-owned state fields
  isAssigning: boolean;
  setIsAssigning: (v: boolean) => void;
  currentWaitlistEntryId: string | null;
  setCurrentWaitlistEntryId: (v: string | null) => void;
  hasWaitlistPriority: boolean;
  setHasWaitlistPriority: (v: boolean) => void;
  isJoiningWaitlist: boolean;
  setIsJoiningWaitlist: (v: boolean) => void;
  waitlistPosition: number;
  setWaitlistPosition: (v: number | null) => void;
  replacedGroup: { players: Array<{ name: string }>; endTime: string } | null;
  setReplacedGroup: (v: { players: Array<{ name: string }>; endTime: string } | null) => void;
  displacement: DisplacementInfo | null;
  setDisplacement: (v: DisplacementInfo | null) => void;
  originalCourtData: unknown;
  setOriginalCourtData: (v: unknown) => void;
  canChangeCourt: boolean;
  setCanChangeCourt: (v: boolean) => void;
  changeTimeRemaining: number;
  setChangeTimeRemaining: (v: number | ((prev: number) => number)) => void;
  isChangingCourt: boolean;
  setIsChangingCourt: (v: boolean) => void;
  setWasOvertimeCourt: (v: boolean) => void;
  isTimeLimited: boolean;
  setIsTimeLimited: (v: boolean) => void;
  timeLimitReason: string | null;
  setTimeLimitReason: (v: string | null) => void;
  showAddPlayer: boolean;
  setShowAddPlayer: (v: boolean) => void;
}

/** Core handler functions created in useRegistrationHandlers parent scope */
interface CoreHandlerFns {
  clearSuccessResetTimer: () => void;
  resetForm: () => void;
  isPlayerAlreadyPlaying: (playerId: string) => {
    isPlaying: boolean;
    location?: string;
    courtNumber?: number;
    position?: number;
    playerName?: string;
  };
}

// useCourtHandlers return type is inferred — use ReturnType to avoid redeclaration
import type { useCourtHandlers } from './handlers';
type CourtHandlersSubset = ReturnType<typeof useCourtHandlers>;

export function buildCourtHandlerDeps(
  app: AppState,
  workflow: WorkflowContextValue,
  core: CoreHandlerFns
) {
  return {
    state: {
      ...app.state,
      isAssigning: workflow.isAssigning,
      currentWaitlistEntryId: workflow.currentWaitlistEntryId,
      canChangeCourt: workflow.canChangeCourt,
      isJoiningWaitlist: workflow.isJoiningWaitlist,
      replacedGroup: workflow.replacedGroup,
    },
    setters: {
      ...app.setters,
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
    blockAdmin: app.admin.blockAdmin,
    alert: app.alert,
    refs: app.refs,
    assignCourtToGroupOrchestrated: app.assignCourtToGroupOrchestrated,
    changeCourtOrchestrated: app.changeCourtOrchestrated,
    sendGroupToWaitlistOrchestrated: app.sendGroupToWaitlistOrchestrated,
    validateGroupCompat: app.validateGroupCompat,
    CONSTANTS: app.CONSTANTS,
    API_CONFIG: app.API_CONFIG,
    core,
  };
}

export function buildGroupHandlerDeps(
  app: AppState,
  workflow: WorkflowContextValue,
  core: CoreHandlerFns,
  court: CourtHandlersSubset
) {
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

export function buildGuestHandlerDeps(app: AppState, workflow: WorkflowContextValue) {
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

export function buildAdminHandlerDeps(app: AppState, court: CourtHandlersSubset) {
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

export function buildNavigationHandlerDeps(app: AppState, workflow: WorkflowContextValue) {
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
