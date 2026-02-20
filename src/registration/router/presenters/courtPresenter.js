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
import { isCourtEligibleForGroup } from '../../../lib/types/domain.js';
import { getTennisUI } from '../../../platform';

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
  // Destructure from app (verbatim from CourtRoute)
  const { state, alert, mobile, refs, setters, services, groupGuest, CONSTANTS } = app;
  const { isChangingCourt, displacement, originalCourtData } = state;
  const { justAssignedCourt } = app.courtAssignment;
  const { currentGroup } = groupGuest;
  const { showAlertMessage } = alert;
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
  const { backend } = services;

  // Destructure from handlers
  const {
    getCourtData,
    clearCourt,
    assignCourtToGroup,
    sendGroupToWaitlist,
    clearSuccessResetTimer,
    resetForm,
    saveCourtData,
  } = handlers;

  // Destructure from computed
  const { computedAvailableCourts } = computed;

  return {
    onDeferWaitlist: async (entryId) => {
      try {
        const res = await backend.commands.deferWaitlistEntry({
          entryId,
          deferred: true,
        });
        if (res?.ok) {
          getTennisUI()?.toast?.(
            'Staying on waitlist — we will notify you when a full court opens',
            {
              type: 'success',
            }
          );
        } else {
          getTennisUI()?.toast?.(res?.message || 'Failed to defer', { type: 'error' });
        }
      } catch (err) {
        logger.error('CourtRoute', 'deferWaitlistEntry failed', err);
        getTennisUI()?.toast?.('Failed to defer — please try again', { type: 'error' });
      }
      resetForm();
    },
    onCourtSelect: async (courtNum) => {
      // If changing courts, handle the court change
      if (isChangingCourt && justAssignedCourt) {
        // If we have displacement info, use atomic undo which ends takeover + restores displaced
        if (displacement && displacement.displacedSessionId && displacement.takeoverSessionId) {
          try {
            const undoResult = await backend.commands.undoOvertimeTakeover({
              takeoverSessionId: displacement.takeoverSessionId,
              displacedSessionId: displacement.displacedSessionId,
            });
            // If undo failed with conflict, fall back to clearCourt
            if (!undoResult.ok) {
              logger.warn(
                'CourtRoute',
                'Undo returned conflict, falling back to clearCourt',
                undoResult
              );
              await clearCourt(justAssignedCourt, 'Bumped');
            }
            // If ok: true, the undo endpoint already ended the takeover session - no clearCourt needed
          } catch (err) {
            logger.error('CourtRoute', 'Undo takeover failed', err);
            // Fallback: just clear the court if undo fails
            await clearCourt(justAssignedCourt, 'Bumped');
          }
        } else {
          // No displacement - just clear the court normally
          await clearCourt(justAssignedCourt, 'Bumped');
        }
        setDisplacement(null); // Clear ONLY after court change is complete
      }
      await assignCourtToGroup(courtNum, computedAvailableCourts.length);
      // setDisplacement(null) removed from here - it was clearing the state prematurely
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
    onAssignNext: async () => {
      logger.debug('CourtRoute', 'ASSIGN NEXT button clicked');
      try {
        // Get current board state
        const board = await backend.queries.getBoard();

        // Find first waiting entry
        const firstWaiting = board?.waitlist?.find((e) => e.status === 'waiting');
        if (!firstWaiting) {
          showAlertMessage('No entries waiting in queue');
          return;
        }

        // Find first available court (respecting singles-only restrictions)
        const waitlistPlayerCount = firstWaiting.group?.players?.length || 0;
        const availableCourt = board?.courts?.find(
          (c) =>
            c.isAvailable && !c.isBlocked && isCourtEligibleForGroup(c.number, waitlistPlayerCount)
        );
        if (!availableCourt) {
          showAlertMessage('No courts available');
          return;
        }

        // Assign using API
        const res = await backend.commands.assignFromWaitlist({
          waitlistEntryId: firstWaiting.id,
          courtId: availableCourt.id,
        });

        if (res?.ok) {
          getTennisUI()?.toast?.(`Assigned to Court ${availableCourt.number}`, {
            type: 'success',
          });
          showAlertMessage(`Assigned to Court ${availableCourt.number}`);
        } else {
          getTennisUI()?.toast?.(res?.message || 'Failed assigning next', {
            type: 'error',
          });
          showAlertMessage(res?.message || 'Failed assigning next');
        }
      } catch (err) {
        logger.error('CourtRoute', 'ASSIGN NEXT error', err);
        showAlertMessage(err.message || 'Failed assigning next');
      }
    },
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
    onJoinWaitlistDeferred: async () => {
      try {
        await sendGroupToWaitlist(currentGroup, { deferred: true });
        getTennisUI()?.toast?.("You'll be notified when a full-time court is available", {
          type: 'success',
        });
      } catch (err) {
        logger.error('CourtRoute', 'joinWaitlistDeferred failed', err);
        getTennisUI()?.toast?.('Failed to join waitlist — please try again', {
          type: 'error',
        });
      }
      resetForm();
    },
  };
}
