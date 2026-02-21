import { getPref } from '../../platform/prefsStorage.js';

/**
 * Get device ID for admin API calls.
 * Prefers stored pref, falls back to 'admin-device'.
 * @returns {string}
 */
export function getDeviceId() {
  return getPref('deviceId') || 'admin-device';
}
