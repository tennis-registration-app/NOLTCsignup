import { normalizeAccountMembers } from '@lib/normalize/index.js';
import { normalizeServiceError } from '@lib/errors';
import { resolveParticipants, WAITLIST_PROFILE } from './participantResolution.js';

/**
 * Waitlist operations extracted from ApiTennisService.
 * Cache remains on ApiTennisService instance via accessors.
 *
 * Safe read/refresh/remove slice.
 * Added addToWaitlist and assignFromWaitlist mutations.
 * Uses shared participantResolution helper.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Function} deps.notifyListeners - Notify change listeners
 * @param {Function} deps.transformWaitlist - Transform API waitlist to legacy format
 * @param {Function} deps.getWaitlistData - Get cached waitlist data
 * @param {Function} deps.setWaitlistData - Set cached waitlist data
 * @param {Object} deps.logger - Logger instance
 * @param {Object} [deps.courtsService] - Courts service for assignFromWaitlist
 */
export function createWaitlistService({
  api,
  notifyListeners,
  transformWaitlist,
  getWaitlistData,
  setWaitlistData,
  logger,
  courtsService,
}) {
  async function refreshWaitlist() {
    try {
      const waitlistData = await api.getWaitlist();
      setWaitlistData(waitlistData);
      notifyListeners('waitlist');
      return transformWaitlist(waitlistData.waitlist);
    } catch (error) {
      logger.error('ApiService', 'Failed to refresh waitlist', error);
      throw normalizeServiceError(error, { service: 'waitlistService', op: 'refreshWaitlist' });
    }
  }

  async function getWaitlist() {
    try {
      if (!getWaitlistData()) {
        await refreshWaitlist();
      }
      return transformWaitlist(getWaitlistData().waitlist);
    } catch (error) {
      throw normalizeServiceError(error, { service: 'waitlistService', op: 'getWaitlist' });
    }
  }

  async function removeFromWaitlist(waitlistId) {
    try {
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
    } catch (error) {
      throw normalizeServiceError(error, { service: 'waitlistService', op: 'removeFromWaitlist' });
    }
  }

  async function addToWaitlist(players, options = {}) {
    try {
      const traceId = options.traceId || `API-${Date.now()}`;
      logger.debug('ApiService', `[${traceId}] addToWaitlist ENTRY`);
      logger.debug('ApiService', `[${traceId}] Input players`, JSON.stringify(players, null, 2));
      logger.debug(
        'ApiService',
        `[${traceId}] Players summary`,
        players.map((p) => `${p.name}(id=${p.id},mn=${p.memberNumber})`)
      );
      logger.debug('ApiService', `[${traceId}] Options`, options);

      // Resolve players to participants using shared helper (WAITLIST_PROFILE)
      const { participants, groupType: resolvedGroupType } = await resolveParticipants(
        players,
        { api, logger, normalizeAccountMembers },
        WAITLIST_PROFILE,
        { traceId }
      );

      // Options override groupType
      const groupType = options.type || options.groupType || resolvedGroupType;

      logger.debug('ApiService', 'Calling API with', { groupType, participants });

      const result = await api.joinWaitlist(groupType, participants);
      logger.debug('ApiService', 'API response', JSON.stringify(result, null, 2));

      // Refresh waitlist and log it
      await refreshWaitlist();
      logger.debug(
        'ApiService',
        `Waitlist after refresh: ${getWaitlistData()?.waitlist?.length} entries`
      );

      // Extract position from API response
      const position = result.waitlist?.position || 1;
      logger.debug('ApiService', `Extracted position: ${position}`);

      return {
        success: true,
        waitlist: result.waitlist,
        position: position,
      };
    } catch (error) {
      logger.error('ApiService', 'API error', error);
      throw normalizeServiceError(error, { service: 'waitlistService', op: 'addToWaitlist' });
    }
  }

  async function assignFromWaitlist(waitlistId, courtNumber, options = {}) {
    try {
      // If passed an index (legacy), look up the actual ID
      if (typeof waitlistId === 'number') {
        const waitlist = await getWaitlist();
        const entry = waitlist[waitlistId];
        if (!entry) {
          throw new Error(`Waitlist entry at index ${waitlistId} not found`);
        }
        waitlistId = entry.id;
      }

      // Get court ID from court number
      const courts = await courtsService.getAllCourts();
      const court = courts.find((c) => c.number === courtNumber);

      if (!court) {
        throw new Error(`Court ${courtNumber} not found`);
      }

      const result = await api.assignFromWaitlist(waitlistId, court.id, {
        addBalls: options.addBalls || options.balls || false,
        splitBalls: options.splitBalls || false,
      });

      // Refresh both
      await Promise.all([courtsService.refreshCourtData(), refreshWaitlist()]);

      return {
        success: true,
        session: result.session,
      };
    } catch (error) {
      throw normalizeServiceError(error, { service: 'waitlistService', op: 'assignFromWaitlist' });
    }
  }

  return {
    refreshWaitlist,
    getWaitlist,
    removeFromWaitlist,
    addToWaitlist,
    assignFromWaitlist,
  };
}
