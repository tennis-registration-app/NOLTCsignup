/**
 * CourtSelectionScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by CourtSelectionScreen.
 *
 * Extracted from CourtRoute.jsx — maintains exact prop mapping.
 */

import type { AppState, Handlers } from '../../../types/appTypes.js';
import { logger } from '../../../lib/logger.js';

export interface CourtModelComputed {
  availableCourts: number[];
  showingOvertimeCourts: boolean;
  hasWaitingGroups: boolean;
  waitingGroupsCount: number;
  upcomingBlocks: any[];
}

export interface CourtModel {
  // Computed values (from route)
  availableCourts: number[];
  showingOvertimeCourts: boolean;
  hasWaitingGroups: boolean;
  waitingGroupsCount: number;
  upcomingBlocks: any[];
  // Direct state values
  currentGroup: any[] | null;
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
 * Build the model (data) props for CourtSelectionScreen
 */
export function buildCourtModel(app: AppState, computed: CourtModelComputed): CourtModel {
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

/**
 * Build the actions (callback) props for CourtSelectionScreen
 */
export function buildCourtActions(
  app: AppState,
  handlers: Handlers,
  computed: CourtActionsComputed
): CourtActions {
  // Destructure from app
  const { state, mobile, refs, setters, groupGuest, CONSTANTS } = app;
  const { isChangingCourt, displacement, originalCourtData } = state;
  const { justAssignedCourt } = app.courtAssignment;
  const { currentGroup } = groupGuest;
  const { mobileFlow } = mobile;
  const { successResetTimerRef } = refs;
  const {
    setDisplacement,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setShowSuccess,
    setCurrentScreen,
    setOriginalCourtData,
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
        await undoOvertimeAndClearPrevious(justAssignedCourt, displacement);
        setDisplacement(null); // Clear ONLY after court change is complete
      }
      await assignCourtToGroup(courtNum, computedAvailableCourts.length);
      setIsChangingCourt(false);
      setWasOvertimeCourt(false);
    },
    onJoinWaitlist: async () => {
      await sendGroupToWaitlist(currentGroup);
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
          goBackData.courts[justAssignedCourt - 1] = originalCourtData;
          saveCourtData(goBackData);
          setOriginalCourtData(null);
        } catch (error) {
          logger.error('CourtRoute', 'Failed to restore court', error);
        }
      }
    },
    onStartOver: resetForm,
    onJoinWaitlistDeferred: () => joinWaitlistDeferred(currentGroup),
  };
}
