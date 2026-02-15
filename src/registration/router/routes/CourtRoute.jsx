// @ts-check
import React from 'react';
import { CourtSelectionScreen } from '../../screens';
import { AlertDisplay, ToastHost, QRScanner } from '../../components';
import ErrorBoundary from '../../../shared/components/ErrorBoundary.jsx';
import { API_CONFIG } from '../../../lib/apiConfig.js';
import { logger } from '../../../lib/logger.js';
import { isCourtEligibleForGroup } from '../../../lib/types/domain.js';
import { buildCourtModel } from '../presenters';

// Platform bridge
import { getTennisUI } from '../../../platform';

/**
 * CourtRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 * Refactored to use presenter functions — WP8.0
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function CourtRoute({ app, handlers }) {
  // Destructure from app
  const {
    state,
    alert,
    mobile,
    refs,
    setters,
    services,
    courtAssignment,
    groupGuest,
    computeRegistrationCourtSelection,
    CONSTANTS,
  } = app;
  const { isChangingCourt, hasWaitlistPriority, displacement, originalCourtData } = state;
  const { justAssignedCourt } = courtAssignment;
  const { currentGroup } = groupGuest;
  const { showAlert, alertMessage, showAlertMessage } = alert;
  const {
    mobileFlow,
    showQRScanner,
    gpsFailedPrompt,
    onQRScanToken,
    onQRScannerClose,
    openQRScanner,
    dismissGpsPrompt,
  } = mobile;
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

  // Get court data from React state
  const courtData = getCourtData();
  const courts = courtData.courts || [];

  // Compute court selection using centralized policy (with 20-min threshold for blocks)
  const courtSelection = computeRegistrationCourtSelection(courts, courtData.upcomingBlocks || []);

  // Filter out singles-only courts for doubles groups
  const playerCount = currentGroup?.length || 0;

  // Only count active (non-deferred) waitlist entries as waiters
  const hasWaiters = courtData.waitlist?.some((e) => !e.deferred) ?? false;

  // Waitlist priority users and normal users (when no waitlist) get selectable courts
  let computedAvailableCourts = [];
  if (hasWaitlistPriority || (!hasWaiters && courtSelection.selectableCourts.length > 0)) {
    computedAvailableCourts = courtSelection
      .getSelectableForGroup(playerCount)
      .map((sc) => sc.number);
  }

  const hasWaitlistEntries = courtData.waitlist.length > 0;
  const showingOvertimeCourts = courtSelection.showingOvertimeCourts;

  // Build model props via presenter
  const computed = {
    availableCourts: computedAvailableCourts,
    showingOvertimeCourts,
    hasWaitingGroups: hasWaitlistEntries,
    waitingGroupsCount: courtData.waitlist.length,
    upcomingBlocks: courtData.upcomingBlocks,
  };
  const model = buildCourtModel(app, computed);

  return (
    <>
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />

      {/* QR Scanner modal for mobile GPS fallback */}
      {showQRScanner && (
        <QRScanner
          onScan={onQRScanToken}
          onClose={onQRScannerClose}
          onError={(err) => {
            logger.error('CourtRoute', 'QR scanner error', err);
          }}
        />
      )}

      {/* GPS failed prompt for mobile */}
      {gpsFailedPrompt && API_CONFIG.IS_MOBILE && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Required</h3>
            <p className="text-gray-600 mb-4">
              We couldn&apos;t detect your location. Please scan the QR code on the kiosk screen to
              verify you&apos;re at the club.
            </p>
            <div className="flex gap-3">
              <button
                onClick={openQRScanner}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Scan QR Code
              </button>
              <button
                onClick={dismissGpsPrompt}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorBoundary context="Court Selection">
        <CourtSelectionScreen
          {...model}
          onDeferWaitlist={async (entryId) => {
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
          }}
          onCourtSelect={async (courtNum) => {
            // If changing courts, handle the court change
            if (isChangingCourt && justAssignedCourt) {
              // If we have displacement info, use atomic undo which ends takeover + restores displaced
              if (
                displacement &&
                displacement.displacedSessionId &&
                displacement.takeoverSessionId
              ) {
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
          }}
          onJoinWaitlist={async () => {
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
          }}
          onAssignNext={async () => {
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
                  c.isAvailable &&
                  !c.isBlocked &&
                  isCourtEligibleForGroup(c.number, waitlistPlayerCount)
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
          }}
          onGoBack={() => {
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
          }}
          onStartOver={resetForm}
          onJoinWaitlistDeferred={async () => {
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
          }}
        />
      </ErrorBoundary>
    </>
  );
}
