/**
 * Window Bridge
 *
 * Single module that owns all window.* global access.
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

// =============================================================================
// UI Component Accessors
// =============================================================================

/**
 * Get the MobileModal API from window.MobileModal
 * @returns {Object|null} MobileModal API or null if not available
 */
export function getMobileModal() {
  if (typeof window === 'undefined') return null;
  return window.MobileModal ?? null;
}

/**
 * Get the UI namespace from window.UI
 * @returns {Object|null} UI namespace or null if not available
 */
export function getUI() {
  if (typeof window === 'undefined') return null;
  return window.UI ?? null;
}

// =============================================================================
// Refresh Function Accessors
// =============================================================================

/**
 * Get the board refresh function from window.refreshBoard
 * @returns {Function|null} Refresh function or null if not available
 */
export function getRefreshBoard() {
  if (typeof window === 'undefined') return null;
  return typeof window.refreshBoard === 'function' ? window.refreshBoard : null;
}

/**
 * Get the admin view refresh function from window.refreshAdminView
 * @returns {Function|null} Refresh function or null if not available
 */
export function getRefreshAdminView() {
  if (typeof window === 'undefined') return null;
  return typeof window.refreshAdminView === 'function' ? window.refreshAdminView : null;
}

/**
 * Get the data loader function from window.loadData
 * @returns {Function|null} Load function or null if not available
 */
export function getLoadData() {
  if (typeof window === 'undefined') return null;
  return typeof window.loadData === 'function' ? window.loadData : null;
}

/**
 * Get the mobile tap-to-register function from window.mobileTapToRegister
 * @returns {Function|null} Mobile registration function or null if not available
 */
export function getMobileTapToRegister() {
  if (typeof window === 'undefined') return null;
  return typeof window.mobileTapToRegister === 'function' ? window.mobileTapToRegister : null;
}
