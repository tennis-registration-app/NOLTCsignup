import { normalizeAccountMembers } from '@lib/normalize/normalizeMember.js';
import { normalizeServiceError } from '@lib/errors';
import { resolveParticipants, COURTS_PROFILE } from './participantResolution.js';

/**
 * Courts operations extracted from ApiTennisService.
 * Cache remains on ApiTennisService instance via accessors.
 *
 * WP5-D1: Safe read/refresh slice.
 * WP5-D5: Added clearCourt mutation.
 * WP5-D6: Added assignCourt mutation.
 * WP5-D8: Uses shared participantResolution helper.
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
      throw normalizeServiceError(error, { service: 'courtsService', op: 'refreshCourtData' });
    }
  }

  async function getAllCourts() {
    try {
      if (!getCourtData()) {
        await refreshCourtData();
      }
      return transformCourts(getCourtData().courts);
    } catch (error) {
      throw normalizeServiceError(error, { service: 'courtsService', op: 'getAllCourts' });
    }
  }

  async function getAvailableCourts() {
    try {
      if (!getCourtData()) {
        await refreshCourtData();
      }
      return transformCourts(getCourtData().courts).filter((c) => c.isAvailable);
    } catch (error) {
      throw normalizeServiceError(error, { service: 'courtsService', op: 'getAvailableCourts' });
    }
  }

  async function getCourtByNumber(courtNumber) {
    try {
      const courts = await getAllCourts();
      return courts.find((c) => c.number === courtNumber);
    } catch (error) {
      throw normalizeServiceError(error, { service: 'courtsService', op: 'getCourtByNumber' });
    }
  }

  async function clearCourt(courtNumber, options = {}) {
    try {
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
    } catch (error) {
      throw normalizeServiceError(error, { service: 'courtsService', op: 'clearCourt' });
    }
  }

  async function assignCourt(courtNumber, playersOrGroup, optionsOrDuration = {}) {
    try {
      // Handle legacy format: assignCourt(courtNumber, group, duration)
      // where group = { players: [...], guests: number }
      let players;
      let options = {};

      if (playersOrGroup && playersOrGroup.players && Array.isArray(playersOrGroup.players)) {
        // Legacy format: { players: [...], guests: number }
        players = playersOrGroup.players;

        // Duration passed as third argument
        if (typeof optionsOrDuration === 'number') {
          options = { duration: optionsOrDuration };
        } else {
          options = optionsOrDuration || {};
        }
      } else if (Array.isArray(playersOrGroup)) {
        // New format: array of players directly
        players = playersOrGroup;
        options = optionsOrDuration || {};
      } else {
        throw new Error('Invalid players format');
      }

      // Log player data for debugging
      logger.debug('ApiService', 'Players to assign', JSON.stringify(players, null, 2));

      // Find the court ID from court number
      const courts = await getAllCourts();
      const court = courts.find((c) => c.number === courtNumber);

      if (!court) {
        throw new Error(`Court ${courtNumber} not found`);
      }

      // Resolve players to participants using shared helper (COURTS_PROFILE)
      const { participants, groupType } = await resolveParticipants(
        players,
        { api, logger, normalizeAccountMembers },
        COURTS_PROFILE
      );

      logger.debug('ApiService', 'Transformed participants', JSON.stringify(participants, null, 2));

      // Determine session type (options override groupType)
      const sessionType = options.type || options.sessionType || groupType;

      const result = await api.assignCourt(court.id, sessionType, participants, {
        addBalls: options.addBalls || options.balls || false,
        splitBalls: options.splitBalls || false,
      });

      // Refresh court data
      await refreshCourtData();

      return {
        success: true,
        session: result.session,
        court: courtNumber,
      };
    } catch (error) {
      throw normalizeServiceError(error, { service: 'courtsService', op: 'assignCourt' });
    }
  }

  return {
    refreshCourtData,
    getAllCourts,
    getAvailableCourts,
    getCourtByNumber,
    clearCourt,
    assignCourt,
  };
}
