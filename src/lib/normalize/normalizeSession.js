import { normalizeGroup } from './normalizeGroup.js';
import { END_REASONS } from '../types/domain.js';

/**
 * Normalize a session from API response to Domain Session
 *
 * @param {Object} raw - Raw session from API
 * @param {string} serverNow - Server time for overtime calculation
 * @returns {import('../types/domain.js').Session}
 */
export function normalizeSession(raw, serverNow) {
  if (!raw) return null;

  const scheduledEndAt = raw.scheduledEndAt || raw.scheduled_end_at || raw.endTime || raw.end_time;
  const actualEndAt = raw.actualEndAt || raw.actual_end_at || null;

  // Calculate overtime
  const isOvertime =
    !actualEndAt && scheduledEndAt && serverNow
      ? new Date(serverNow) > new Date(scheduledEndAt)
      : false;

  // Normalize end reason
  let endReason = raw.endReason || raw.end_reason || null;
  if (endReason && !END_REASONS.includes(endReason)) {
    console.warn('[normalizeSession] Invalid endReason:', endReason);
    endReason = null;
  }

  return {
    id: raw.id || raw.sessionId || raw.session_id || 'unknown',
    courtNumber: raw.courtNumber || raw.court_number || raw.courtNum || 0,
    group: normalizeGroup(raw.group || raw),
    startedAt: raw.startedAt || raw.started_at || raw.startTime || raw.start_time || '',
    scheduledEndAt: scheduledEndAt || '',
    actualEndAt,
    endReason,
    isOvertime,
  };
}
