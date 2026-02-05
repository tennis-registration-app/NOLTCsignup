/**
 * Courts operations extracted from ApiTennisService.
 * Cache remains on ApiTennisService instance via accessors.
 *
 * WP5-D1: Safe read/refresh slice.
 * WP5-D5: Added clearCourt mutation.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Function} deps.notifyListeners - Notify change listeners
 * @param {Function} deps.transformCourts - Transform API courts to legacy format
 * @param {Function} deps.getCourtData - Get cached court data
 * @param {Function} deps.setCourtData - Set cached court data
 * @param {Object} deps.logger - Logger instance
 */
export function createCourtsService({
  api,
  notifyListeners,
  transformCourts,
  getCourtData,
  setCourtData,
  logger,
}) {
  async function refreshCourtData() {
    try {
      const courtData = await api.getCourtStatus(true);
      setCourtData(courtData);
      notifyListeners('courts');
      return transformCourts(courtData.courts);
    } catch (error) {
      logger.error('ApiService', 'Failed to refresh court data', error);
      throw error;
    }
  }

  async function getAllCourts() {
    if (!getCourtData()) {
      await refreshCourtData();
    }
    return transformCourts(getCourtData().courts);
  }

  async function getAvailableCourts() {
    if (!getCourtData()) {
      await refreshCourtData();
    }
    return transformCourts(getCourtData().courts).filter((c) => c.isAvailable);
  }

  async function getCourtByNumber(courtNumber) {
    const courts = await getAllCourts();
    return courts.find((c) => c.number === courtNumber);
  }

  async function clearCourt(courtNumber, options = {}) {
    const courts = await getAllCourts();
    const court = courts.find((c) => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    // Map legacy clearReason to valid API end_reason values
    // Valid API values: 'completed', 'cleared_early', 'admin_override'
    const legacyReason = options.clearReason || options.reason || '';
    let endReason = 'completed';

    if (legacyReason) {
      const reasonLower = String(legacyReason).toLowerCase();
      if (
        reasonLower.includes('early') ||
        reasonLower.includes('left') ||
        reasonLower.includes('done') ||
        reasonLower === 'cleared'
      ) {
        endReason = 'cleared_early';
      } else if (reasonLower.includes('observed') || reasonLower.includes('empty')) {
        endReason = 'completed';
      } else if (
        reasonLower.includes('admin') ||
        reasonLower.includes('override') ||
        reasonLower.includes('force')
      ) {
        endReason = 'admin_override';
      }
    }

    logger.debug(
      'ApiService',
      `Clearing court ${courtNumber} with reason: ${endReason} (legacy: ${legacyReason})`
    );

    const result = await api.endSessionByCourt(court.id, endReason);

    // Refresh court data
    await refreshCourtData();

    return {
      success: true,
      session: result.session,
    };
  }

  return {
    refreshCourtData,
    getAllCourts,
    getAvailableCourts,
    getCourtByNumber,
    clearCourt,
  };
}
