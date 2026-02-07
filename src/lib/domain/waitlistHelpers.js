/**
 * Domain Helper Functions for Waitlist
 *
 * RULES:
 * - Pure functions only
 * - Accept Domain objects only
 */

/**
 * Get the first N groups from waitlist
 * @param {import('../types/domain.js').WaitlistEntry[]} waitlist
 * @param {number} n
 * @returns {import('../types/domain.js').WaitlistEntry[]}
 */
export function getFirstWaitlistEntries(waitlist, n = 1) {
  if (!Array.isArray(waitlist)) return [];
  return waitlist.slice(0, n);
}

/**
 * Check if a member is on the waitlist
 * @param {import('../types/domain.js').WaitlistEntry[]} waitlist
 * @param {string} memberId
 * @returns {boolean}
 */
export function isMemberOnWaitlist(waitlist, memberId) {
  if (!Array.isArray(waitlist) || !memberId) return false;
  return waitlist.some((entry) => entry.group.players.some((p) => p.memberId === memberId));
}

/**
 * Find waitlist entry containing a member
 * @param {import('../types/domain.js').WaitlistEntry[]} waitlist
 * @param {string} memberId
 * @returns {import('../types/domain.js').WaitlistEntry|undefined}
 */
export function findWaitlistEntryByMember(waitlist, memberId) {
  if (!Array.isArray(waitlist) || !memberId) return undefined;
  return waitlist.find((entry) => entry.group.players.some((p) => p.memberId === memberId));
}

/**
 * Get group type label for display
 * @param {import('../types/domain.js').WaitlistEntry} entry
 * @returns {string}
 */
export function getGroupTypeLabel(entry) {
  const type = entry?.group?.type;
  switch (type) {
    case 'singles':
      return 'Singles';
    case 'doubles':
      return 'Doubles';
    default:
      return 'Group';
  }
}
