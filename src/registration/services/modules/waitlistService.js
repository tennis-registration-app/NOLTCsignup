/**
 * Waitlist operations extracted from ApiTennisService.
 * Cache remains on ApiTennisService instance via accessors.
 *
 * WP5-D2: Safe read/refresh/remove slice - does NOT include addToWaitlist.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Function} deps.notifyListeners - Notify change listeners
 * @param {Function} deps.transformWaitlist - Transform API waitlist to legacy format
 * @param {Function} deps.getWaitlistData - Get cached waitlist data
 * @param {Function} deps.setWaitlistData - Set cached waitlist data
 * @param {Object} deps.logger - Logger instance
 */
export function createWaitlistService({
  api,
  notifyListeners,
  transformWaitlist,
  getWaitlistData,
  setWaitlistData,
  logger,
}) {
  async function refreshWaitlist() {
    try {
      const waitlistData = await api.getWaitlist();
      setWaitlistData(waitlistData);
      notifyListeners('waitlist');
      return transformWaitlist(waitlistData.waitlist);
    } catch (error) {
      logger.error('ApiService', 'Failed to refresh waitlist', error);
      throw error;
    }
  }

  async function getWaitlist() {
    if (!getWaitlistData()) {
      await refreshWaitlist();
    }
    return transformWaitlist(getWaitlistData().waitlist);
  }

  async function removeFromWaitlist(waitlistId) {
    // If passed an index (legacy), we need to look up the actual ID
    if (typeof waitlistId === 'number') {
      const waitlist = await getWaitlist();
      const entry = waitlist[waitlistId];
      if (!entry) {
        throw new Error(`Waitlist entry at index ${waitlistId} not found`);
      }
      waitlistId = entry.id;
    }

    await api.cancelWaitlist(waitlistId);

    // Refresh waitlist
    await refreshWaitlist();

    return {
      success: true,
    };
  }

  return {
    refreshWaitlist,
    getWaitlist,
    removeFromWaitlist,
  };
}
