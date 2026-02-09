/**
 * Overtime Eligibility Policy Module
 *
 * Centralizes court selection logic for Registration app and Courtboard.
 * Two functions with separate semantics (no unification).
 */

import { isOccupiedNow, isBlockedNow } from './courtAvailability.js';

/**
 * REGISTRATION COURT SELECTION
 * Mirrors current App.jsx inline filtering logic exactly.
 * Returns court OBJECTS (not just numbers) to preserve downstream compatibility.
 *
 * Two patterns observed in App.jsx:
 * - loadData(): courts.filter((c) => c.isAvailable && !c.isBlocked) / c.isOvertime && !c.isBlocked
 * - court screen: courts.filter((c) => c.isAvailable) / c.isOvertime (no isBlocked check)
 *
 * This function uses the stricter pattern (with isBlocked check) for consistency.
 *
 * @param {Array} courts - Normalized court objects from board state
 * @returns {Object} Selection result
 */
export function computeRegistrationCourtSelection(courts) {
  if (!courts?.length) {
    return {
      primaryCourts: [],
      fallbackOvertimeCourts: [],
      showingOvertimeCourts: false,
      eligibilityByCourtNumber: {},
    };
  }

  // EXACT LOGIC FROM App.jsx loadData() lines 250-251
  // primaryCourts: courts.filter((c) => c.isAvailable && !c.isBlocked)
  // fallbackOvertimeCourts: courts.filter((c) => c.isOvertime && !c.isBlocked)
  const primaryCourts = courts.filter((c) => c && c.isAvailable && !c.isBlocked);
  const fallbackOvertimeCourts = courts.filter(
    (c) => c && c.isOvertime && !c.isBlocked && !c.isTournament
  );
  const showingOvertimeCourts = primaryCourts.length === 0 && fallbackOvertimeCourts.length > 0;

  // Build eligibility map
  const eligibilityByCourtNumber = {};
  for (const court of courts) {
    if (!court) continue; // Skip null/undefined court entries
    const isPrimary = primaryCourts.some((c) => c.number === court.number);
    const isFallback = fallbackOvertimeCourts.some((c) => c.number === court.number);

    eligibilityByCourtNumber[court.number] = {
      eligible: isPrimary || (showingOvertimeCourts && isFallback),
      reason: !isPrimary && !isFallback ? 'not_available' : undefined,
    };
  }

  return {
    primaryCourts, // Court objects (not just numbers)
    fallbackOvertimeCourts, // Court objects (not just numbers)
    showingOvertimeCourts, // Boolean flag for UI warning
    eligibilityByCourtNumber, // Map for per-court eligibility lookup
  };
}

/**
 * COURTBOARD PLAYABLE COURTS
 * Mirrors current listPlayableCourts() / isPlayableNow() logic exactly.
 * Signature compatible with existing listPlayableCourts.
 *
 * @param {Array} courts - Court objects
 * @param {Array} blocks - Block objects (if used by current logic)
 * @param {string|Date} serverNow - Server timestamp
 * @returns {Object} Playable courts result
 */
export function computePlayableCourts(courts, blocks, serverNow) {
  if (!courts?.length) {
    return {
      playableCourts: [],
      playableCourtNumbers: [],
      eligibilityByCourtNumber: {},
    };
  }

  const now = serverNow || new Date().toISOString();

  // EXACT LOGIC FROM courtAvailability.js isPlayableNow
  // isPlayableNow: !isOccupiedNow(court, now) && !isBlockedNow(courtNumber, blocks, now)
  const playableCourts = courts.filter((court, index) => {
    if (!court) return false; // Skip null court entries
    const courtNumber = court.number || court.courtNumber || index + 1;
    if (isOccupiedNow(court, now)) return false;
    if (isBlockedNow(courtNumber, blocks, now)) return false;
    return true;
  });

  const playableCourtNumbers = playableCourts.map((c) => c.number || c.courtNumber);

  // Build eligibility map
  const eligibilityByCourtNumber = {};
  for (const court of courts) {
    if (!court) continue; // Skip null/undefined court entries
    const courtNumber = court.number || court.courtNumber;
    const isPlayable = playableCourts.some((c) => (c.number || c.courtNumber) === courtNumber);
    eligibilityByCourtNumber[courtNumber] = {
      eligible: isPlayable,
      reason: !isPlayable ? (court.isBlocked ? 'blocked' : 'occupied') : undefined,
    };
  }

  return {
    playableCourts, // Court objects
    playableCourtNumbers, // Number array (for backward compat)
    eligibilityByCourtNumber,
  };
}

/**
 * HELPER: Derive playable court numbers from eligibility map
 */
export function derivePlayableCourtNumbers(eligibilityByCourtNumber) {
  return Object.entries(eligibilityByCourtNumber)
    .filter(([, e]) => e.eligible)
    .map(([num]) => Number(num));
}
