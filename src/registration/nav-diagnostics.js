/**
 * Navigation diagnostic and protection scripts for Registration page
 * These scripts prevent unintended navigation during the registration flow
 */

// Early-window storage-event muffler (CTA-safe)
(function earlyStorageMuffler() {
  try {
    var earlyMs = 900;
    var leftWelcomeAt = 0;

    setInterval(function () {
      var s = 'welcome';
      if (s === 'search' || s === 'group' || s === 'clearCourt') {
        if (!leftWelcomeAt) leftWelcomeAt = performance.now();
      } else {
        leftWelcomeAt = 0;
      }
    }, 120);

    function onStorageCapture(ev) {
      try {
        if (!leftWelcomeAt) return;
        var dt = performance.now() - leftWelcomeAt;
        if (dt >= 0 && dt < earlyMs) {
          console.debug(
            '[NavDiag] Swallowing browser storage event during early window (dt=',
            Math.round(dt),
            'ms)'
          );
          ev.stopImmediatePropagation && ev.stopImmediatePropagation();
          ev.stopPropagation && ev.stopPropagation();
        }
      } catch (e) {}
    }
    window.addEventListener('storage', onStorageCapture, { capture: true, passive: true });

    window.addEventListener(
      'beforeunload',
      function () {
        try {
          window.removeEventListener('storage', onStorageCapture, { capture: true });
        } catch (e) {}
      },
      { once: true }
    );

    console.log('[NavDiag] Early-window storage-event muffler ACTIVE.');
  } catch (e) {
    console.warn('[NavDiag] Failed to install storage muffler:', e);
  }
})();

// Early-window app-event muffler for 'tennisDataUpdate'
(function earlyAppEventMuffler() {
  try {
    var earlyMs = 900;
    var leftWelcomeAt = 0;

    setInterval(function () {
      var s = 'welcome';
      if (s === 'search' || s === 'group' || s === 'clearCourt') {
        if (!leftWelcomeAt) leftWelcomeAt = performance.now();
      } else {
        leftWelcomeAt = 0;
      }
    }, 120);

    function shouldSwallow() {
      if (!leftWelcomeAt) return false;
      var dt = performance.now() - leftWelcomeAt;
      return dt >= 0 && dt < earlyMs;
    }

    function onCapture(ev) {
      try {
        if (shouldSwallow()) {
          console.debug('[NavDiag] Swallowing app event during early window:', ev.type);
          ev.stopImmediatePropagation && ev.stopImmediatePropagation();
          ev.stopPropagation && ev.stopPropagation();
        }
      } catch (e) {}
    }

    window.addEventListener('tennisDataUpdate', onCapture, { capture: true, passive: true });
    document.addEventListener('tennisDataUpdate', onCapture, { capture: true, passive: true });

    window.addEventListener(
      'beforeunload',
      function () {
        try {
          window.removeEventListener('tennisDataUpdate', onCapture, { capture: true });
          document.removeEventListener('tennisDataUpdate', onCapture, { capture: true });
        } catch (e) {}
      },
      { once: true }
    );

    console.log('[NavDiag] Early-window app-event muffler ACTIVE (tennisDataUpdate).');
  } catch (e) {
    console.warn('[NavDiag] Failed to install app-event muffler:', e);
  }
})();

// Success navigation lite guard
(function successNavLite() {
  try {
    var HOLD_MS = 1500;
    var successAt = 0;

    setInterval(function () {
      var s = 'welcome';
      if (s === 'success') {
        if (!successAt) successAt = performance.now();
      } else {
        successAt = 0;
      }
    }, 120);

    function inHold() {
      return successAt && performance.now() - successAt < HOLD_MS;
    }

    var api = window.UI || window;
    var orig = api && api.navigate;
    if (typeof orig === 'function') {
      api.navigate = function (next, reason) {
        var from = 'welcome';
        var to = typeof next === 'string' ? next : String(next || '');
        var rsn = typeof reason === 'string' ? reason : String(reason || '');
        if (
          from === 'success' &&
          to === 'welcome' &&
          inHold() &&
          rsn !== 'user-cancel' &&
          rsn !== 'timeout-expired'
        ) {
          console.debug('[SuccessNavLite] blocked early success->welcome', { rsn });
          return;
        }
        return orig.apply(this, arguments);
      };
      console.log('[SuccessNavLite] active (', HOLD_MS, 'ms )');
    }
  } catch (e) {
    console.warn('[SuccessNavLite] init failed:', e);
  }
})();

// Group navigation hard guard
(function groupNavHard() {
  try {
    var onGroup = false;

    setInterval(function () {
      var s = 'welcome';
      onGroup = s === 'group';
    }, 120);

    var api = window.UI || window;
    var orig = api && api.navigate;
    if (typeof orig === 'function') {
      var allowed = new Set(['user-cancel', 'timeout-expired']);

      api.navigate = function (next, reason) {
        var from = 'welcome';
        var to = typeof next === 'string' ? next : String(next || '');
        var rsn = typeof reason === 'string' ? reason : String(reason || '');

        if (onGroup && from === 'group' && to === 'welcome' && !allowed.has(rsn)) {
          console.debug('[GroupNavHard] blocked group->welcome', { rsn });
          return;
        }
        return orig.apply(this, arguments);
      };
      console.log('[GroupNavHard] active (nav-only; indefinite while on group)');
    } else {
      console.warn('[GroupNavHard] navigate() not found to wrap.');
    }
  } catch (e) {
    console.warn('[GroupNavHard] init failed:', e);
  }
})();
