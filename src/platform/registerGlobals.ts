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
export function setTennisGlobal(tennis: Record<string, unknown>) {
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
export function setGeolocationServiceGlobal(service: unknown) {
  (window as any).GeolocationService = service;
}

// ============================================
// FLAGS
// ============================================

/**
 * Set window.NOLTC_USE_API flag
 * @param {boolean} value - Whether API mode is enabled
 */
export function setNoltcUseApiGlobal(value: boolean) {
  window.NOLTC_USE_API = value;
}

// ============================================
// REFRESH FUNCTIONS
// ============================================

/**
 * Set window.loadData function
 * @param {Function} fn - Data loader function
 */
export function setLoadDataGlobal(fn: () => void | Promise<void>) {
  window.loadData = /** @type {any} */ (fn);
}

/**
 * Set window.refreshBoard function
 * @param {Function} fn - Board refresh function
 */
export function setRefreshBoardGlobal(fn: () => void) {
  window.refreshBoard = /** @type {any} */ (fn);
}

/**
 * Set window.refreshAdminView function
 * @param {Function} fn - Admin view refresh function
 */
export function setRefreshAdminViewGlobal(fn: () => void) {
  window.refreshAdminView = /** @type {any} */ (fn);
}

// ============================================
// ADMIN REFRESH INTERNALS
// ============================================

/**
 * Set window.__adminRefreshPending flag
 * @param {boolean} value - Whether a refresh is pending
 */
export function setAdminRefreshPending(value: boolean) {
  window.__adminRefreshPending = value;
}

/**
 * Get window.__adminRefreshPending flag
 * @returns {boolean}
 */
export function getAdminRefreshPending() {
  return window.__adminRefreshPending ?? false;
}

/**
 * Set window.__adminCoalesceHits counter
 * @param {number} value - Coalesce hit count
 */
export function setAdminCoalesceHits(value: number) {
  window.__adminCoalesceHits = value;
}

/**
 * Get window.__adminCoalesceHits counter
 * @returns {number}
 */
export function getAdminCoalesceHits() {
  return window.__adminCoalesceHits ?? 0;
}

/**
 * Increment window.__adminCoalesceHits counter
 */
export function incrementAdminCoalesceHits() {
  window.__adminCoalesceHits = (window.__adminCoalesceHits ?? 0) + 1;
}

/**
 * Set window.scheduleAdminRefresh function
 * @param {Function} fn - Admin refresh scheduler function
 */
export function setScheduleAdminRefreshGlobal(fn: () => void) {
  window.scheduleAdminRefresh = /** @type {any} */ (fn);
}

/**
 * Set window.__wiredAdminListeners flag
 * @param {boolean} value - Whether admin listeners are wired
 */
export function setWiredAdminListeners(value: boolean) {
  window.__wiredAdminListeners = value;
}

/**
 * Get window.__wiredAdminListeners flag
 * @returns {boolean}
 */
export function getWiredAdminListeners() {
  return window.__wiredAdminListeners ?? false;
}
