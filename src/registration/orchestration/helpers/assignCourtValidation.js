/**
 * WP-HR4: Pure helpers extracted from assignCourtOrchestrator v0 guards.
 *
 * These helpers are intentionally "dumb": they mirror current v0 logic exactly.
 * NO side effects. NO network. NO timers. NO DOM access.
 *
 * @typedef {Object} GuardResultOk
 * @property {true} ok
 *
 * @typedef {Object} GuardResultFail
 * @property {false} ok
 * @property {string} kind - Error code
 * @property {{ action: 'toast' | 'alert', args: any[] } | null} ui - UI dispatch info (null = silent)
 *
 * @typedef {GuardResultOk | GuardResultFail} GuardResult
 */

/**
 * Guard: Prevent double-submission while assignment is in progress.
 * v0 location: lines 112-114
 *
 * @param {boolean} isAssigning - Current assignment state from deps
 * @returns {GuardResult}
 */
export function guardNotAssigning(isAssigning) {
  // v0: if (isAssigning) { logger.debug(...); return; }
  // Silent return in v0 (no toast, just log + return)
  if (isAssigning) {
    return { ok: false, kind: 'ALREADY_ASSIGNING', ui: null };
  }
  return { ok: true };
}

/**
 * Guard: Check operating hours.
 * v0 location: lines 123-169
 *
 * v0 uses operatingHours array from deps, checks today's dayOfWeek,
 * handles both snake_case and camelCase field names from API.
 *
 * @param {object} params
 * @param {Array|null|undefined} params.operatingHours - Operating hours array from deps
 * @param {number} params.currentHour - Current hour (0-23)
 * @param {number} params.currentMinutes - Current minute (0-59)
 * @param {number} params.dayOfWeek - Day of week (0=Sunday, 6=Saturday)
 * @returns {GuardResult}
 */
export function guardOperatingHours({ operatingHours, currentHour, currentMinutes, dayOfWeek }) {
  // v0 logic: lines 133-169
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
      // v0: Tennis.UI.toast('The club is closed today.', { type: 'warning' });
      return {
        ok: false,
        kind: 'CLUB_CLOSED',
        ui: { action: 'toast', args: ['The club is closed today.', { type: 'warning' }] },
      };
    } else {
      // Fallback if no hours found for today - allow registration
      openingTime = 0;
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
    // v0: Tennis.UI.toast(`The club is not open yet...`, { type: 'warning' });
    const message = `The club is not open yet. Court registration will be available at ${openingTimeString}.`;
    return {
      ok: false,
      kind: 'CLUB_NOT_OPEN',
      ui: { action: 'toast', args: [message, { type: 'warning' }] },
    };
  }

  return { ok: true };
}

/**
 * Guard: Validate court number is valid.
 * v0 location: lines 172-177
 *
 * @param {object} params
 * @param {number|null|undefined} params.courtNumber - Selected court number
 * @param {number} params.courtCount - Max court count from CONSTANTS.COURT_COUNT
 * @returns {GuardResult}
 */
export function guardCourtNumber({ courtNumber, courtCount }) {
  // v0: if (!courtNumber || courtNumber < 1 || courtNumber > CONSTANTS.COURT_COUNT)
  if (!courtNumber || courtNumber < 1 || courtNumber > courtCount) {
    // v0: showAlertMessage(`Invalid court number...`);
    const message = `Invalid court number. Please select a court between 1 and ${courtCount}.`;
    return {
      ok: false,
      kind: 'INVALID_COURT',
      ui: { action: 'alert', args: [message] },
    };
  }
  return { ok: true };
}

/**
 * Guard: Validate group has players.
 * v0 location: lines 180-183
 *
 * Note: v0 does NOT check selectableCountAtSelection in this guard.
 * The count is only used later for allowCourtChange logic (line 429-430).
 *
 * @param {object} params
 * @param {Array|null|undefined} params.currentGroup - Current player group
 * @returns {GuardResult}
 */
export function guardGroup({ currentGroup }) {
  // v0: if (!currentGroup || currentGroup.length === 0)
  if (!currentGroup || currentGroup.length === 0) {
    // v0: showAlertMessage('No players in group. Please add players first.');
    const message = 'No players in group. Please add players first.';
    return {
      ok: false,
      kind: 'NO_PLAYERS',
      ui: { action: 'alert', args: [message] },
    };
  }
  return { ok: true };
}

/**
 * Guard: Validate group compatibility using domain validator.
 * v0 location: lines 209-212
 *
 * This wraps the validateGroupCompat call from deps.
 * The actual validation is done by the injected function.
 *
 * @param {object} params
 * @param {Array} params.players - Non-guest players (filtered from currentGroup)
 * @param {number} params.guests - Guest count
 * @param {Function} params.validateGroupCompat - Validator function from deps
 * @returns {GuardResult}
 */
export function guardGroupCompat({ players, guests, validateGroupCompat }) {
  // v0: const { ok, errors } = validateGroupCompat(players, guests);
  const { ok, errors } = validateGroupCompat(players, guests);
  if (!ok) {
    // v0: showAlertMessage(errors.join('\n'));
    const message = errors.join('\n');
    return {
      ok: false,
      kind: 'GROUP_INVALID',
      ui: { action: 'alert', args: [message] },
    };
  }
  return { ok: true };
}
