/**
 * @fileoverview Pure notification controller logic.
 * Testable with fake timers - no React dependencies.
 *
 * BEHAVIOR PARITY - CRITICAL:
 * - Does NOT cancel prior timeouts. If called twice quickly, TWO timeouts
 *   are scheduled. The first timeout may clear the second notification early.
 *   This matches current behavior. Do NOT "fix" this.
 */

/**
 * Create a showNotification function with injected dependencies.
 *
 * @param {Object} deps - Dependencies
 * @param {Function} deps.setNotification - State setter for notification
 * @param {Function} deps.addTimer - Timer registration function
 * @param {number} deps.timeoutMs - Auto-dismiss timeout in ms (default 3000)
 * @returns {Function} showNotification(message, type) function
 */
export function createShowNotification({ setNotification, addTimer, timeoutMs = 3000 }) {
  /**
   * Show a notification with auto-dismiss.
   *
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('info', 'success', 'error', 'warning')
   */
  return function showNotification(message, type = 'info') {
    // Set notification with exact shape: { message, type } - no extra keys
    setNotification({ message, type });

    // Schedule auto-dismiss
    // NOTE: Does NOT cancel prior timeouts (behavior parity with original)
    addTimer(
      setTimeout(() => setNotification(null), timeoutMs),
      'timeout'
    );
  };
}
