import { normalizeSession } from './normalizeSession.js';
import { normalizeBlock } from './normalizeBlock.js';

/**
 * Normalize a court from API response to Domain Court
 *
 * The API (get_court_board) returns FLATTENED data:
 *   { court_id, court_number, status, session_id, started_at, scheduled_end_at,
 *     session_type, minutes_remaining, participants, block_id, block_title, block_ends_at }
 *
 * This normalizer handles both flattened and nested formats.
 *
 * @param {Object} raw - Raw court from API
 * @param {string} serverNow - Server time for calculations
 * @returns {import('../types/domain.js').Court}
 */
export function normalizeCourt(raw, serverNow) {
  if (!raw) {
    console.warn('[normalizeCourt] Received null/undefined court');
    return {
      id: '',
      number: 0,
      isOccupied: false,
      isBlocked: false,
      isOvertime: false,
      isAvailable: true,
      isTournament: false,
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

  // Build session object from flattened or nested data
  let sessionInput = null;
  if (raw.session) {
    // Nested format (e.g., from mock data or future API changes)
    sessionInput = raw.session;
  } else if (raw.session_id) {
    // Flattened format from get_court_board RPC
    sessionInput = {
      id: raw.session_id,
      court_number: number,
      started_at: raw.started_at,
      scheduled_end_at: raw.scheduled_end_at,
      session_type: raw.session_type,
      participants: raw.participants,
      minutes_remaining: raw.minutes_remaining,
      is_tournament: raw.is_tournament,
    };
  }
  const session = sessionInput ? normalizeSession(sessionInput, serverNow) : null;

  // Build block object from flattened or nested data
  let blockInput = null;
  if (raw.block) {
    // Nested format
    blockInput = raw.block;
  } else if (raw.block_id) {
    // Flattened format from get_court_board RPC
    blockInput = {
      id: raw.block_id,
      court_number: number,
      block_type: raw.block_type,
      title: raw.block_title,
      reason: raw.block_title,
      starts_at: raw.block_starts_at,
      ends_at: raw.block_ends_at,
    };
  }
  const block = blockInput ? normalizeBlock(blockInput, serverNow) : null;

  // Determine states from API status field or derive from session/block
  const status = raw.status; // 'available', 'occupied', 'overtime', 'blocked'
  const isOccupied =
    raw.isOccupied ??
    raw.is_occupied ??
    (status === 'occupied' || status === 'overtime' || (session !== null && !session.actualEndAt));
  const isBlocked =
    raw.isBlocked ?? raw.is_blocked ?? (status === 'blocked' || (block !== null && block.isActive));
  const isOvertime = status === 'overtime' || (session?.isOvertime ?? false);
  const isAvailable = status === 'available' || (!isOccupied && !isBlocked);

  // Get court UUID (required for API commands like assign-court)
  const id = raw.court_id || raw.id || `court-${number}`;

  return {
    id,
    number,
    isOccupied,
    isBlocked,
    isOvertime,
    isAvailable,
    isTournament: session?.isTournament ?? false,
    session,
    block,
  };
}
