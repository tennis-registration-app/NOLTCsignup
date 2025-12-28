import { normalizeSession } from './normalizeSession.js';
import { normalizeBlock } from './normalizeBlock.js';

/**
 * Normalize a court from API response to Domain Court
 *
 * @param {Object} raw - Raw court from API
 * @param {string} serverNow - Server time for calculations
 * @returns {import('../types/domain.js').Court}
 */
export function normalizeCourt(raw, serverNow) {
  if (!raw) {
    console.warn('[normalizeCourt] Received null/undefined court');
    return {
      number: 0,
      isOccupied: false,
      isBlocked: false,
      isOvertime: false,
      isAvailable: true,
      session: null,
      block: null,
    };
  }

  // Get court number
  const number =
    raw.number ||
    raw.courtNumber ||
    raw.court_number ||
    (typeof raw.name === 'string' ? parseInt(raw.name.replace(/\D/g, ''), 10) : 0);

  // Normalize session if present
  const session = raw.session ? normalizeSession(raw.session, serverNow) : null;

  // Normalize block if present
  const block = raw.block ? normalizeBlock(raw.block, serverNow) : null;

  // Determine states
  const isOccupied =
    raw.isOccupied ?? raw.is_occupied ?? (session !== null && !session.actualEndAt);
  const isBlocked = raw.isBlocked ?? raw.is_blocked ?? (block !== null && block.isActive);
  const isOvertime = session?.isOvertime ?? false;
  const isAvailable = !isOccupied && !isBlocked;

  return {
    number,
    isOccupied,
    isBlocked,
    isOvertime,
    isAvailable,
    session,
    block,
  };
}
