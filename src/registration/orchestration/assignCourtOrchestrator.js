import { logger } from '../../lib/logger.js';
import { createOrchestrationDeps } from './deps/index.js';
import {
  guardNotAssigning,
  guardOperatingHours,
  guardCourtNumber,
  guardGroup,
  guardGroupCompat,
} from './helpers/index.js';
import { getTennisUI } from '../../platform/windowBridge.js';

/**
 * Assign Court Orchestrator
 * Moved from App.jsx
 *
 * DEPENDENCY CHECKLIST (call-site parity):
 *
 * READ VALUES:
 *   - isAssigning
 *   - mobileFlow
 *   - preselectedCourt
 *   - operatingHours
 *   - currentGroup
 *   - courts (data.courts)
 *   - currentWaitlistEntryId
 *   - CONSTANTS
 *
 * SETTERS:
 *   - setIsAssigning
 *   - setCurrentWaitlistEntryId
 *   - setHasWaitlistPriority
 *   - setCurrentGroup
 *   - setJustAssignedCourt
 *   - setAssignedSessionId
 *   - setAssignedEndTime
 *   - setReplacedGroup
 *   - setDisplacement
 *   - setOriginalCourtData
 *   - setIsChangingCourt
 *   - setWasOvertimeCourt
 *   - setHasAssignedCourt
 *   - setCanChangeCourt
 *   - setChangeTimeRemaining
 *   - setIsTimeLimited
 *   - setTimeLimitReason
 *   - setShowSuccess
 *   - setGpsFailedPrompt
 *
 * SERVICES:
 *   - backend.commands.assignFromWaitlist
 *   - backend.commands.assignCourtWithPlayers
 *   - backend.queries.refresh
 *
 * HELPERS:
 *   - getCourtBlockStatus
 *   - getMobileGeolocation
 *   - showAlertMessage
 *   - validateGroupCompat
 *   - clearSuccessResetTimer
 *   - resetForm
 *   - successResetTimerRef
 *   - dbg
 *   - Tennis (global)
 *   - API_CONFIG
 *
 * Returns: void (same as original — has multiple early returns)
 */

export async function assignCourtToGroupOrchestrated(
  courtNumber,
  selectableCountAtSelection,
  deps
) {
  // Grouped deps structure — { state, actions, services, ui }
  const { state, actions, services, ui } = deps;

  // ===== GUARD SECTION =====

  // Guard 1: Prevent double-submit (silent)
  const assigningCheck = guardNotAssigning(state.isAssigning);
  if (!assigningCheck.ok) {
    logger.debug('AssignCourt', 'Assignment already in progress, ignoring duplicate request');
    // SILENT-GUARD: double-submit prevention — no user feedback needed
    return;
  }

  // Lazy runtime deps - created only when needed (preserves fast-fail)
  let _runtimeDeps;
  const getRuntimeDeps = () => (_runtimeDeps ??= createOrchestrationDeps());

  // Mobile: Use preselected court if in mobile flow
  if (state.mobileFlow && state.preselectedCourt && !courtNumber) {
    courtNumber = state.preselectedCourt;
    getRuntimeDeps().logger.debug('AssignCourt', 'Mobile: Using preselected court', courtNumber);
  }

  // Guard 2: Check operating hours (toast)
  const now = new Date();
  const hoursCheck = guardOperatingHours({
    operatingHours: state.operatingHours,
    currentHour: now.getHours(),
    currentMinutes: now.getMinutes(),
    dayOfWeek: now.getDay(),
  });
  if (!hoursCheck.ok) {
    if (hoursCheck.ui?.action === 'toast') {
      getTennisUI()?.toast(...hoursCheck.ui.args);
    }
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Guard 3: Validate court number (alert)
  const courtCheck = guardCourtNumber({
    courtNumber,
    courtCount: state.CONSTANTS.COURT_COUNT,
  });
  if (!courtCheck.ok) {
    if (courtCheck.ui?.action === 'alert') {
      ui.showAlertMessage(...courtCheck.ui.args);
    }
    // FEEDBACK: alert provides user feedback above
    return;
  }

  // Guard 4: Validate group has players (alert)
  const groupCheck = guardGroup({ currentGroup: state.currentGroup });
  if (!groupCheck.ok) {
    if (groupCheck.ui?.action === 'alert') {
      ui.showAlertMessage(...groupCheck.ui.args);
    }
    // FEEDBACK: alert provides user feedback above
    return;
  }

  // Create arrays for validation and assignment
  // Handle both field name formats: id/name (legacy) and memberId/displayName (API)
  const players = state.currentGroup
    .filter((p) => !p.isGuest) // Non-guests for validation
    .map((p) => ({
      id: String(p.id || p.memberId || '').trim(),
      name: String(p.name || p.displayName || '').trim(),
    }))
    .filter((p) => p && p.id && p.name);

  const allPlayers = state.currentGroup // ALL players including guests for court assignment
    .map((p) => ({
      id: String(p.id || p.memberId || '').trim(),
      name: String(p.name || p.displayName || '').trim(),
      ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
      ...(p.sponsor && { sponsor: p.sponsor }),
      ...(p.memberNumber && { memberNumber: p.memberNumber }),
    }))
    .filter((p) => p && p.id && p.name);

  const guests = state.currentGroup.filter((p) => p.isGuest).length;

  // Guard 5: Domain validation (alert)
  const compatCheck = guardGroupCompat({
    players,
    guests,
    validateGroupCompat: services.validateGroupCompat,
  });
  if (!compatCheck.ok) {
    if (compatCheck.ui?.action === 'alert') {
      ui.showAlertMessage(...compatCheck.ui.args);
    }
    // FEEDBACK: alert provides user feedback above
    return;
  }

  // Duration determined from group size (including guests)
  const domain = getRuntimeDeps().platform.getTennisDomain();
  const Tm = domain?.time || domain?.Time;
  const duration = Tm.durationForGroupSize(allPlayers.length); // typically 60/90

  // Canonical group object (use allPlayers so guests appear on court)
  const group = { players: allPlayers, guests };

  // Check for upcoming block on selected court using new system
  const blockStatus = await services.getCourtBlockStatus(courtNumber);
  if (blockStatus && !blockStatus.isCurrent && blockStatus.startTime) {
    const nowBlock = new Date();
    const blockStart = new Date(blockStatus.startTime);
    const sessionEnd = new Date(nowBlock.getTime() + duration * 60000);

    // Check if block will start before session ends
    if (blockStart < sessionEnd) {
      const minutesUntilBlock = Math.ceil((blockStart - nowBlock) / 60000);
      const confirmMsg = `⚠️ This court has a block starting in ${minutesUntilBlock} minutes (${blockStatus.reason}). You may not get your full ${duration} minutes.\n\nDo you want to take this court anyway?`;

      const proceed = confirm(confirmMsg);
      if (!proceed) {
        ui.showAlertMessage('Please select a different court or join the waitlist.');
        // FEEDBACK: alert provides user feedback above
        return; // Exit without assigning
      }
    }
  }

  getRuntimeDeps().logger.debug('AssignCourt', 'UI preparing to assignCourt with', {
    courtNumber,
    group,
    duration,
  });

  // If this is a waitlist group (CTA flow), use assignFromWaitlist instead
  if (state.currentWaitlistEntryId) {
    // Get court UUID for the waitlist assignment
    const waitlistCourt = state.courts.find((c) => c.number === courtNumber);
    if (!waitlistCourt) {
      getRuntimeDeps().logger.error(
        'AssignCourt',
        'Court not found for waitlist assignment',
        courtNumber
      );
      getTennisUI()?.toast('Court not found. Please refresh and try again.', { type: 'error' });
      // FEEDBACK: toast provides user feedback above
      return;
    }

    // Get geolocation for mobile (required by backend for geofence validation)
    const waitlistMobileLocation = await services.getMobileGeolocation();

    try {
      const result = await services.backend.commands.assignFromWaitlist({
        waitlistEntryId: state.currentWaitlistEntryId,
        courtId: waitlistCourt.id,
        ...(waitlistMobileLocation || {}),
      });
      getRuntimeDeps().logger.debug('AssignCourt', 'Waitlist group assigned result', result);

      if (!result.ok) {
        // Handle "Court occupied" race condition
        if (result.code === 'COURT_OCCUPIED') {
          getTennisUI()?.toast('This court was just taken. Refreshing...', { type: 'warning' });
          actions.setCurrentWaitlistEntryId(null);
          await services.backend.queries.refresh();
          // FEEDBACK: toast provides user feedback above
          return;
        }
        // Handle mobile location errors - offer QR fallback
        if (state.API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
          actions.setGpsFailedPrompt(true);
          // FEEDBACK: GPS prompt modal provides user feedback
          return;
        }
        getTennisUI()?.toast(result.message || 'Failed to assign court from waitlist', {
          type: 'error',
        });
        actions.setCurrentWaitlistEntryId(null);
        // FEEDBACK: toast provides user feedback above
        return;
      }

      // Clear the waitlist entry ID after successful assignment
      actions.setCurrentWaitlistEntryId(null);
      actions.setHasWaitlistPriority(false);
      // Also clear mobile sessionStorage waitlist entry
      sessionStorage.removeItem('mobile-waitlist-entry-id');

      // Board subscription will auto-refresh
      getRuntimeDeps().logger.debug(
        'AssignCourt',
        'Waitlist assignment successful, waiting for board refresh signal'
      );

      // Update currentGroup with participant details for ball purchases
      if (result.session?.participantDetails) {
        const groupFromWaitlist = result.session.participantDetails.map((p) => ({
          memberNumber: p.memberId,
          name: p.name,
          accountId: p.accountId,
          isGuest: p.isGuest,
        }));
        actions.setCurrentGroup(groupFromWaitlist);
      }

      // Update UI state
      actions.setJustAssignedCourt(courtNumber);
      actions.setAssignedSessionId(result.session?.id || null); // Capture session ID for ball purchases
      actions.setAssignedEndTime(
        result.session?.scheduled_end_at || result.session?.scheduledEndAt || null
      ); // Capture end time from API (snake_case) or normalized (camelCase)
      actions.setReplacedGroup(null);
      actions.setDisplacement(null);
      actions.setOriginalCourtData(null);
      actions.setIsChangingCourt(false);
      actions.setWasOvertimeCourt(false);
      actions.setHasAssignedCourt(true);
      actions.setCanChangeCourt(false); // Waitlist groups typically don't get court change option
      actions.setShowSuccess(true);

      // Mobile: trigger success signal
      const uiPlatform = getRuntimeDeps().platform.getUI();
      if (uiPlatform?.__mobileSendSuccess__) {
        uiPlatform.__mobileSendSuccess__();
      }

      // Auto-reset timer
      if (!state.mobileFlow) {
        services.clearSuccessResetTimer();
        state.successResetTimerRef.current = setTimeout(() => {
          state.successResetTimerRef.current = null;
          services.resetForm();
        }, state.CONSTANTS.AUTO_RESET_SUCCESS_MS);
      }

      // Explicit refresh to ensure fresh state (belt-and-suspenders with Realtime)
      await services.backend.queries.refresh();

      // EARLY-EXIT: waitlist flow complete — success screen shown
      return;
    } catch (error) {
      getRuntimeDeps().logger.error('AssignCourt', 'assignFromWaitlist failed', error);
      actions.setCurrentWaitlistEntryId(null);
      getTennisUI()?.toast(error.message || 'Failed to assign court from waitlist', {
        type: 'error',
      });
      // FEEDBACK: toast provides user feedback above
      return;
    }
  }

  // Get court UUID from court number
  const court = state.courts.find((c) => c.number === courtNumber);
  if (!court) {
    getRuntimeDeps().logger.error('AssignCourt', 'Court not found for number', courtNumber);
    getTennisUI()?.toast('Court not found. Please refresh and try again.', { type: 'error' });
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Determine group type from player count
  const groupType = allPlayers.length <= 3 ? 'singles' : 'doubles';

  // Get geolocation for mobile (required by backend for geofence validation)
  const mobileLocation = await services.getMobileGeolocation();

  const assignStartTime = performance.now();
  getRuntimeDeps().logger.debug(
    'AssignCourt',
    '[T+0ms] Calling backend.commands.assignCourtWithPlayers',
    {
      courtId: court.id,
      courtNumber: court.number,
      groupType,
      playerCount: allPlayers.length,
      mobileLocation: mobileLocation ? 'provided' : 'not-mobile',
    }
  );

  actions.setIsAssigning(true);
  let result;
  try {
    result = await services.backend.commands.assignCourtWithPlayers({
      courtId: court.id,
      players: allPlayers,
      groupType,
      ...(mobileLocation || {}), // Spread latitude/longitude if available
    });
    const apiDuration = Math.round(performance.now() - assignStartTime);
    getRuntimeDeps().logger.debug(
      'AssignCourt',
      `[T+${apiDuration}ms] Court assigned result`,
      result
    );
  } catch (error) {
    const apiDuration = Math.round(performance.now() - assignStartTime);
    getRuntimeDeps().logger.error(
      'AssignCourt',
      `[T+${apiDuration}ms] assignCourtWithPlayers threw error`,
      error
    );
    getTennisUI()?.toast(error.message || 'Failed to assign court. Please try again.', {
      type: 'error',
    });
    actions.setIsAssigning(false);
    // FEEDBACK: toast provides user feedback above
    return;
  }

  if (!result.ok) {
    getRuntimeDeps().logger.debug('AssignCourt', 'assignCourtWithPlayers returned ok:false', {
      code: result.code,
      message: result.message,
    });
    // Handle "Court occupied" race condition
    if (result.code === 'COURT_OCCUPIED') {
      getTennisUI()?.toast('This court was just taken. Refreshing...', { type: 'warning' });
      // Board subscription will auto-refresh, but force immediate refresh
      await services.backend.queries.refresh();
      actions.setIsAssigning(false);
      // FEEDBACK: toast provides user feedback above
      return;
    }
    // Handle mobile location errors - offer QR fallback
    if (state.API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
      actions.setGpsFailedPrompt(true);
      actions.setIsAssigning(false);
      // FEEDBACK: GPS prompt modal provides user feedback
      return;
    }
    getTennisUI()?.toast(result.message || 'Failed to assign court', { type: 'error' });
    actions.setIsAssigning(false);
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Success - clear the assigning flag
  actions.setIsAssigning(false);

  // Success! Update UI state, then refresh board for fresh data
  const successTime = Math.round(performance.now() - assignStartTime);
  getRuntimeDeps().logger.debug(
    'AssignCourt',
    `[T+${successTime}ms] Court assignment successful, updating UI state...`
  );

  // Determine if court change should be allowed
  // If only one court was selectable when user chose, no change option
  const allowCourtChange =
    selectableCountAtSelection !== null ? selectableCountAtSelection > 1 : false;

  // Update UI state based on result
  actions.setJustAssignedCourt(courtNumber);
  actions.setAssignedSessionId(result.session?.id || null); // Capture session ID for ball purchases
  actions.setAssignedEndTime(
    result.session?.scheduled_end_at || result.session?.scheduledEndAt || null
  ); // Capture end time from API (snake_case) or normalized (camelCase)

  // Construct replacedGroup from displacement.participants for SuccessScreen messaging
  const replacedGroupFromDisplacement =
    result.displacement?.participants?.length > 0
      ? {
          players: result.displacement.participants.map((name) => ({ name })),
          endTime: result.displacement.restoreUntil,
        }
      : null;
  actions.setReplacedGroup(replacedGroupFromDisplacement);
  actions.setDisplacement(result.displacement); // Will be null if no overtime was displaced
  actions.setOriginalCourtData(null);
  actions.setIsChangingCourt(false);
  actions.setWasOvertimeCourt(false);
  actions.setHasAssignedCourt(true); // Track that this group has a court
  actions.setCanChangeCourt(allowCourtChange); // Only true if alternatives exist
  actions.setChangeTimeRemaining(state.CONSTANTS.CHANGE_COURT_TIMEOUT_SEC);
  actions.setIsTimeLimited(result.isTimeLimited || result.isInheritedEndTime || false); // Track if time was limited
  actions.setTimeLimitReason(result.timeLimitReason || (result.isTimeLimited ? 'block' : null));
  actions.setShowSuccess(true);

  const uiUpdateTime = Math.round(performance.now() - assignStartTime);
  getRuntimeDeps().logger.debug(
    'AssignCourt',
    `[T+${uiUpdateTime}ms] UI state updated, showSuccess=true`
  );

  // Mobile: trigger success signal
  const uiNs = getRuntimeDeps().platform.getUI();
  services.dbg('Registration: Checking mobile success signal...', !!uiNs?.__mobileSendSuccess__);
  if (uiNs?.__mobileSendSuccess__) {
    services.dbg('Registration: Calling mobile success signal');
    uiNs.__mobileSendSuccess__();
  }

  // Auto-reset timer for court assignment (same as waitlist)
  if (!state.mobileFlow) {
    services.clearSuccessResetTimer();
    state.successResetTimerRef.current = setTimeout(() => {
      state.successResetTimerRef.current = null;
      services.resetForm();
    }, state.CONSTANTS.AUTO_RESET_SUCCESS_MS);
  }

  if (allowCourtChange) {
    const timer = setInterval(() => {
      actions.setChangeTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          actions.setCanChangeCourt(false);
          // Don't call resetForm() - let user decide when to leave
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Explicit refresh to ensure fresh state (belt-and-suspenders with Realtime)
  try {
    await services.backend.queries.refresh();
  } catch {
    // Refresh is best-effort; board subscription will catch up
  }
  // ===== END ORIGINAL FUNCTION BODY =====
}
