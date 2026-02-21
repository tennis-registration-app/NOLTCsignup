/**
 * Pure helpers extracted from assignCourtOrchestrator v0 guards.
 *
 * These helpers are intentionally "dumb": they mirror current v0 logic exactly.
 * NO side effects. NO network. NO timers. NO DOM access.
 */

export interface GuardResultOk {
  ok: true;
  ui?: undefined;
}

export interface GuardResultFail {
  ok: false;
  kind: string;
  ui: { action: 'toast' | 'alert'; args: any[] } | null;
}

export type GuardResult = GuardResultOk | GuardResultFail;

interface OperatingHoursEntry {
  dayOfWeek?: number;
  day_of_week?: number;
  isClosed?: boolean;
  is_closed?: boolean;
  opensAt?: string;
  opens_at?: string;
}

/**
 * Guard: Prevent double-submission while assignment is in progress.
 * v0 location: lines 112-114
 */
export function guardNotAssigning(isAssigning: boolean): GuardResult {
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
 */
export function guardOperatingHours({
  operatingHours,
  currentHour,
  currentMinutes,
  dayOfWeek,
}: {
  operatingHours: OperatingHoursEntry[] | null | undefined;
  currentHour: number;
  currentMinutes: number;
  dayOfWeek: number;
}): GuardResult {
  // v0 logic: lines 133-169
  let openingTime: number;
  let openingTimeString: string;

  if (operatingHours && Array.isArray(operatingHours) && operatingHours.length > 0) {
    // Find today's operating hours from API
    // Handle both snake_case (from API) and camelCase formats
    const todayHours = operatingHours.find((h) => (h.dayOfWeek ?? h.day_of_week) === dayOfWeek);
    const isClosed = todayHours?.isClosed ?? todayHours?.is_closed;

    if (todayHours && !isClosed) {
      // Parse opensAt (format: "HH:MM:SS") - handle both camelCase and snake_case
      const opensAtValue = todayHours.opensAt ?? todayHours.opens_at;
      const [hours, minutes] = (opensAtValue as string).split(':').map(Number);
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
 */
export function guardCourtNumber({
  courtNumber,
  courtCount,
}: {
  courtNumber: number | null | undefined;
  courtCount: number;
}): GuardResult {
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
 */
export function guardGroup({
  currentGroup,
}: {
  currentGroup: any[] | null | undefined;
}): GuardResult {
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
 */
export function guardGroupCompat({
  players,
  guests,
  validateGroupCompat,
}: {
  players: any[];
  guests: number;
  validateGroupCompat: (players: any[], guests: number) => { ok: boolean; errors: string[] };
}): GuardResult {
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
