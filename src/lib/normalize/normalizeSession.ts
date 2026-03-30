// @ts-check
import { normalizeGroup } from './normalizeGroup';
import { END_REASONS } from '../types/domain';

/**
 * Normalize a session from API response to Domain Session
 *
 * @param {Object} raw - Raw session from API
 * @param {string} serverNow - Server time for overtime calculation
 * @returns {import('../types/domain.js').Session | null}
 */
export function normalizeSession(raw: Record<string, unknown>, serverNow: string) {
  if (!raw) return null;

  const scheduledEndAt = String(raw.scheduledEndAt || raw.scheduled_end_at || raw.endTime || raw.end_time || '');
  const actualEndAt = (raw.actualEndAt || raw.actual_end_at || null) as string | null;

  // Calculate overtime
  const isOvertime =
    !actualEndAt && scheduledEndAt && serverNow
      ? new Date(serverNow) > new Date(String(scheduledEndAt))
      : false;

  // Normalize end reason
  let endReason = (raw.endReason || raw.end_reason || null) as string | null;
  if (endReason && !END_REASONS.includes(endReason)) {
    console.warn('[normalizeSession] Invalid endReason:', endReason);
    endReason = null;
  }

  return {
    id: String(raw.id || raw.sessionId || raw.session_id || 'unknown'),
    courtNumber: Number(raw.courtNumber || raw.court_number || raw.courtNum || 0),
    group: normalizeGroup((raw.group as Record<string, unknown>) || raw),
    startedAt: String(raw.startedAt || raw.started_at || raw.startTime || raw.start_time || ''),
    scheduledEndAt: scheduledEndAt || '',
    actualEndAt,
    endReason,
    isOvertime,
    isTournament: Boolean(raw.is_tournament ?? raw.isTournament ?? false),
  };
}
