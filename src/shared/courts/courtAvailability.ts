/**
 * Court Availability - Single source of truth for determining which courts are playable
 *
 * A court is playable/free if:
 * 1. No active session occupying it, OR session is in overtime (past scheduled end time)
 * 2. No active block currently covering "now" (wet/maintenance/lesson/etc.)
 */

import { computePlayableCourts } from './overtimeEligibility.js';

/**
 * Check if a time is within an interval
 */
export function isActiveInterval(now, startsAt, endsAt) {
  const nowTime = new Date(now).getTime();
  const startTime = new Date(startsAt).getTime();
  const endTime = new Date(endsAt).getTime();
  return nowTime >= startTime && nowTime < endTime;
}

/**
 * Check if a court is currently occupied by an ACTIVE session
 * A session is active if it exists AND hasn't exceeded its scheduled end time
 * Overtime sessions (past end time) are considered available/playable
 *
 * @param court - Court object with optional session property
 * @param now - Current time (ISO string or Date)
 * @returns true if court is occupied by an active (non-overtime) session
 */
export function isOccupiedNow(court, now = new Date().toISOString()) {
  if (!court?.session) return false;

  const session = court.session;

  // Check if court object already has isOvertime flag computed
  if (court.isOvertime === true) {
    return false; // Overtime = available
  }

  // If session has an endTime and it's past, court is in overtime = available
  const endTimeStr = session.scheduledEndAt || session.endTime || session.endsAt || session.ends_at;
  if (endTimeStr) {
    const endTime = new Date(endTimeStr).getTime();
    const nowTime = new Date(now).getTime();
    if (nowTime > endTime) {
      // Session is overtime - court is available
      return false;
    }
  }

  // Session exists and is not overtime - court is occupied
  return true;
}

/**
 * Check if a court is currently blocked
 * @param courtNumber - The court number (1-12)
 * @param blocks - Array of active blocks from courtBlocks
 * @param now - Current time (ISO string or Date)
 */
export function isBlockedNow(courtNumber, blocks, now) {
  if (!blocks?.length) return false;

  return blocks.some((block) => {
    if (block.courtNumber !== courtNumber) return false;
    // If block has start/end times, check if now is within range
    const startsAt = block.startsAt || block.startTime || block.start;
    const endsAt = block.endsAt || block.endTime || block.end;
    if (startsAt && endsAt) {
      return isActiveInterval(now, startsAt, endsAt);
    }
    // If no times, assume block is currently active (it's in courtBlocks)
    return true;
  });
}

/**
 * Check if a court is wet
 */
export function isWetNow(courtNumber, blocks, now) {
  if (!blocks?.length) return false;
  return blocks.some((block) => {
    if (block.courtNumber !== courtNumber) return false;
    if (!block.isWetCourt) return false;
    // Check if block is currently active
    const startsAt = block.startsAt || block.startTime || block.start;
    const endsAt = block.endsAt || block.endTime || block.end;
    if (startsAt && endsAt) {
      return isActiveInterval(now, startsAt, endsAt);
    }
    return true;
  });
}

/**
 * Check if a court is playable right now
 * A court is playable if:
 * - Not occupied by an active session (overtime sessions don't count as occupied)
 * - Not blocked by a current block
 */
export function isPlayableNow(court, courtNumber, blocks, now = new Date().toISOString()) {
  if (isOccupiedNow(court, now)) return false;
  if (isBlockedNow(courtNumber, blocks, now)) return false;
  // Note: wet courts are already included in isBlockedNow since they're blocks
  return true;
}

/**
 * Count playable courts
 * @param courts - Array of court objects (index 0 = court 1)
 * @param blocks - Array of active blocks
 * @param now - Current time (ISO string or Date), defaults to Date.now()
 */
export function countPlayableCourts(courts, blocks, now = new Date().toISOString()) {
  if (!courts?.length) return 0;

  return courts.filter((court, index) => {
    const courtNumber = court?.number || court?.courtNumber || index + 1;
    return isPlayableNow(court, courtNumber, blocks, now);
  }).length;
}

/**
 * List playable court numbers
 * Wrapper around computePlayableCourts for backward compatibility.
 * Returns array of court numbers (not court objects).
 */
export function listPlayableCourts(courts, blocks, now = new Date().toISOString()) {
  // Delegate to policy module
  const { playableCourtNumbers } = computePlayableCourts(courts, blocks, now);
  return playableCourtNumbers;
}
