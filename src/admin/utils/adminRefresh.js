/**
 * Admin Refresh Utilities
 *
 * Coalesced refresh handling for the admin panel.
 * Both IIFEs execute immediately at module load to maintain original timing.
 */

// Idempotent coalescer - executes immediately at module load
(function () {
  if (window.scheduleAdminRefresh) return;

  window.__adminRefreshPending = false;
  window.__adminCoalesceHits = 0; // dev-only metric

  window.scheduleAdminRefresh = function scheduleAdminRefresh() {
    if (window.__adminRefreshPending) return;
    window.__adminRefreshPending = true;

    setTimeout(() => {
      try {
        window.__adminCoalesceHits++;
        const fn = window.refreshAdminView || window.loadData || null;

        if (typeof fn === 'function') {
          fn(); // direct path
          return;
        }
        // bridge path
        window.dispatchEvent(new Event('ADMIN_REFRESH'));
      } finally {
        window.__adminRefreshPending = false;
      }
    }, 0);
  };
})();

// Idempotent wiring (window + document, just in case) - executes immediately at module load
(function wireAdminListenersOnce() {
  if (window.__wiredAdminListeners) return;
  window.__wiredAdminListeners = true;

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
