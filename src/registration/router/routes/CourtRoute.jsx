// @ts-check
import React from 'react';
import { CourtSelectionScreen } from '../../screens';
import { AlertDisplay, ToastHost, QRScanner } from '../../components';
import ErrorBoundary from '../../../shared/components/ErrorBoundary.jsx';
import { API_CONFIG } from '../../../lib/apiConfig.js';
import { logger } from '../../../lib/logger.js';
import { buildCourtModel, buildCourtActions } from '../presenters';

// Direct workflow context — CourtRoute reads workflow-owned state from context
import { useWorkflowContext } from '../../context/WorkflowProvider';

/**
 * CourtRoute
 * Extracted from RegistrationRouter
 * Collapsed to app/handlers only
 * Refactored to use presenter functions
 *
 * Workflow-owned state is read directly from WorkflowContext.
 * Shell/global state continues to come from app.
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function CourtRoute({ app, handlers }) {
  // Workflow state — read directly from context
  const workflow = useWorkflowContext();

  // Destructure only what the route template needs (not action handlers)
  const { alert, mobile, computeRegistrationCourtSelection } = app;
  const { hasWaitlistPriority } = workflow;
  const { currentGroup } = workflow.groupGuest;
  const { showAlert, alertMessage } = alert;
  const {
    showQRScanner,
    gpsFailedPrompt,
    onQRScanToken,
    onQRScannerClose,
    openQRScanner,
    dismissGpsPrompt,
  } = mobile;

  // Destructure from handlers (only getCourtData needed at route level)
  const { getCourtData } = handlers;

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

  // Build props via presenter functions
  const computed = {
    availableCourts: computedAvailableCourts,
    showingOvertimeCourts,
    hasWaitingGroups: hasWaitlistEntries,
    waitingGroupsCount: courtData.waitlist.length,
    upcomingBlocks: courtData.upcomingBlocks,
  };
  const model = buildCourtModel(app, workflow, computed);
  const actions = buildCourtActions(app, workflow, handlers, { computedAvailableCourts });

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
          {...actions}
          currentGroup={model.currentGroup ?? undefined}
        />
      </ErrorBoundary>
    </>
  );
}
