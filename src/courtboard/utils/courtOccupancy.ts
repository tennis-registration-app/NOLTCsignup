/**
 * Court occupation check — shared logic.
 *
 * NOTE: Identical copies exist in mobile-fallback-bar.js and mobile-bridge.js
 * (IIFEs loaded via <script> tag — cannot import ESM).
 * Deletion condition: when IIFEs are migrated to ESM (ADR-006),
 * the IIFE copies should be removed and this module imported instead.
 */

/**
 * Check whether a court is currently occupied.
 * Checks three signals:
 * 1. court.isOccupied flag (domain format)
 * 2. court.session.group.players array (domain format)
 * 3. court.session.participants array (API wire format fallback)
 *
 * @param {Object|null|undefined} court
 * @returns {boolean}
 */
export function isCourtOccupied(court) {
  return !!(
    court &&
    (court.isOccupied ||
      court.session?.group?.players?.length > 0 ||
      court.session?.participants?.length > 0)
  );
}
