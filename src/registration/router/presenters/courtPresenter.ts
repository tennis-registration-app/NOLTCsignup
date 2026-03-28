/**
 * CourtSelectionScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by CourtSelectionScreen.
 *
 * Extracted from CourtRoute.jsx — maintains exact prop mapping.
 */

import type { AppState, CourtDataMutable, DisplacementInfo, GroupPlayer, Handlers, OriginalCourtData, UpcomingBlock } from '../../../types/appTypes.js';
import { logger } from '../../../lib/logger';

/** Workflow-owned fields that buildCourtModel and buildCourtActions read. */
export interface CourtWorkflow {
  groupGuest: {
    currentGroup: GroupPlayer[] | null;
  };
  courtAssignment: {
    justAssignedCourt: number | null;
  };
  hasWaitlistPriority: boolean;
  currentWaitlistEntryId: string | null;
  isChangingCourt: boolean;
  displacement: DisplacementInfo | null;
  originalCourtData: OriginalCourtData | null;
  setDisplacement: (v: DisplacementInfo | null) => void;
  setIsChangingCourt: (v: boolean) => void;
  setWasOvertimeCourt: (v: boolean) => void;
  setOriginalCourtData: (v: OriginalCourtData | null) => void;
}

export interface CourtModelComputed {
  availableCourts: number[];
  showingOvertimeCourts: boolean;
  hasWaitingGroups: boolean;
  waitingGroupsCount: number;
  upcomingBlocks: UpcomingBlock[];
}

export interface CourtModel {
  // Computed values (from route)
  availableCourts: number[];
  showingOvertimeCourts: boolean;
  hasWaitingGroups: boolean;
  waitingGroupsCount: number;
  upcomingBlocks: UpcomingBlock[];
  // Direct state values
  currentGroup: GroupPlayer[] | null;
  isMobileView: boolean;
  hasWaitlistPriority: boolean;
  currentWaitlistEntryId: string | null;
}

export interface CourtActionsComputed {
  computedAvailableCourts: number[];
}

export interface CourtActions {
  onDeferWaitlist: (entryId: string) => void;
  onCourtSelect: (courtNum: number) => Promise<void>;
  onJoinWaitlist: () => Promise<void>;
  onAssignNext: () => void;
  onGoBack: () => void;
  onStartOver: Function;
  onJoinWaitlistDeferred: () => void;
}

/**
 * Build the model (data) props for CourtSelectionScreen.
 *
 * Workflow-owned fields come from the `workflow` parameter (WorkflowContext).
 * Shell/global fields come from `app`.
 */
export function buildCourtModel(app: AppState, workflow: CourtWorkflow, computed: CourtModelComputed): CourtModel {
  // Shell fields from app
  const { derived } = app;
  const { isMobileView } = derived;

  // Workflow fields from context
  const { currentGroup } = workflow.groupGuest;
  const { hasWaitlistPriority, currentWaitlistEntryId } = workflow;

  return {
    // Computed values (from route)
    availableCourts: computed.availableCourts,
    showingOvertimeCourts: computed.showingOvertimeCourts,
    hasWaitingGroups: computed.hasWaitingGroups,
    waitingGroupsCount: computed.waitingGroupsCount,
    upcomingBlocks: computed.upcomingBlocks,
    // Direct state values — workflow-sourced
    currentGroup,
    hasWaitlistPriority,
    currentWaitlistEntryId,
    // Direct state values — shell-sourced
    isMobileView,
  };
}

/**
 * Build the actions (callback) props for CourtSelectionScreen.
 *
 * Workflow-owned reads/setters come from the `workflow` parameter (WorkflowContext).
 * Shell/global fields come from `app` and `handlers`.
 */
export function buildCourtActions(
  app: AppState,
  workflow: CourtWorkflow,
  handlers: Handlers,
  computed: CourtActionsComputed
): CourtActions {
  // Workflow fields from context
  const { isChangingCourt, displacement, originalCourtData } = workflow;
  const { justAssignedCourt } = workflow.courtAssignment;
  const { currentGroup } = workflow.groupGuest;
  const {
    setDisplacement,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setOriginalCourtData,
  } = workflow;

  // Shell fields from app
  const { mobile, refs, setters, CONSTANTS } = app;
  const { mobileFlow } = mobile;
  const { successResetTimerRef } = refs;
  const {
    setShowSuccess,
    setCurrentScreen,
  } = setters;

  // Destructure from handlers
  const {
    getCourtData,
    assignCourtToGroup,
    sendGroupToWaitlist,
    clearSuccessResetTimer,
    resetForm,
    saveCourtData,
    deferWaitlistEntry,
    undoOvertimeAndClearPrevious,
    assignNextFromWaitlist,
    joinWaitlistDeferred,
  } = handlers;

  // Destructure from computed
  const { computedAvailableCourts } = computed;

  return {
    onDeferWaitlist: (entryId: string) => deferWaitlistEntry(entryId),
    onCourtSelect: async (courtNum: number) => {
      // If changing courts, undo previous assignment first
      if (isChangingCourt && justAssignedCourt) {
        await undoOvertimeAndClearPrevious(justAssignedCourt, displacement!);
        setDisplacement(null); // Clear ONLY after court change is complete
      }
      await assignCourtToGroup(courtNum, computedAvailableCourts.length);
      setIsChangingCourt(false);
      setWasOvertimeCourt(false);
    },
    onJoinWaitlist: async () => {
      await sendGroupToWaitlist(currentGroup ?? []);
      setShowSuccess(true);
      // Don't auto-reset in mobile flow - let the overlay handle timing
      if (!mobileFlow) {
        clearSuccessResetTimer();
        successResetTimerRef.current = setTimeout(() => {
          successResetTimerRef.current = null;
          resetForm();
        }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
      }
    },
    onAssignNext: () => assignNextFromWaitlist(),
    onGoBack: () => {
      setCurrentScreen('group', 'courtGoBack');
      setIsChangingCourt(false);
      setWasOvertimeCourt(false);
      // If we were changing courts and had replaced an overtime court, restore it
      if (isChangingCourt && justAssignedCourt && originalCourtData) {
        try {
          const goBackData = getCourtData();
          // CourtDataMutable widens courts to accept OriginalCourtData for go-back restore
          (goBackData as CourtDataMutable).courts[justAssignedCourt - 1] = originalCourtData;
          saveCourtData(goBackData);
          setOriginalCourtData(null);
        } catch (error) {
          logger.error('CourtRoute', 'Failed to restore court', error);
        }
      }
    },
    onStartOver: resetForm,
    onJoinWaitlistDeferred: () => joinWaitlistDeferred(currentGroup ?? []),
  };
}
