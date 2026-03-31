/**
 * mobileTapToRegister decision logic — pure extraction.
 *
 * Determines what action to take when a mobile user taps a court.
 * Returns an action descriptor; the caller (IIFE) performs the side effects
 * (postMessage, sessionStorage, toast).
 *
 * NOTE: mobile-bridge.js IIFE contains the original inline version.
 * Deletion condition: when mobile-bridge.js is migrated to ESM (ADR-006),
 * the IIFE copy should be removed and this module imported instead.
 */

import { isCourtOccupied } from './courtOccupancy.js';

/**
 * @param {Object} opts
 * @param {number}               opts.courtNumber       - Tapped court number (1-based)
 * @param {Array}                opts.courts            - Full courts array from CourtboardState
 * @param {Array}                opts.waitingGroups     - Waiting groups from CourtboardState
 * @param {string|null}          opts.registeredCourt   - sessionStorage 'mobile-registered-court' value
 * @param {string|null}          opts.waitlistEntryId   - sessionStorage 'mobile-waitlist-entry-id' value
 * @returns {{ action: string, [key: string]: any }}
 */
export function decideTapToRegister({
  courtNumber,
  courts,
  waitingGroups,
  registeredCourt,
  waitlistEntryId,
}: {
  courtNumber: number;
  courts: Array<Record<string, unknown>> | null | undefined;
  waitingGroups: Array<{ id?: string }> | null | undefined;
  registeredCourt: string | null;
  waitlistEntryId: string | null;
}): { action: string; [key: string]: unknown } {
  // --- Branch 1: User already registered on a court ---
  if (registeredCourt) {
    // Verify registration is still valid by checking if the court is occupied
    const courtIndex = parseInt(registeredCourt, 10) - 1;
    const courtsArr = courts || [];
    const court = courtsArr[courtIndex];

    if (!isCourtOccupied(court)) {
      // Registration is stale — court no longer occupied
      return { action: 'reset-stale-session' };
    }

    // Registration still valid — block new registration
    return {
      action: 'already-registered',
      message: `You are currently registered for play on Court ${registeredCourt}`,
    };
  }

  // --- Branch 2: Waitlist exists ---
  const groups = waitingGroups || [];
  if (groups.length > 0) {
    const firstGroup = groups[0];
    const isUserFirstInWaitlist = waitlistEntryId && firstGroup?.id === waitlistEntryId;

    if (isUserFirstInWaitlist) {
      // User is first in waitlist — assign from waitlist to this court
      return {
        action: 'assign-from-waitlist',
        courtNumber: Number(courtNumber),
        waitlistEntryId,
      };
    }

    // User not first (or not on waitlist) — redirect to join waitlist
    return { action: 'join-waitlist' };
  }

  // --- Branch 3: Normal registration — no waitlist, no prior registration ---
  return { action: 'register', courtNumber: Number(courtNumber) };
}
