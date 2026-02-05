/**
 * Courts operations extracted from ApiTennisService.
 * Cache remains on ApiTennisService instance via accessors.
 *
 * WP5-D1: Safe read/refresh slice - does NOT include assignCourt.
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

  return {
    refreshCourtData,
    getAllCourts,
    getAvailableCourts,
    getCourtByNumber,
  };
}
