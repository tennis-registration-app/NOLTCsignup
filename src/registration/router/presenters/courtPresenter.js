// @ts-check
/**
 * CourtSelectionScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by CourtSelectionScreen.
 *
 * Extracted from CourtRoute.jsx — maintains exact prop mapping.
 */

import { logger } from '../../../lib/logger.js';

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

/**
 * Build the actions (callback) props for CourtSelectionScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {import('../../../types/appTypes').Handlers} handlers
 * @param {Object} computed - Route-computed values
 * @param {number[]} computed.computedAvailableCourts
 * @returns {Object} Action props for CourtSelectionScreen
 */
export function buildCourtActions(app, handlers, computed) {
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
    onDeferWaitlist: (entryId) => deferWaitlistEntry(entryId),
    onCourtSelect: async (courtNum) => {
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
      // Mobile: trigger success signal
      if (window.UI?.__mobileSendSuccess__) {
        window.UI.__mobileSendSuccess__();
      }
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
