import { normalizeServiceError } from '@lib/errors';

/**
 * Members operations extracted from ApiTennisService.
 *
 * @param {Object} deps
 * @param {*} deps.api
 * @param {Function} deps.getMembersCache
 * @param {Function} deps.setMembersCache
 */
export function createMembersService({ api, getMembersCache, setMembersCache }) {
  async function searchMembers(query) {
    try {
      const result = await api.getMembers(query);
      return result.members || [];
    } catch (error) {
      throw normalizeServiceError(error, { service: 'membersService', op: 'searchMembers' });
    }
  }

  async function getMembersByAccount(memberNumber) {
    try {
      const result = await api.getMembersByAccount(memberNumber);
      return result.members || [];
    } catch (error) {
      throw normalizeServiceError(error, { service: 'membersService', op: 'getMembersByAccount' });
    }
  }

  async function getAllMembers() {
    try {
      if (!getMembersCache()) {
        const result = await api.getMembers();
        setMembersCache(result);
      }
      return getMembersCache().members || [];
    } catch (error) {
      throw normalizeServiceError(error, { service: 'membersService', op: 'getAllMembers' });
    }
  }

  return { searchMembers, getMembersByAccount, getAllMembers };
}
