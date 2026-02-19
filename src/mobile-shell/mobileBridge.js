/**
 * Mobile Bridge
 *
 * Handles iframe coordination, state sync, and message passing
 * between the Mobile shell and embedded Registration/CourtBoard apps.
 * Ported from Mobile.html inline script.
 */

import { logger } from '../lib/logger.js';

// DOM references (resolved lazily to handle module loading before DOM ready)
let overlay, iframeReg, iframeBoard;

function ensureDOMRefs() {
  if (!overlay) overlay = document.getElementById('regOverlay');
  if (!iframeReg) iframeReg = document.getElementById('iframeReg');
  if (!iframeBoard) iframeBoard = document.getElementById('iframeBoard');
}

// Mobile State Bridge - single place for state updates that broadcasts to iframes
const MobileBridge = {
  setRegisteredCourt(courtNumber) {
    if (courtNumber) {
      sessionStorage.setItem('mobile-registered-court', String(courtNumber));
    } else {
      sessionStorage.removeItem('mobile-registered-court');
    }
    this.broadcastState();
  },

  setWaitlistEntryId(entryId) {
    if (entryId) {
      sessionStorage.setItem('mobile-waitlist-entry-id', entryId);
    } else {
      sessionStorage.removeItem('mobile-waitlist-entry-id');
    }
    this.broadcastState();
  },

  getState() {
    return {
      registeredCourt: sessionStorage.getItem('mobile-registered-court'),
      waitlistEntryId: sessionStorage.getItem('mobile-waitlist-entry-id'),
    };
  },

  broadcastState() {
    ensureDOMRefs();
    const payload = this.getState();
    logger.info('MobileBridge', 'Broadcasting state:', payload);

    // Broadcast to courtboard iframe
    try {
      if (iframeBoard?.contentWindow) {
        iframeBoard.contentWindow.postMessage(
          {
            type: 'mobile:state-updated',
            payload,
          },
          '*'
        );
      }
    } catch (e) {
      logger.warn('MobileBridge', 'Could not broadcast to board:', e);
    }

    // Broadcast to registration iframe
    try {
      if (iframeReg?.contentWindow) {
        iframeReg.contentWindow.postMessage(
          {
            type: 'mobile:state-updated',
            payload,
          },
          '*'
        );
      }
    } catch (e) {
      logger.warn('MobileBridge', 'Could not broadcast to registration:', e);
    }
  },
};

// Expose MobileBridge globally for debugging
window.MobileBridge = MobileBridge;

function showReg(courtNumber) {
  ensureDOMRefs();
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
  // ask Registration to start (no reload)
  try {
    iframeReg.contentWindow.postMessage(
      { type: 'register', courtNumber: Number(courtNumber) },
      '*'
    );
  } catch {
    // ignore
  }
}

function showRegOverlayOnly() {
  ensureDOMRefs();
  // Show overlay without sending register message (for silent assign)
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideReg() {
  ensureDOMRefs();
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
}

// Expose functions globally for onclick handlers in HTML
window.showReg = showReg;
window.showRegOverlayOnly = showRegOverlayOnly;
window.hideReg = hideReg;

// Receive events from child iframes
window.addEventListener('message', (e) => {
  ensureDOMRefs();
  const d = e?.data;
  if (!d) return;
  logger.info('Mobile Shell', 'Received message:', d);

  if (d.type === 'register') {
    logger.info('Mobile Shell', 'Opening registration for court', d.courtNumber);
    showReg(d.courtNumber);
  } else if (d.type === 'register:closed') {
    logger.info('Mobile Shell', 'Registration closed by user');
    hideReg();
  } else if (d.type === 'registration:success') {
    logger.info(
      'Mobile Shell',
      'Registration success for court ' + d.courtNumber + ' - closing overlay in 8 seconds'
    );
    // Use MobileBridge to store and broadcast state
    MobileBridge.setRegisteredCourt(d.courtNumber);
    // Only clear waitlist entry ID if an actual court was assigned (not waitlist join)
    if (d.courtNumber) {
      MobileBridge.setWaitlistEntryId(null);
    }
    // Show success screen for 8 seconds before closing (synced with App.jsx countdown)
    window._registrationTimeout = setTimeout(() => {
      hideReg();
      logger.info('Mobile Shell', 'Closing overlay after 8 second delay');
      window._registrationTimeout = null;
    }, 8000);
    // visual confirmation on the board immediately
    try {
      iframeBoard.contentWindow.postMessage(
        { type: 'highlight', courtNumber: Number(d.courtNumber) },
        '*'
      );
      // Also notify the board about the mobile registration
      iframeBoard.contentWindow.postMessage(
        { type: 'mobile:registrationSuccess', courtNumber: Number(d.courtNumber) },
        '*'
      );
      // Force reload of the board to pick up the new session data
      iframeBoard.contentWindow.location.reload();
      // Wait for iframe to reload and React to render, then update button
      iframeBoard.onload = function () {
        logger.info('Mobile Shell', 'Board iframe reloaded, waiting for React to render...');
        // Give React time to render and populate CourtboardState
        setTimeout(function () {
          try {
            if (iframeBoard.contentWindow.updateJoinButtonForMobile) {
              iframeBoard.contentWindow.updateJoinButtonForMobile();
              logger.info('Mobile Shell', 'Called updateJoinButtonForMobile after reload');
            }
          } catch (err) {
            logger.warn('Mobile Shell', 'Could not call updateJoinButtonForMobile:', err);
          }
        }, 1500);
      };
    } catch {
      // ignore
    }
  } else if (d.type === 'resetRegistration') {
    logger.info('Mobile Shell', 'Resetting registration overlay');
    // Clear any pending timeout
    if (window._registrationTimeout) {
      clearTimeout(window._registrationTimeout);
      window._registrationTimeout = null;
    }
    // Hide the registration overlay immediately
    hideReg();
    // Reload the registration iframe to reset its state
    try {
      iframeReg.contentWindow.location.reload();
    } catch {
      // ignore
    }
  } else if (d.type === 'assign-from-waitlist') {
    // Silent assign mode - show overlay but don't send 'register' message
    logger.info(
      'Mobile Shell',
      'Assigning waitlist entry ' + d.waitlistEntryId + ' to court ' + d.courtNumber
    );
    showRegOverlayOnly(); // Show overlay (registration will show loading state)
    try {
      iframeReg.contentWindow.postMessage(
        {
          type: 'assign-from-waitlist',
          courtNumber: Number(d.courtNumber),
          waitlistEntryId: d.waitlistEntryId,
        },
        '*'
      );
    } catch (err) {
      logger.error('Mobile Shell', 'Failed to forward assign-from-waitlist:', err);
    }
  } else if (d.type === 'waitlist:joined') {
    // User joined waitlist - store entry ID and broadcast
    logger.info('Mobile Shell', 'User joined waitlist with entry ID:', d.entryId);
    MobileBridge.setWaitlistEntryId(d.entryId);
    // Trigger immediate board refresh to check for waitlist-available notice
    try {
      if (iframeBoard?.contentWindow) {
        iframeBoard.contentWindow.postMessage({ type: 'refresh-board' }, '*');
      }
    } catch (err) {
      logger.warn('Mobile Shell', 'Could not trigger board refresh:', err);
    }
  }
});

logger.info('Mobile Shell', 'MobileBridge loaded');
