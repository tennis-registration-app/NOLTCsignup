import { normalizeServiceError } from '@lib/errors';

/**
 * Settings operations extracted from ApiTennisService.
 *
 * @param {Object} deps
 * @param {*} deps.api
 * @param {Function} deps.getSettingsCache
 * @param {Function} deps.setSettingsCache
 */
export function createSettingsService({ api, getSettingsCache, setSettingsCache }) {
  async function getSettings() {
    try {
      if (!getSettingsCache()) {
        setSettingsCache(await api.getSettings());
      }
      return getSettingsCache();
    } catch (error) {
      throw normalizeServiceError(error, { service: 'settingsService', op: 'getSettings' });
    }
  }

  async function refreshSettings() {
    try {
      setSettingsCache(await api.getSettings(true));
      return getSettingsCache();
    } catch (error) {
      throw normalizeServiceError(error, { service: 'settingsService', op: 'refreshSettings' });
    }
  }

  return { getSettings, refreshSettings };
}
