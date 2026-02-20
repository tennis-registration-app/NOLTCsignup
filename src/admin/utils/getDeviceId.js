import { getTennis } from '../../platform/windowBridge.js';
import { getPref } from '../../platform/prefsStorage.js';

/**
 * Get device ID for admin API calls.
 * Prefers Tennis.deviceId, falls back to stored pref, then 'admin-device'.
 * @returns {string}
 */
export function getDeviceId() {
  return getTennis()?.deviceId || getPref('deviceId') || 'admin-device';
}
