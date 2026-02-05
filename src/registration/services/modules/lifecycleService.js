import { transformCourts } from '../legacy/courtTransforms.js';
import { transformWaitlist } from '../legacy/waitlistTransforms.js';

/**
 * Lifecycle orchestration extracted from ApiTennisService.loadInitialData().
 * Mechanical extraction only - preserves exact behavior including:
 * - Parallel fetching via Promise.all
 * - Direct cache population (no notifications during init)
 * - Transform application for return value
 *
 * WP5-D-closeout: Extracted to complete service modularization.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Function} deps.setCourtData - Set court data cache
 * @param {Function} deps.setWaitlistData - Set waitlist data cache
 * @param {Function} deps.setSettingsCache - Set settings cache
 * @param {Function} deps.setMembersCache - Set members cache
 * @param {Object} deps.logger - Logger instance
 */
export function createLifecycleService({
  api,
  setCourtData,
  setWaitlistData,
  setSettingsCache,
  setMembersCache,
  logger,
}) {
  async function loadInitialData() {
    try {
      const [courtStatus, waitlist, settings, members] = await Promise.all([
        api.getCourtStatus(),
        api.getWaitlist(),
        api.getSettings(),
        api.getMembers(),
      ]);

      setCourtData(courtStatus);
      setWaitlistData(waitlist);
      setSettingsCache(settings);
      setMembersCache(members);

      return {
        courts: transformCourts(courtStatus.courts, { logger }),
        waitlist: transformWaitlist(waitlist.waitlist),
        settings: settings.settings,
        operatingHours: settings.operating_hours,
        members: members.members,
      };
    } catch (error) {
      logger.error('ApiService', 'Failed to load initial data', error);
      throw error;
    }
  }

  return { loadInitialData };
}
