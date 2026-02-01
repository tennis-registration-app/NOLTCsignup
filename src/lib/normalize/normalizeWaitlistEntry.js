// @ts-check
import { normalizeGroup } from './normalizeGroup.js';

/**
 * Normalize a waitlist entry from API response to Domain WaitlistEntry
 *
 * @param {Object} raw - Raw waitlist entry from API
 * @param {string} serverNow - Server time for minutesWaiting calculation
 * @returns {import('../types/domain.js').WaitlistEntry}
 */
export function normalizeWaitlistEntry(raw, serverNow) {
  if (!raw) {
    console.warn('[normalizeWaitlistEntry] Received null/undefined entry');
    return {
      id: 'unknown',
      position: 0,
      group: { id: 'unknown', players: [], type: 'singles' },
      joinedAt: '',
      minutesWaiting: 0,
      estimatedCourtTime: null,
    };
  }

  const joinedAt = raw.joinedAt || raw.joined_at || raw.createdAt || raw.created_at || '';

  // Calculate minutes waiting (derived field)
  let minutesWaiting = raw.minutesWaiting || raw.minutes_waiting || 0;
  if (!minutesWaiting && joinedAt && serverNow) {
    const diffMs = new Date(serverNow).getTime() - new Date(joinedAt).getTime();
    minutesWaiting = Math.floor(diffMs / 60000);
  }

  return {
    id: raw.id || raw.entryId || raw.entry_id || 'unknown',
    position: raw.position ?? raw.queue_position ?? 0,
    group: normalizeGroup(raw),
    joinedAt,
    minutesWaiting,
    estimatedCourtTime: raw.estimatedCourtTime || raw.estimated_court_time || null,
  };
}
