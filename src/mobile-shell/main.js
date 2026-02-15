/**
 * Mobile Shell Entry Point
 *
 * ESM bootstrap that replaces the legacy IIFE scripts.
 * Only loads Events adapter (required for health check) plus shell modules.
 */

(async () => {
  try {
    await import('../platform/attachLegacyEvents.js');
    await import('./healthCheck.js');
    await import('./mobileBridge.js');

    console.log('[Mobile Shell] ESM bootstrap complete');
  } catch (error) {
    console.error('[MobileShell]', error);
    const detail = {
      message: error?.message,
      stack: error?.stack,
      context: 'MobileShell',
      timestamp: new Date().toISOString(),
    };
    if (window.Tennis?.Events?.emitDom) {
      window.Tennis.Events.emitDom('clientError', detail);
    } else {
      window.dispatchEvent(new CustomEvent('clientError', { detail }));
    }
    // Show minimal fallback UI
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="padding:2rem;text-align:center;font-family:system-ui">
          <h1 style="color:#dc2626">Mobile Shell Error</h1>
          <p>${error?.message || 'Unknown error'}</p>
          <button onclick="location.reload()" style="padding:.5rem 1rem;background:#2563eb;color:#fff;border:none;border-radius:.25rem;cursor:pointer">Reload</button>
        </div>`;
    }
  }
})();
