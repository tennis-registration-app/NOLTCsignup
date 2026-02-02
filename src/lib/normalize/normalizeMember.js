// @ts-check
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
    'participant_type', // From get_court_board RPC
    'guest_name', // From get_court_board RPC
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

/**
 * Normalize a full account member record from getMembersByAccount API response.
 * This includes account_id, is_primary, etc. used by player resolution.
 *
 * @param {Object} raw - Raw member from getMembersByAccount API
 * @returns {Object} Normalized member with camelCase keys
 */
export function normalizeAccountMember(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    displayName: raw.display_name,
    accountId: raw.account_id,
    isPrimary: raw.is_primary ?? false,
    memberNumber: raw.member_number,
  };
}

/**
 * Normalize an array of account members from getMembersByAccount response.
 *
 * @param {Array} members - Raw members array from API
 * @returns {Array} Normalized members with camelCase keys
 */
export function normalizeAccountMembers(members) {
  if (!members || !Array.isArray(members)) return [];
  return members.map(normalizeAccountMember);
}
