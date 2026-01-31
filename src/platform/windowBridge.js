/**
 * Window Bridge
 *
 * WP7.2: Single module that owns all window.* global access.
 * Application code imports from here instead of accessing window directly.
 *
 * Benefits:
 * - Centralized control over global dependencies
 * - Easy to mock in tests
 * - Clear inventory of external dependencies
 * - Guards against undefined access
 *
 * Note: Getters return undefined when unavailable (matching optional chaining behavior).
 * This preserves existing behavior where code may tolerate undefined.
 */

// ============================================
// APP_UTILS
// ============================================

/**
 * Get APP_UTILS namespace (TENNIS_CONFIG, EVENTS, etc.)
 * @returns {Object|undefined}
 */
export function getAppUtils() {
  return window.APP_UTILS;
}

/**
 * Get TENNIS_CONFIG from APP_UTILS
 * @returns {Object|undefined}
 */
export function getTennisConfig() {
  return window.APP_UTILS?.TENNIS_CONFIG;
}

/**
 * Get EVENTS from APP_UTILS
 * @returns {Object|undefined}
 */
export function getAppEvents() {
  return window.APP_UTILS?.EVENTS;
}

// ============================================
// FLAGS
// ============================================

/**
 * Check if running in mobile view
 * @returns {boolean}
 */
export function isMobileView() {
  return !!window.IS_MOBILE_VIEW;
}

/**
 * Check if API mode is enabled
 * @returns {boolean}
 */
export function isApiMode() {
  return !!window.NOLTC_USE_API;
}

// ============================================
// SERVICES
// ============================================

/**
 * Get GeolocationService
 * @returns {Object|undefined}
 */
export function getGeolocationService() {
  return window.GeolocationService;
}

// ============================================
// TENNIS NAMESPACE
// ============================================

/**
 * Ensure Tennis namespace exists on window.
 *
 * This is the single authorized initializer for window.Tennis.
 * Call sites that previously did `window.Tennis = window.Tennis || {}`
 * should use this function instead.
 *
 * @returns {Object} The Tennis namespace object
 */
export function ensureTennisNamespace() {
  window.Tennis = window.Tennis || {};
  return window.Tennis;
}

/**
 * Get Tennis namespace
 *
 * Plain JS exceptions (cannot use ES imports, use window.Tennis directly):
 * - src/courtboard/sync-promotions.js
 * - src/courtboard/mobile-bridge.js
 * - src/courtboard/debug-panel.js
 *
 * @returns {Object|undefined}
 */
export function getTennis() {
  return window.Tennis;
}

/**
 * Get Tennis.Domain
 * @returns {Object|undefined}
 */
export function getTennisDomain() {
  return window.Tennis?.Domain;
}

/**
 * Get Tennis.Commands
 * @returns {Object|undefined}
 */
export function getTennisCommands() {
  return window.Tennis?.Commands;
}

/**
 * Get Tennis.DataStore
 * @returns {Object|undefined}
 */
export function getTennisDataStore() {
  return window.Tennis?.DataStore;
}

/**
 * DataStore bridge - get value by key
 * Pure pass-through, preserves return shape
 * Returns undefined if namespace/method unavailable (SSR/test safe)
 *
 * @param {string} key - Storage key
 * @returns {Promise<*>} Stored value or undefined
 */
export function getDataStoreValue(key) {
  return window.Tennis?.DataStore?.get?.(key);
}

/**
 * DataStore bridge - set value by key with options
 * Pure pass-through, preserves write timing
 * No-op if namespace/method unavailable (SSR/test safe)
 *
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @param {Object} [options] - Storage options (e.g., { expiresInMinutes })
 * @returns {Promise<void>}
 */
export function setDataStoreValue(key, value, options) {
  return window.Tennis?.DataStore?.set?.(key, value, options);
}

/**
 * Get Tennis.Config
 * @returns {Object|undefined}
 */
export function getTennisNamespaceConfig() {
  return window.Tennis?.Config;
}

/**
 * Get Tennis.Storage
 * @returns {Object|undefined}
 */
export function getTennisStorage() {
  return window.Tennis?.Storage;
}

/**
 * Storage bridge - safe data reading
 * Pure pass-through, preserves optional-chain semantics
 * Returns undefined if namespace/method unavailable (SSR/test safe)
 *
 * @returns {Object|undefined} Court data or undefined if unavailable
 */
export function getStorageDataSafe() {
  return window.Tennis?.Storage?.readDataSafe?.();
}

/**
 * Get Tennis.UI
 * @returns {Object|undefined}
 */
export function getTennisUI() {
  return window.Tennis?.UI;
}

/**
 * Get Tennis.Events
 * @returns {Object|undefined}
 */
export function getTennisEvents() {
  return window.Tennis?.Events;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Check if a global is available
 * @param {string} globalName - Name of window property
 * @returns {boolean}
 */
export function isGlobalAvailable(globalName) {
  return window[globalName] != null;
}
