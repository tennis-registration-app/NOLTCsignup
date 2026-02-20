/**
 * Courtboard Pre-Init
 * Extracted from inline <script> blocks in src/courtboard/index.html.
 *
 * These must execute before React renders:
 * - Toast bridge (window.Tennis.UI.toast) — used by components
 * - Preflight self-heal — normalizes storage before app code reads it
 * - Mobile view detection — sets IS_MOBILE_VIEW + variant-mobile class
 * - Mobile modal bus — event system used by MobileModalApp
 *
 * Loaded via <script> (not module) to guarantee execution before main.jsx.
 */

// ---- Toast bridge (global) ----
window.Tennis = window.Tennis || {};
window.Tennis.UI = window.Tennis.UI || {};
window.Tennis.UI.toast = (msg, opts = {}) =>
  window.dispatchEvent(new CustomEvent('UI_TOAST', { detail: { msg, ...opts } }));

// ---- Preflight cache warm ----
// Inline readDataSafe logic — parse localStorage so the browser caches the JSON.
// No APP_UTILS dependency needed; readDataSafe is read-only (never writes back).
try {
  var raw = localStorage.getItem('tennisClubData');
  if (raw) JSON.parse(raw);
} catch {
  // Intentionally swallowed — storage may be empty or malformed
}

// ---- File protocol warning (dev only) ----
(function () {
  if (location.protocol !== 'file:') return;

  console.warn(
    "[dev] Loaded via file:// — this uses a different storage and won't receive app events."
  );

  function addBanner() {
    var b = document.createElement('div');
    b.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;padding:8px 12px;' +
      'background:#f59e0b;color:#111;font:600 14px/1.2 system-ui;' +
      'z-index:99999;text-align:center';
    b.textContent =
      '\u26a0\ufe0f Running from file:// \u2014 use http://127.0.0.1:5500 for correct behavior';
    document.body.appendChild(b);
  }

  if (document.body) addBanner();
  else window.addEventListener('DOMContentLoaded', addBanner, { once: true });
})();

// ---- Mobile View Detection ----
window.IS_MOBILE_VIEW = new URLSearchParams(location.search).get('view') === 'mobile';
document.documentElement.classList.toggle('variant-mobile', window.IS_MOBILE_VIEW);

// ---- Mobile Modal Bus ----
// Must initialize before any React rendering so that mobile-fallback-bar.js
// and MobileModalApp can attach listeners synchronously.
(function initModalBus() {
  if (window.MobileModal) return;

  let lastOpen = 0;
  let currentModalType = null;

  window.MobileModal = {
    open(type, payload) {
      const now = Date.now();
      if (now - lastOpen < 250) return; // debounce guard

      if (currentModalType === type) {
        /** @type {any} */ (this).close();
        return;
      }

      currentModalType = type;
      document.dispatchEvent(new CustomEvent('mm:open', { detail: { type, payload } }));
    },
    close() {
      currentModalType = null;
      document.dispatchEvent(new Event('mm:close'));
    },
    get currentType() {
      return currentModalType;
    },
  };
})();
