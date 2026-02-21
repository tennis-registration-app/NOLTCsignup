/**
 * Dispatch a toast notification via the UI_TOAST custom event.
 * Consumed by the ToastHost React component in each app.
 *
 * @param {string} message - Toast message
 * @param {{ type?: 'success' | 'error' | 'info' | 'warning', duration?: number }} [options]
 */
export function toast(message, options = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('UI_TOAST', { detail: { msg: message, ...options } }));
}
