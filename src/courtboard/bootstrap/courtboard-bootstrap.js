/**
 * Courtboard Bootstrap
 * Consolidated from courtboardPreInit.js + mobile-bridge.js (ADR-006 Phase 2).
 *
 * These must execute before React renders:
 * - Toast bridge (window.Tennis.UI.toast) — used by components
 * - Preflight self-heal — normalizes storage before app code reads it
 * - Mobile view detection — sets IS_MOBILE_VIEW + variant-mobile class
 * - Mobile modal bus — event system used by MobileModalApp
 * - Mobile bridge — tap-to-register, highlight, click delegation
 *
 * Loaded via <script> (not module) to guarantee execution before main.jsx.
 */

// ============================================================
// Section 1: Pre-Init (formerly courtboardPreInit.js)
// ============================================================

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

// ============================================================
// Section 2: Mobile Bridge (formerly mobile-bridge.js)
// ============================================================

/* eslint-disable no-console -- IIFE loaded via <script> tag; cannot import logger */
(function boardMobileBridge() {
  // Mobile-only: only active when embedded
  const MOBILE = window.top !== window.self;

  /**
   * Get Courtboard state from React (via window bridge).
   * Uses the centralized accessor - NO localStorage reads.
   */
  function getCourtboardState() {
    return window.CourtboardState ?? { courts: [], courtBlocks: [], waitingGroups: [] };
  }

  // call this when an available court is tapped
  window.mobileTapToRegister = function (courtNumber) {
    if (!MOBILE) return false; // do nothing on desktop/iPad standalone

    // Check if user is already registered - show toast instead of registration
    const registeredCourt = sessionStorage.getItem('mobile-registered-court');
    if (registeredCourt) {
      // Verify the registration is still valid by checking if the court is actually occupied
      try {
        // Use React state via getCourtboardState() - no localStorage
        const state = getCourtboardState();
        const courts = state.courts || [];
        const courtIndex = parseInt(registeredCourt, 10) - 1;
        const court = courts[courtIndex];

        // Check if court is actually occupied (Domain format: session.group.players)
        const isActuallyOnCourt =
          court &&
          (court.isOccupied ||
            court.session?.group?.players?.length > 0 ||
            court.session?.participants?.length > 0); // API wire format fallback

        if (!isActuallyOnCourt) {
          // Registration is stale - clear it and allow new registration
          console.log('Clearing stale mobile registration for court', registeredCourt);
          sessionStorage.removeItem('mobile-registered-court');
          window.parent.postMessage({ type: 'resetRegistration' }, '*');
          return false; // Allow registration to proceed
        }
      } catch (e) {
        console.error('Error verifying court occupation:', e);
        // If we can't verify, clear the stale registration
        sessionStorage.removeItem('mobile-registered-court');
        window.parent.postMessage({ type: 'resetRegistration' }, '*');
        return false;
      }

      // Only show toast if registration is still valid
      if (window.Tennis?.UI?.toast) {
        window.Tennis.UI.toast(
          `You are currently registered for play on Court ${registeredCourt}`,
          { type: 'warning' }
        );
      }
      return false; // Don't proceed with registration
    }

    // Check if there's a waitlist
    try {
      // Use React state via getCourtboardState() - no localStorage
      const state = getCourtboardState();
      const waitingGroups = state.waitingGroups || [];
      const mobileWaitlistEntryId = sessionStorage.getItem('mobile-waitlist-entry-id');

      if (waitingGroups.length > 0) {
        // Check if this mobile user is first in waitlist
        const firstGroup = waitingGroups[0];
        const isUserFirstInWaitlist =
          mobileWaitlistEntryId && firstGroup?.id === mobileWaitlistEntryId;

        if (isUserFirstInWaitlist) {
          // User is first in waitlist - trigger assign-from-waitlist to this court
          console.log('[Mobile] Assigning first waitlist group to court', courtNumber);
          try {
            window.parent.postMessage(
              {
                type: 'assign-from-waitlist',
                courtNumber: Number(courtNumber),
                waitlistEntryId: mobileWaitlistEntryId,
              },
              '*'
            );
          } catch {
            // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
          }
          return true;
        } else {
          // User is NOT first (or not on waitlist at all) - redirect to join waitlist
          try {
            window.parent.postMessage({ type: 'register', courtNumber: null }, '*');
          } catch {
            // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
          }
          return true;
        }
      }
    } catch (e) {
      console.warn('Error checking waitlist in mobileTapToRegister:', e);
    }

    // Normal behavior: no waitlist, select the court directly
    try {
      window.parent.postMessage({ type: 'register', courtNumber: Number(courtNumber) }, '*');
    } catch {
      // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
    }
    return true;
  };

  // Optional: highlight after success and handle mobile registration
  window.addEventListener('message', (e) => {
    const d = e?.data;
    if (!d) return;

    if (d.type === 'highlight') {
      const n = Number(d.courtNumber);
      const el = document.querySelector(`[data-court="${n}"]`);
      if (!el) return;
      el.classList.add('court-highlight');
      setTimeout(() => el.classList.remove('court-highlight'), 3000);
    } else if (d.type === 'mobile:registrationSuccess') {
      console.log('CourtBoard received mobile registration success for court:', d.courtNumber);
      // Fire DOM event for mobile bottom bar to listen to
      document.dispatchEvent(
        new CustomEvent('mobile:registrationSuccess', {
          detail: { courtNumber: Number(d.courtNumber) },
        })
      );
    }
  });

  // Tap debouncing to prevent double opens
  let _tapLock = 0;
  document.addEventListener('click', (ev) => {
    if (window.top === window.self) return; // only when embedded

    // Check if this click was on a court card that already has a React onClick handler
    const card = /** @type {HTMLElement} */ (ev.target).closest(
      '[data-court][data-available="true"]'
    );
    if (!card) return;

    // If the court has a React onClick handler (available courts), let React handle it
    const hasReactHandler =
      /** @type {HTMLElement} */ (card).onclick !== null || card.getAttribute('role') === 'button';
    if (hasReactHandler) return; // Let React onClick handle it

    const now = Date.now();
    if (now - _tapLock < 300) return; // debounce
    _tapLock = now;

    const n = Number(card.getAttribute('data-court'));
    if (!Number.isFinite(n)) return;

    // Use mobileTapToRegister to ensure proper registration checks (toast for already registered users)
    if (window.mobileTapToRegister) {
      const proceeded = window.mobileTapToRegister(n);
      if (proceeded) {
        ev.preventDefault();
      }
    } else {
      // Fallback to direct message if mobileTapToRegister not available
      try {
        window.parent.postMessage({ type: 'register', courtNumber: n }, '*');
      } catch {
        // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
      }
      ev.preventDefault();
    }
  });
})();
