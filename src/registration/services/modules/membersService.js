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
    const result = await api.getMembers(query);
    return result.members || [];
  }

  async function getMembersByAccount(memberNumber) {
    const result = await api.getMembersByAccount(memberNumber);
    return result.members || [];
  }

  async function getAllMembers() {
    if (!getMembersCache()) {
      const result = await api.getMembers();
      setMembersCache(result);
    }
    return getMembersCache().members || [];
  }

  return { searchMembers, getMembersByAccount, getAllMembers };
}
