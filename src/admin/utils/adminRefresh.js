/**
 * Admin Refresh Utilities
 *
 * Coalesced refresh handling for the admin panel.
 * Both IIFEs execute immediately at module load to maintain original timing.
 */
import { getRefreshAdminView, getLoadData } from '../../platform/windowBridge.js';
import {
  setAdminRefreshPending,
  getAdminRefreshPending,
  setAdminCoalesceHits,
  incrementAdminCoalesceHits,
  setScheduleAdminRefreshGlobal,
  setWiredAdminListeners,
  getWiredAdminListeners,
} from '../../platform/registerGlobals.js';

// Idempotent coalescer - executes immediately at module load
(function () {
  if (window.scheduleAdminRefresh) return;

  setAdminRefreshPending(false);
  setAdminCoalesceHits(0); // dev-only metric

  const scheduleAdminRefresh = function scheduleAdminRefresh() {
    if (getAdminRefreshPending()) return;
    setAdminRefreshPending(true);

    setTimeout(() => {
      try {
        incrementAdminCoalesceHits();
        const fn = getRefreshAdminView() || getLoadData() || null;

        if (typeof fn === 'function') {
          fn(); // direct path
          return;
        }
        // bridge path
        window.dispatchEvent(new Event('ADMIN_REFRESH'));
      } finally {
        setAdminRefreshPending(false);
      }
    }, 0);
  };

  setScheduleAdminRefreshGlobal(scheduleAdminRefresh);
})();

// Idempotent wiring (window + document, just in case) - executes immediately at module load
(function wireAdminListenersOnce() {
  if (getWiredAdminListeners()) return;
  setWiredAdminListeners(true);

  const h = window.scheduleAdminRefresh;
  if (typeof h !== 'function') return;

  window.addEventListener('tennisDataUpdate', h, { passive: true });
  window.addEventListener('DATA_UPDATED', h, { passive: true });
  window.addEventListener('BLOCKS_UPDATED', h, { passive: true });

  // backup (some environments dispatch on document)
  document.addEventListener('tennisDataUpdate', h, { passive: true });
  document.addEventListener('DATA_UPDATED', h, { passive: true });
  document.addEventListener('BLOCKS_UPDATED', h, { passive: true });
})();
