import { logger } from '../../lib/logger.js';
import { getTennisDomain, getUI } from '../../platform/windowBridge.js';

/**
 * Assign Court Orchestrator
 * Moved from App.jsx — WP5.5 facade extraction
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

/* global Tennis */

export async function assignCourtToGroupOrchestrated(
  courtNumber,
  selectableCountAtSelection,
  deps
) {
  const {
    // Read values
    isAssigning,
    mobileFlow,
    preselectedCourt,
    operatingHours,
    currentGroup,
    courts,
    currentWaitlistEntryId,
    CONSTANTS,
    // Setters
    setIsAssigning,
    setCurrentWaitlistEntryId,
    setHasWaitlistPriority,
    setCurrentGroup,
    setJustAssignedCourt,
    setAssignedSessionId,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setHasAssignedCourt,
    setCanChangeCourt,
    setChangeTimeRemaining,
    setIsTimeLimited,
    setTimeLimitReason,
    setShowSuccess,
    setGpsFailedPrompt,
    // Services
    backend,
    // Helpers
    getCourtBlockStatus,
    getMobileGeolocation,
    showAlertMessage,
    validateGroupCompat,
    clearSuccessResetTimer,
    resetForm,
    successResetTimerRef,
    dbg,
    API_CONFIG,
  } = deps;

  // ===== ORIGINAL FUNCTION BODY (VERBATIM) =====
  // Prevent double-submit
  if (isAssigning) {
    logger.debug('AssignCourt', 'Assignment already in progress, ignoring duplicate request');
    return;
  }

  // Mobile: Use preselected court if in mobile flow
  if (mobileFlow && preselectedCourt && !courtNumber) {
    courtNumber = preselectedCourt;
    logger.debug('AssignCourt', 'Mobile: Using preselected court', courtNumber);
  }

  // Check if club is open (using API operating hours when available)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Get opening time from API
  let openingTime;
  let openingTimeString;

  if (operatingHours && Array.isArray(operatingHours) && operatingHours.length > 0) {
    // Find today's operating hours from API
    // Handle both snake_case (from API) and camelCase formats
    const todayHours = operatingHours.find((h) => (h.dayOfWeek ?? h.day_of_week) === dayOfWeek);
    const isClosed = todayHours?.isClosed ?? todayHours?.is_closed;
    if (todayHours && !isClosed) {
      // Parse opensAt (format: "HH:MM:SS") - handle both camelCase and snake_case
      const opensAtValue = todayHours.opensAt ?? todayHours.opens_at;
      const [hours, minutes] = opensAtValue.split(':').map(Number);
      openingTime = hours + minutes / 60;
      // Format for display (e.g., "5:00 AM")
      const hour12 = hours % 12 || 12;
      const ampm = hours < 12 ? 'AM' : 'PM';
      openingTimeString = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else if (todayHours && isClosed) {
      Tennis.UI.toast('The club is closed today.', { type: 'warning' });
      return;
    } else {
      // Fallback if no hours found for today
      openingTime = 0; // Allow registration if no hours configured
      openingTimeString = 'N/A';
    }
  } else {
    // No operating hours data - allow registration (API may not be returning hours)
    openingTime = 0;
    openingTimeString = 'N/A';
  }

  const currentTime = currentHour + currentMinutes / 60;

  // If too early, show alert and return
  if (currentTime < openingTime) {
    Tennis.UI.toast(
      `The club is not open yet. Court registration will be available at ${openingTimeString}.`,
      { type: 'warning' }
    );
    return;
  }

  // Validate court number
  if (!courtNumber || courtNumber < 1 || courtNumber > CONSTANTS.COURT_COUNT) {
    showAlertMessage(
      `Invalid court number. Please select a court between 1 and ${CONSTANTS.COURT_COUNT}.`
    );
    return;
  }

  // Validate group has players
  if (!currentGroup || currentGroup.length === 0) {
    showAlertMessage('No players in group. Please add players first.');
    return;
  }

  // Create arrays for validation and assignment
  // Handle both field name formats: id/name (legacy) and memberId/displayName (API)
  const players = currentGroup
    .filter((p) => !p.isGuest) // Non-guests for validation
    .map((p) => ({
      id: String(p.id || p.memberId || '').trim(),
      name: String(p.name || p.displayName || '').trim(),
    }))
    .filter((p) => p && p.id && p.name);

  const allPlayers = currentGroup // ALL players including guests for court assignment
    .map((p) => ({
      id: String(p.id || p.memberId || '').trim(),
      name: String(p.name || p.displayName || '').trim(),
      ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
      ...(p.sponsor && { sponsor: p.sponsor }),
      ...(p.memberNumber && { memberNumber: p.memberNumber }),
    }))
    .filter((p) => p && p.id && p.name);

  const guests = currentGroup.filter((p) => p.isGuest).length;

  // Domain validation (reuse the same error UI as submit)
  const { ok, errors } = validateGroupCompat(players, guests);
  if (!ok) {
    showAlertMessage(errors.join('\n'));
    return;
  }

  // Duration determined from group size (including guests)
  const domain = getTennisDomain();
  const Tm = domain?.time || domain?.Time;
  const duration = Tm.durationForGroupSize(allPlayers.length); // typically 60/90

  // Canonical group object (use allPlayers so guests appear on court)
  const group = { players: allPlayers, guests };

  // Check for upcoming block on selected court using new system
  const blockStatus = await getCourtBlockStatus(courtNumber);
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
        showAlertMessage('Please select a different court or join the waitlist.');
        return; // Exit without assigning
      }
    }
  }

  logger.debug('AssignCourt', 'UI preparing to assignCourt with', {
    courtNumber,
    group,
    duration,
  });

  // If this is a waitlist group (CTA flow), use assignFromWaitlist instead
  if (currentWaitlistEntryId) {
    // Get court UUID for the waitlist assignment
    const waitlistCourt = courts.find((c) => c.number === courtNumber);
    if (!waitlistCourt) {
      logger.error('AssignCourt', 'Court not found for waitlist assignment', courtNumber);
      Tennis.UI.toast('Court not found. Please refresh and try again.', { type: 'error' });
      return;
    }

    // Get geolocation for mobile (required by backend for geofence validation)
    const waitlistMobileLocation = await getMobileGeolocation();

    try {
      const result = await backend.commands.assignFromWaitlist({
        waitlistEntryId: currentWaitlistEntryId,
        courtId: waitlistCourt.id,
        ...(waitlistMobileLocation || {}),
      });
      logger.debug('AssignCourt', 'Waitlist group assigned result', result);

      if (!result.ok) {
        // Handle "Court occupied" race condition
        if (result.code === 'COURT_OCCUPIED') {
          Tennis.UI.toast('This court was just taken. Refreshing...', { type: 'warning' });
          setCurrentWaitlistEntryId(null);
          await backend.queries.refresh();
          return;
        }
        // Handle mobile location errors - offer QR fallback
        if (API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
          setGpsFailedPrompt(true);
          return;
        }
        Tennis.UI.toast(result.message || 'Failed to assign court from waitlist', {
          type: 'error',
        });
        setCurrentWaitlistEntryId(null);
        return;
      }

      // Clear the waitlist entry ID after successful assignment
      setCurrentWaitlistEntryId(null);
      setHasWaitlistPriority(false);
      // Also clear mobile sessionStorage waitlist entry
      sessionStorage.removeItem('mobile-waitlist-entry-id');

      // Board subscription will auto-refresh
      logger.debug(
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
        setCurrentGroup(groupFromWaitlist);
      }

      // Update UI state
      setJustAssignedCourt(courtNumber);
      setAssignedSessionId(result.session?.id || null); // Capture session ID for ball purchases
      setReplacedGroup(null);
      setDisplacement(null);
      setOriginalCourtData(null);
      setIsChangingCourt(false);
      setWasOvertimeCourt(false);
      setHasAssignedCourt(true);
      setCanChangeCourt(false); // Waitlist groups typically don't get court change option
      setShowSuccess(true);

      // Mobile: trigger success signal
      const ui = getUI();
      if (ui?.__mobileSendSuccess__) {
        ui.__mobileSendSuccess__();
      }

      // Auto-reset timer
      if (!mobileFlow) {
        clearSuccessResetTimer();
        successResetTimerRef.current = setTimeout(() => {
          successResetTimerRef.current = null;
          resetForm();
        }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
      }

      return;
    } catch (error) {
      logger.error('AssignCourt', 'assignFromWaitlist failed', error);
      setCurrentWaitlistEntryId(null);
      Tennis.UI.toast(error.message || 'Failed to assign court from waitlist', { type: 'error' });
      return;
    }
  }

  // Get court UUID from court number
  const court = courts.find((c) => c.number === courtNumber);
  if (!court) {
    logger.error('AssignCourt', 'Court not found for number', courtNumber);
    Tennis.UI.toast('Court not found. Please refresh and try again.', { type: 'error' });
    return;
  }

  // Determine group type from player count
  const groupType = allPlayers.length <= 2 ? 'singles' : 'doubles';

  // Get geolocation for mobile (required by backend for geofence validation)
  const mobileLocation = await getMobileGeolocation();

  const assignStartTime = performance.now();
  logger.debug('AssignCourt', '[T+0ms] Calling backend.commands.assignCourtWithPlayers', {
    courtId: court.id,
    courtNumber: court.number,
    groupType,
    playerCount: allPlayers.length,
    mobileLocation: mobileLocation ? 'provided' : 'not-mobile',
  });

  setIsAssigning(true);
  let result;
  try {
    result = await backend.commands.assignCourtWithPlayers({
      courtId: court.id,
      players: allPlayers,
      groupType,
      ...(mobileLocation || {}), // Spread latitude/longitude if available
    });
    const apiDuration = Math.round(performance.now() - assignStartTime);
    logger.debug('AssignCourt', `[T+${apiDuration}ms] Court assigned result`, result);
  } catch (error) {
    const apiDuration = Math.round(performance.now() - assignStartTime);
    logger.error('AssignCourt', `[T+${apiDuration}ms] assignCourtWithPlayers threw error`, error);
    Tennis.UI.toast(error.message || 'Failed to assign court. Please try again.', {
      type: 'error',
    });
    setIsAssigning(false);
    return;
  }

  if (!result.ok) {
    logger.debug('AssignCourt', 'assignCourtWithPlayers returned ok:false', {
      code: result.code,
      message: result.message,
    });
    // Handle "Court occupied" race condition
    if (result.code === 'COURT_OCCUPIED') {
      Tennis.UI.toast('This court was just taken. Refreshing...', { type: 'warning' });
      // Board subscription will auto-refresh, but force immediate refresh
      await backend.queries.refresh();
      setIsAssigning(false);
      return;
    }
    // Handle mobile location errors - offer QR fallback
    if (API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
      setGpsFailedPrompt(true);
      setIsAssigning(false);
      return;
    }
    Tennis.UI.toast(result.message || 'Failed to assign court', { type: 'error' });
    setIsAssigning(false);
    return;
  }

  // Success - clear the assigning flag
  setIsAssigning(false);

  // Success! Board subscription will auto-refresh from signal
  const successTime = Math.round(performance.now() - assignStartTime);
  logger.debug(
    'AssignCourt',
    `[T+${successTime}ms] Court assignment successful, updating UI state...`
  );

  // Determine if court change should be allowed
  // If only one court was selectable when user chose, no change option
  const allowCourtChange =
    selectableCountAtSelection !== null ? selectableCountAtSelection > 1 : false;

  // Update UI state based on result
  setJustAssignedCourt(courtNumber);
  setAssignedSessionId(result.session?.id || null); // Capture session ID for ball purchases

  // Construct replacedGroup from displacement.participants for SuccessScreen messaging
  const replacedGroupFromDisplacement =
    result.displacement?.participants?.length > 0
      ? {
          players: result.displacement.participants.map((name) => ({ name })),
          endTime: result.displacement.restoreUntil,
        }
      : null;
  setReplacedGroup(replacedGroupFromDisplacement);
  setDisplacement(result.displacement); // Will be null if no overtime was displaced
  setOriginalCourtData(null);
  setIsChangingCourt(false);
  setWasOvertimeCourt(false);
  setHasAssignedCourt(true); // Track that this group has a court
  setCanChangeCourt(allowCourtChange); // Only true if alternatives exist
  setChangeTimeRemaining(CONSTANTS.CHANGE_COURT_TIMEOUT_SEC);
  setIsTimeLimited(result.isTimeLimited || result.isInheritedEndTime || false); // Track if time was limited
  setTimeLimitReason(result.timeLimitReason || (result.isTimeLimited ? 'block' : null));
  setShowSuccess(true);

  const uiUpdateTime = Math.round(performance.now() - assignStartTime);
  logger.debug('AssignCourt', `[T+${uiUpdateTime}ms] UI state updated, showSuccess=true`);

  // Mobile: trigger success signal
  const uiNs = getUI();
  dbg('Registration: Checking mobile success signal...', !!uiNs?.__mobileSendSuccess__);
  if (uiNs?.__mobileSendSuccess__) {
    dbg('Registration: Calling mobile success signal');
    uiNs.__mobileSendSuccess__();
  }

  // Auto-reset timer for court assignment (same as waitlist)
  if (!mobileFlow) {
    clearSuccessResetTimer();
    successResetTimerRef.current = setTimeout(() => {
      successResetTimerRef.current = null;
      resetForm();
    }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
  }

  if (allowCourtChange) {
    const timer = setInterval(() => {
      setChangeTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanChangeCourt(false);
          // Don't call resetForm() - let user decide when to leave
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
  // ===== END ORIGINAL FUNCTION BODY =====
}
