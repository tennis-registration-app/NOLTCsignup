/**
 * @fileoverview Central timer registry for admin view.
 * Manages intervals and timeouts with centralized cleanup.
 *
 * IMPORTANT: _timers array is module-private to prevent external mutation.
 * Only addTimer and clearAllTimers are exported.
 */

// Private timer registry - NOT exported
const _timers = [];

/**
 * Register a timer (interval or timeout) for centralized cleanup.
 *
 * @param {number} id - Timer ID from setInterval or setTimeout
 * @param {string} type - 'interval' or 'timeout'
 * @returns {number} The same timer ID (for chaining)
 */
export const addTimer = (id, type = 'interval') => {
  _timers.push({ id, type });
  return id;
};

/**
 * Clear all registered timers.
 * Called on component unmount and page unload.
 */
export const clearAllTimers = () => {
  _timers.forEach(({ id, type }) => {
    try {
      if (type === 'interval') clearInterval(id);
      else clearTimeout(id);
    } catch {
      // Intentionally ignored: timer may already be cleared
    }
  });
  _timers.length = 0;
};
