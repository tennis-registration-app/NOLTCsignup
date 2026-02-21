/**
 * Window Bridge — typed accessors for window globals.
 *
 * Courtboard-only: The courtboard app's plain <script> files cannot use ESM imports
 * and read window.Tennis.* directly. These accessors serve the courtboard's ESM
 * components (hooks, main.jsx) that need typed access to the same namespace.
 *
 * isMobileView: Used across all apps (53 sites). Reads window.IS_MOBILE_VIEW.
 *
 * Registration and admin apps have been fully migrated to direct ESM imports
 * and no longer use bridge accessors (except isMobileView).
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

// ============================================
// TENNIS NAMESPACE
// ============================================

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
 * Get Tennis.DataStore
 * @returns {Object|undefined}
 */
export function getTennisDataStore() {
  return window.Tennis?.DataStore;
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
 * Get the mobile tap-to-register function from window.mobileTapToRegister
 * @returns {Function|null} Mobile registration function or null if not available
 */
export function getMobileTapToRegister() {
  if (typeof window === 'undefined') return null;
  return typeof window.mobileTapToRegister === 'function' ? window.mobileTapToRegister : null;
}
