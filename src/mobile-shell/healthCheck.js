/**
 * Mobile Shell Health Check
 *
 * Monitors iframe health and optionally runs self-tests in debug mode.
 * Ported from Mobile.html inline script.
 */

import { logger } from '../lib/logger.js';

logger.info('Mobile Shell', 'Health check module loaded');

function getRegFrame() {
  return document.getElementById('iframeReg') || document.getElementById('iframeRegistration');
}

function getBoardFrame() {
  return document.getElementById('iframeBoard');
}

function checkFrame(frameEl) {
  const f = frameEl;
  if (!f || !f.contentWindow) return { ok: false, reason: 'iframe missing' };
  const w = f.contentWindow;
  const T = w.Tennis || {};
  const D = T.Domain || {};
  return {
    ok: !!(
      T.Config &&
      T.Storage &&
      T.Events &&
      T.DataStore &&
      (D.time || D.Time) &&
      (D.availability || D.Availability)
    ),
    keys: Object.keys(D || {}),
  };
}

function logHealth() {
  const reg = checkFrame(getRegFrame());
  const brd = checkFrame(getBoardFrame());
  logger.info('Mobile Health', 'Registration:', reg);
  logger.info('Mobile Health', 'Board:', brd);
}

// Run health checks on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', logHealth);
} else {
  logHealth();
}

// Listen for data updates via Tennis.Events (if available)
if (typeof window !== 'undefined') {
  const checkEvents = () => {
    if (window.Tennis?.Events?.onDom) {
      window.Tennis.Events.onDom('tennisDataUpdate', logHealth);
    }
  };
  // Check immediately and after a short delay (in case Events loads async)
  checkEvents();
  setTimeout(checkEvents, 1000);
}

// Run self-tests only in debug mode
document.addEventListener('DOMContentLoaded', () => {
  const isDebug = new URLSearchParams(location.search).get('debug') === '1';

  if (isDebug && window.Tennis?.selfTest) {
    const results = window.Tennis.selfTest.runAll();
    logger.info(
      'Mobile Shell',
      `Self-tests: ${results.passed}/${results.total} passed (${Math.round(results.successRate * 100)}%)`
    );
  }

  // Ensure iframe content renders colors correctly
  const boardFrame = getBoardFrame();
  if (boardFrame) {
    boardFrame.addEventListener('load', () => {
      try {
        const iframeDoc = boardFrame.contentDocument || boardFrame.contentWindow.document;
        if (iframeDoc && iframeDoc.body) {
          // Trigger a reflow to ensure styles are applied
          iframeDoc.body.style.display = 'none';
          iframeDoc.body.offsetHeight; // Force reflow
          iframeDoc.body.style.display = '';
        }
      } catch (e) {
        logger.warn('Mobile Shell', 'Could not access iframe content:', e);
      }
    });
  }
});
