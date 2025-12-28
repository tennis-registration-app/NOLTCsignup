import { normalizeCourt } from './normalizeCourt.js';
import { normalizeWaitlistEntry } from './normalizeWaitlistEntry.js';

/**
 * Normalize complete board from API response to Domain Board
 *
 * THIS IS THE ONLY PUBLIC ENTRY POINT FOR NORMALIZATION.
 * Components should never import individual normalizers.
 *
 * @param {Object} raw - Raw response from /get-board API
 * @returns {import('../types/domain.js').Board}
 */
export function normalizeBoard(raw) {
  if (!raw) {
    console.error('[normalizeBoard] Received null/undefined response');
    return {
      serverNow: new Date().toISOString(),
      courts: [],
      waitlist: [],
    };
  }

  // Validate expected top-level fields
  if (!raw.courts) {
    console.warn('[normalizeBoard] Missing courts array');
  }
  if (!raw.serverNow) {
    console.warn('[normalizeBoard] Missing serverNow');
  }

  const serverNow = raw.serverNow || new Date().toISOString();

  // Normalize courts
  const courts = Array.isArray(raw.courts)
    ? raw.courts.map((c) => normalizeCourt(c, serverNow))
    : [];

  // Normalize waitlist
  const rawWaitlist = raw.waitlist || raw.waitingGroups || [];
  const waitlist = Array.isArray(rawWaitlist)
    ? rawWaitlist.map((w) => normalizeWaitlistEntry(w, serverNow))
    : [];

  // Sort waitlist by position
  waitlist.sort((a, b) => a.position - b.position);

  return {
    serverNow,
    courts,
    waitlist,
  };
}
