/**
 * Court Transforms (Legacy Compatibility)
 *
 * Extracted from ApiTennisService._transformCourts
 * Updated to accept logger injection.
 *
 * Transforms API court data to app-facing canonical format.
 *
 * Preserves all legacy flags for backward compatibility:
 * - isAvailable / isOccupied (legacy)
 * - isUnoccupied / isOvertime / isActive / isBlocked (new)
 * - Dual structures: session + current, block + blocked
 */

import { formatCourtTime } from '@lib/dateUtils.js';

/**
 * Transform API courts response to app-facing format.
 * @param {Array} apiCourts - Raw courts from API
 * @param {Object} [deps] - Optional dependencies
 * @param {Object} [deps.logger] - Logger instance for debug output
 * @returns {Array} Transformed courts with legacy and new flags
 */
export function transformCourts(apiCourts, { logger } = {}) {
  if (!apiCourts) return [];

  return apiCourts.map((court) => {
    // Transform session data
    // Note: API returns participants as array of strings (names) or objects
    const session = court.session
      ? {
          id: court.session.id,
          type: court.session.type,
          players: (court.session.participants || []).map((p) => {
            // Handle both string (just name) and object formats
            if (typeof p === 'string') {
              return { id: null, name: p, isGuest: false };
            }
            return {
              id: p.member_id || p.id,
              name: p.display_name || p.guest_name || p.name,
              isGuest: p.type === 'guest',
            };
          }),
          startTime: new Date(court.session.started_at).getTime(),
          endTime: new Date(court.session.scheduled_end_at).getTime(),
          timeRemaining: (court.session.minutes_remaining || 0) * 60 * 1000,
          duration: court.session.duration_minutes,
          // Formatted times in Central Time for display
          startTimeFormatted: formatCourtTime(court.session.started_at),
          endTimeFormatted: formatCourtTime(court.session.scheduled_end_at),
        }
      : null;

    // Transform block data
    const block = court.block
      ? {
          id: court.block.id,
          type: court.block.type,
          title: court.block.title,
          reason: court.block.title,
          startTime: new Date(court.block.starts_at).getTime(),
          endTime: new Date(court.block.ends_at).getTime(),
          // Formatted times in Central Time for display
          startTimeFormatted: formatCourtTime(court.block.starts_at),
          endTimeFormatted: formatCourtTime(court.block.ends_at),
        }
      : null;

    // Determine court availability status
    // - isUnoccupied: No session AND no block - always selectable first
    // - isOvertime: Has session but time expired (timeRemaining <= 0) - selectable when no unoccupied
    // - isActive: Has session with time remaining - never selectable
    // - isBlocked: Has active block - never selectable
    const hasSession = !!court.session;
    const hasBlock = !!court.block;
    const timeRemaining = session?.timeRemaining || 0;

    const isUnoccupied = !hasSession && !hasBlock;
    const isOvertime = hasSession && timeRemaining <= 0;
    const isActive = hasSession && timeRemaining > 0;
    const isBlocked = hasBlock;

    logger?.debug('ApiService', `🎾 Court ${court.court_number} transform:`, {
      hasSession,
      hasBlock,
      apiMinutesRemaining: court.session?.minutes_remaining,
      transformedTimeRemaining: timeRemaining,
      isUnoccupied,
      isOvertime,
      isActive,
      isBlocked,
    });

    // Build legacy-compatible court object
    // Legacy UI expects: court.current.endTime, court.current.players, court.endTime
    return {
      number: court.court_number,
      id: court.court_id,
      name: court.court_name,
      status: court.status,
      // New availability flags
      isUnoccupied, // No session, no block - always selectable first
      isOvertime, // Has session but time expired - conditionally selectable
      isActive, // Has session with time remaining - never selectable
      isBlocked, // Has active block - never selectable
      // Legacy compatibility
      isAvailable: isUnoccupied, // Legacy: true if unoccupied (for backward compat)
      isOccupied: hasSession,
      // New API format
      session,
      block,
      // Legacy format compatibility
      current: session
        ? {
            players: session.players,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
          }
        : null,
      // Also add top-level for some legacy code paths
      players: session?.players || [],
      startTime: session?.startTime || block?.startTime,
      endTime: session?.endTime || block?.endTime,
      blocked: block
        ? {
            startTime: block.startTime,
            endTime: block.endTime,
            reason: block.reason,
          }
        : null,
    };
  });
}
