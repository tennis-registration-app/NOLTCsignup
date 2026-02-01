/**
 * @fileoverview TennisDirectory - Member lookup operations
 */
import { logger } from '../../lib/logger.js';

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

    const response = await this.api.get(`/get-members?search=${encodeURIComponent(query)}`);

    if (!response.ok) {
      logger.error('TennisDirectory', 'Member search failed', response.message);
      return [];
    }

    return (response.members || []).map((m) => this._normalizeMember(m));
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

    const response = await this.api.get(
      `/get-members?member_number=${encodeURIComponent(memberNumber)}`
    );

    logger.debug('TennisDirectory', 'API response', response);

    if (!response.ok) {
      logger.error('TennisDirectory', 'Account lookup failed', response.message);
      return [];
    }

    const members = (response.members || []).map((m) => this._normalizeMember(m));
    logger.debug('TennisDirectory', 'Normalized members', members);

    // Cache result
    this._cache.set(memberNumber, { members, timestamp: Date.now() });

    return members;
  }

  /**
   * Get all members (for autocomplete)
   * @returns {Promise<import('./types').Member[]>}
   */
  async getAllMembers() {
    // Check cache
    const cached = this._cache.get('__all__');
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      return cached.members;
    }

    const response = await this.api.get('/get-members');

    if (!response.ok) {
      logger.error('TennisDirectory', 'Get all members failed', response.message);
      return [];
    }

    const members = (response.members || []).map((m) => this._normalizeMember(m));

    // Cache result
    this._cache.set('__all__', { members, timestamp: Date.now() });

    return members;
  }

  /**
   * Find member by name within an account
   * Matches exactly, then by partial match, then by last name
   * @param {string} memberNumber - 4-digit family number
   * @param {string} name - Name to match
   * @returns {Promise<import('./types').Member | null>}
   */
  async findMemberByName(memberNumber, name) {
    const members = await this.getMembersByAccount(memberNumber);
    if (members.length === 0) return null;

    const nameLower = name.toLowerCase().trim();

    // Exact match
    let match = members.find((m) => m.displayName.toLowerCase().trim() === nameLower);
    if (match) return match;

    // Partial match (contains)
    match = members.find((m) => {
      const display = m.displayName.toLowerCase().trim();
      return display.includes(nameLower) || nameLower.includes(display);
    });
    if (match) return match;

    // Last name match
    match = members.find((m) => {
      const displayLast = m.displayName.toLowerCase().split(' ').pop();
      const nameLast = nameLower.split(' ').pop();
      return displayLast === nameLast;
    });
    if (match) return match;

    // Single member on account - use it with warning
    if (members.length === 1) {
      logger.warn('TennisDirectory', 'Using only member on account', {
        found: members[0].displayName,
        searched: name,
      });
      return members[0];
    }

    // Multiple members, no match - use primary if available
    const primary = members.find((m) => m.isPrimary);
    if (primary) {
      logger.warn('TennisDirectory', 'Name mismatch! Using primary', {
        found: primary.displayName,
        searched: name,
      });
      return primary;
    }

    return null;
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
      // Canonical camelCase properties
      id: m.id,
      accountId: m.account_id,
      memberNumber: m.member_number,
      displayName: m.display_name,
      isPrimary: m.is_primary,
      unclearedStreak: m.uncleared_streak || 0,
      // Snake_case aliases for UI compatibility
      account_id: m.account_id,
      member_number: m.member_number,
      display_name: m.display_name,
      is_primary: m.is_primary,
      uncleared_streak: m.uncleared_streak || 0,
    };
  }
}

export default TennisDirectory;
