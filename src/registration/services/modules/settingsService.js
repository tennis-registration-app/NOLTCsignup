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
    if (!getSettingsCache()) {
      setSettingsCache(await api.getSettings());
    }
    return getSettingsCache();
  }

  async function refreshSettings() {
    setSettingsCache(await api.getSettings(true));
    return getSettingsCache();
  }

  return { getSettings, refreshSettings };
}
