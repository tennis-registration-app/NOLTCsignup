/**
 * Register Globals
 *
 * Single module that owns all window.* global writes from ES modules.
 * Application code imports setters from here instead of writing to window directly.
 *
 * Benefits:
 * - Centralized control over global writes
 * - Easy to audit all window property assignments
 * - Clear inventory of what gets exported to global scope
 * - Matches windowBridge.js pattern (reads vs writes)
 *
 * Note: IIFE files (mobile-bridge.js, mobile-fallback-bar.js, etc.) cannot use
 * ES imports and are documented exceptions in docs/WINDOW_GLOBALS.md.
 */

// ============================================
// TENNIS NAMESPACE
// ============================================

/**
 * Set window.Tennis namespace (or merge with existing)
 * @param {Object} tennis - Tennis namespace object
 */
export function setTennisGlobal(tennis) {
  window.Tennis = tennis;
}

/**
 * Ensure Tennis namespace exists (idempotent init)
 * Use this instead of `window.Tennis = window.Tennis || {}`
 * @returns {Object} The Tennis namespace object
 */
export function ensureTennisGlobal() {
  window.Tennis = window.Tennis || {};
  return window.Tennis;
}

// ============================================
// SERVICES
// ============================================

/**
 * Set window.GeolocationService
 * @param {Object} service - GeolocationService instance
 */
export function setGeolocationServiceGlobal(service) {
  window.GeolocationService = service;
}

// ============================================
// FLAGS
// ============================================

/**
 * Set window.NOLTC_USE_API flag
 * @param {boolean} value - Whether API mode is enabled
 */
export function setNoltcUseApiGlobal(value) {
  window.NOLTC_USE_API = value;
}

// ============================================
// REFRESH FUNCTIONS
// ============================================

/**
 * Set window.loadData function
 * @param {Function} fn - Data loader function
 */
export function setLoadDataGlobal(fn) {
  window.loadData = fn;
}

/**
 * Set window.refreshBoard function
 * @param {Function} fn - Board refresh function
 */
export function setRefreshBoardGlobal(fn) {
  window.refreshBoard = fn;
}

/**
 * Set window.refreshAdminView function
 * @param {Function} fn - Admin view refresh function
 */
export function setRefreshAdminViewGlobal(fn) {
  window.refreshAdminView = fn;
}

// ============================================
// ADMIN REFRESH INTERNALS
// ============================================

/**
 * Set window.__adminRefreshPending flag
 * @param {boolean} value - Whether a refresh is pending
 */
export function setAdminRefreshPending(value) {
  window.__adminRefreshPending = value;
}

/**
 * Get window.__adminRefreshPending flag
 * @returns {boolean}
 */
export function getAdminRefreshPending() {
  return window.__adminRefreshPending;
}

/**
 * Set window.__adminCoalesceHits counter
 * @param {number} value - Coalesce hit count
 */
export function setAdminCoalesceHits(value) {
  window.__adminCoalesceHits = value;
}

/**
 * Get window.__adminCoalesceHits counter
 * @returns {number}
 */
export function getAdminCoalesceHits() {
  return window.__adminCoalesceHits;
}

/**
 * Increment window.__adminCoalesceHits counter
 */
export function incrementAdminCoalesceHits() {
  window.__adminCoalesceHits++;
}

/**
 * Set window.scheduleAdminRefresh function
 * @param {Function} fn - Admin refresh scheduler function
 */
export function setScheduleAdminRefreshGlobal(fn) {
  window.scheduleAdminRefresh = fn;
}

/**
 * Set window.__wiredAdminListeners flag
 * @param {boolean} value - Whether admin listeners are wired
 */
export function setWiredAdminListeners(value) {
  window.__wiredAdminListeners = value;
}

/**
 * Get window.__wiredAdminListeners flag
 * @returns {boolean}
 */
export function getWiredAdminListeners() {
  return window.__wiredAdminListeners;
}
