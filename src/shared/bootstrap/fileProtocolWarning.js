/**
 * Dev-only: Shows warning banner when opened via file:// protocol.
 * No-op in production (served via https).
 *
 * Extracted from inline <script> in registration/index.html and admin/index.html
 * to eliminate 'unsafe-inline' CSP dependency.
 */
export function installFileProtocolWarning() {
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
    b.textContent = '⚠️ Running from file:// — use http://127.0.0.1:5500 for correct behavior';
    document.body.appendChild(b);
  }

  if (document.body) addBanner();
  else window.addEventListener('DOMContentLoaded', addBanner, { once: true });
}
