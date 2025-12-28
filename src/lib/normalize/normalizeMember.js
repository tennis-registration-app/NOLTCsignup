/**
 * Normalize a member from API response to Domain Member
 * Handles: memberId/member_id, displayName/display_name/name variations
 *
 * @param {Object} raw - Raw member from API
 * @returns {import('../types/domain.js').Member}
 */
export function normalizeMember(raw) {
  if (!raw) {
    console.warn('[normalizeMember] Received null/undefined member');
    return { memberId: 'unknown', displayName: 'Unknown', isGuest: false };
  }

  // Log unexpected keys for backend tightening
  const expectedKeys = [
    'memberId',
    'member_id',
    'displayName',
    'display_name',
    'name',
    'isGuest',
    'is_guest',
    'id',
  ];
  const unexpectedKeys = Object.keys(raw).filter((k) => !expectedKeys.includes(k));
  if (unexpectedKeys.length > 0) {
    console.debug('[normalizeMember] Unexpected keys (flag for backend):', unexpectedKeys);
  }

  return {
    memberId: raw.memberId || raw.member_id || raw.id || 'unknown',
    displayName: raw.displayName || raw.display_name || raw.name || 'Unknown',
    isGuest: raw.isGuest ?? raw.is_guest ?? false,
  };
}
