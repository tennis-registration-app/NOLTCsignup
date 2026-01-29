import React from 'react';
import { CourtSelectionScreen } from '../../screens';
import { AlertDisplay, ToastHost, QRScanner } from '../../components';
import { API_CONFIG } from '../../../lib/apiConfig.js';

/**
 * CourtRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Added app/handlers grouping — WP6.0.2a
 * Verbatim JSX. No behavior change.
 */
export function CourtRoute(props) {
  // Bridge mode: prefer app/handlers, fallback to props for compatibility
  const app = props.app ?? props;
  const handlers = props.handlers ?? props;

  // Destructure from app (state/config)
  const {
    // State
    isChangingCourt = app.state?.isChangingCourt,
    hasAssignedCourt = app.derived?.hasAssignedCourt,
    justAssignedCourt = app.state?.justAssignedCourt,
    currentGroup = app.groupGuest?.currentGroup,
    isMobileView = app.derived?.isMobileView,
    hasWaitlistPriority = app.state?.hasWaitlistPriority,
    showAlert = app.alert?.showAlert,
    alertMessage = app.alert?.alertMessage,
    displacement = app.state?.displacement,
    originalCourtData = app.state?.originalCourtData,
    mobileFlow = app.mobile?.mobileFlow,
    // QR Scanner
    showQRScanner = app.qrScanner?.showQRScanner,
    gpsFailedPrompt = app.qrScanner?.gpsFailedPrompt,
    // Refs
    successResetTimerRef = app.refs?.successResetTimerRef,
    // Utilities
    backend = app.backend,
    CONSTANTS = app.CONSTANTS,
  } = props;

  // Destructure from handlers
  const {
    // QR Scanner handlers
    onQRScanToken = handlers.onQRScanToken,
    onQRScannerClose = handlers.onQRScannerClose,
    openQRScanner = handlers.openQRScanner,
    dismissGpsPrompt = handlers.dismissGpsPrompt,
    // Callbacks
    getCourtData = handlers.getCourtData,
    computeRegistrationCourtSelection = handlers.computeRegistrationCourtSelection,
    getCourtBlockStatus = app.blockAdmin?.getCourtBlockStatus,
    clearCourt = handlers.clearCourt,
    setDisplacement = app.setters?.setDisplacement,
    setIsChangingCourt = app.setters?.setIsChangingCourt,
    setWasOvertimeCourt = app.setters?.setWasOvertimeCourt,
    assignCourtToGroup = handlers.assignCourtToGroup,
    sendGroupToWaitlist = handlers.sendGroupToWaitlist,
    setShowSuccess = app.setters?.setShowSuccess,
    clearSuccessResetTimer = handlers.clearSuccessResetTimer,
    resetForm = handlers.resetForm,
    showAlertMessage = app.alert?.showAlertMessage,
    setCurrentScreen = app.setters?.setCurrentScreen,
    setOriginalCourtData = app.setters?.setOriginalCourtData,
    saveCourtData = handlers.saveCourtData,
  } = props;

  // When a group has already been assigned a court, treat it like changing courts
  const isSelectingDifferentCourt = isChangingCourt || hasAssignedCourt;

  // Get court data from React state
  const reactData = getCourtData();
  const courtData = reactData;
  const courts = courtData.courts || [];

  // Compute court selection using centralized policy
  const courtSelection = computeRegistrationCourtSelection(courts);
  const unoccupiedCourts = courtSelection.primaryCourts;
  const overtimeCourts = courtSelection.fallbackOvertimeCourts;

  // Selectable: unoccupied first, then overtime if no unoccupied
  const selectableCourts = courtSelection.showingOvertimeCourts ? overtimeCourts : unoccupiedCourts;
  const selectable = selectableCourts.map((c) => c.number);

  const hasWaiters = (courtData.waitlist?.length || 0) > 0;

  // If user has waitlist priority, they should ONLY see FREE courts (not overtime)
  // Otherwise, only show courts when no one is waiting
  let computedAvailableCourts = [];
  if (hasWaitlistPriority) {
    // For waitlist priority users, prefer unoccupied courts, fallback to overtime
    const unoccupiedNumbers = unoccupiedCourts.map((c) => c.number);
    const overtimeNumbers = overtimeCourts.map((c) => c.number);

    if (unoccupiedNumbers.length > 0) {
      computedAvailableCourts = unoccupiedNumbers;
    } else if (overtimeNumbers.length > 0) {
      computedAvailableCourts = overtimeNumbers;
    }
  } else if (!hasWaiters && selectable.length > 0) {
    // Normal users get all selectable courts when no waitlist
    computedAvailableCourts = selectable;
  }

  const showCourtTiles = computedAvailableCourts.length > 0;

  console.log('[COURT SCREEN] Debug:', {
    hasWaiters,
    hasWaitlistPriority,
    selectableLength: selectable.length,
    showCourtTiles,
    availableCourtsLength: computedAvailableCourts.length,
  });

  const hasWaitlistEntries = courtData.waitlist.length > 0;

  // Check if showing overtime courts
  // Only count truly free courts as unoccupied (not blocked or wet courts)
  const hasUnoccupiedCourts = courtData.courts.some((court, index) => {
    const courtNumber = index + 1;

    // Check if court is blocked or wet
    const blockStatus = getCourtBlockStatus(courtNumber);
    if (blockStatus && blockStatus.isCurrent) {
      return false; // Blocked courts are not unoccupied
    }

    // Only count as unoccupied if it's truly free AND selectable
    // Domain format: court.session.group.players
    const isTrulyFree =
      !court ||
      court.wasCleared ||
      (!court.session && court.history) ||
      !court.session?.group?.players?.length;

    // Additional check: must also be in the selectable courts list
    const isSelectable = computedAvailableCourts.includes(courtNumber);

    return isTrulyFree && isSelectable;
  });
  const showingOvertimeCourts =
    computedAvailableCourts.length > 0 && !hasUnoccupiedCourts && !isSelectingDifferentCourt;

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
            console.error('[Mobile] QR scanner error:', err);
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

      <CourtSelectionScreen
        availableCourts={computedAvailableCourts}
        showingOvertimeCourts={showingOvertimeCourts}
        hasWaitingGroups={hasWaitlistEntries}
        waitingGroupsCount={courtData.waitlist.length}
        currentGroup={currentGroup}
        isMobileView={isMobileView}
        upcomingBlocks={courtData.upcomingBlocks}
        onCourtSelect={async (courtNum) => {
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
                  console.warn(
                    '[Displacement] Undo returned conflict, falling back to clearCourt:',
                    undoResult
                  );
                  await clearCourt(justAssignedCourt, 'Bumped');
                }
                // If ok: true, the undo endpoint already ended the takeover session - no clearCourt needed
              } catch (err) {
                console.error('[Displacement] Undo takeover failed:', err);
                // Fallback: just clear the court if undo fails
                await clearCourt(justAssignedCourt, 'Bumped');
              }
            } else {
              // No displacement - just clear the court normally
              await clearCourt(justAssignedCourt, 'Bumped');
            }
            setDisplacement(null); // Clear ONLY after court change is complete
          }
          console.log(
            '[Change Court Debug] availableCourts at selection:',
            computedAvailableCourts,
            'length:',
            computedAvailableCourts.length
          );
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
          console.log('[ASSIGN NEXT] Button clicked');
          try {
            // Get current board state
            const board = await backend.queries.getBoard();

            // Find first waiting entry
            const firstWaiting = board?.waitlist?.find((e) => e.status === 'waiting');
            if (!firstWaiting) {
              showAlertMessage('No entries waiting in queue');
              return;
            }

            // Find first available court
            const availableCourt = board?.courts?.find((c) => c.isAvailable && !c.isBlocked);
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
              window.Tennis?.UI?.toast?.(`Assigned to Court ${availableCourt.number}`, {
                type: 'success',
              });
              showAlertMessage(`Assigned to Court ${availableCourt.number}`);
            } else {
              window.Tennis?.UI?.toast?.(res?.message || 'Failed assigning next', {
                type: 'error',
              });
              showAlertMessage(res?.message || 'Failed assigning next');
            }
          } catch (err) {
            console.error('[ASSIGN NEXT] Error:', err);
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
              console.error('Failed to restore court:', error);
            }
          }
        }}
        onStartOver={resetForm}
      />
    </>
  );
}
