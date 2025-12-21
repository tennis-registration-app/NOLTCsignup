/**
 * @fileoverview TennisDirectory - Member lookup operations
 */

export class TennisDirectory {
  constructor(apiAdapter) {
    this.api = apiAdapter;
    this._cache = new Map();
    this._cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Search members by name
   * @param {string} query
   * @returns {Promise<import('./types').Member[]>}
   */
  async searchMembers(query) {
    if (!query || query.length < 2) {
      return [];
    }

    const response = await this.api.get(`/get-members?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      console.error('Member search failed:', response.message);
      return [];
    }

    return (response.members || []).map(m => this._normalizeMember(m));
  }

  /**
   * Get all members on a family account
   * @param {string} memberNumber - 4-digit family number
   * @returns {Promise<import('./types').Member[]>}
   */
  async getMembersByAccount(memberNumber) {
    // Check cache
    const cached = this._cache.get(memberNumber);
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      return cached.members;
    }

    const response = await this.api.get(`/get-members?account=${encodeURIComponent(memberNumber)}`);

    if (!response.ok) {
      console.error('Account lookup failed:', response.message);
      return [];
    }

    const members = (response.members || []).map(m => this._normalizeMember(m));

    // Cache result
    this._cache.set(memberNumber, { members, timestamp: Date.now() });

    return members;
  }

  /**
   * Invalidate cache for a specific account
   * Call this when a member is added/modified
   * @param {string} memberNumber
   */
  invalidateAccount(memberNumber) {
    this._cache.delete(memberNumber);
  }

  /**
   * Invalidate entire cache
   */
  invalidateAll() {
    this._cache.clear();
  }

  /**
   * Clear the member cache (alias for invalidateAll)
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Normalize member data from API
   * @private
   * @param {Object} m - Raw member from API
   * @returns {import('./types').Member}
   */
  _normalizeMember(m) {
    return {
      id: m.id,
      accountId: m.account_id,
      memberNumber: m.member_number,
      displayName: m.display_name,
      isPrimary: m.is_primary,
    };
  }
}

export default TennisDirectory;
