/**
 * Consistent logging wrapper for NOLTC Tennis Registration
 *
 * Level precedence:
 *   1. Vite env (VITE_DEBUG_MODE or import.meta.env.DEV)
 *   2. Default fallback: info
 *
 * Usage:
 *   import { logger } from '../lib/logger.js';
 *   logger.info('Registration', 'Player added', { playerId });
 *   logger.error('API', 'Request failed', { endpoint, error });
 *   logger.debug('CTA', 'State computed', { gateCount, waitlist });
 *
 * NOTE: Does NOT use localStorage or prefsStorage. Log level is determined
 * solely by environment configuration for predictable, secure behavior.
 *
 * @module logger
 */

// =============================================================================
// Log Levels
// =============================================================================

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

// =============================================================================
// Level Resolution (computed per-call, not frozen)
// =============================================================================

/**
 * Get default log level from Vite environment.
 * - VITE_DEBUG_MODE=true → debug
 * - import.meta.env.DEV (Vite dev server) → debug
 * - Otherwise → info
 * @returns {number}
 */
function getDefaultLogLevel() {
  try {
    const debugEnv = import.meta.env.VITE_DEBUG_MODE === 'true';
    const isDev = import.meta.env.DEV === true;
    return debugEnv || isDev ? LOG_LEVELS.debug : LOG_LEVELS.info;
  } catch {
    // Fallback if import.meta.env is unavailable
    return LOG_LEVELS.info;
  }
}

/**
 * Get effective log level.
 * Precedence: env default > info fallback (no localStorage)
 * @returns {number}
 */
function getLogLevel() {
  return getDefaultLogLevel();
}

/**
 * Check if a message at the given level should be logged.
 * @param {string} level - 'debug' | 'info' | 'warn' | 'error'
 * @returns {boolean}
 */
function shouldLog(level) {
  return LOG_LEVELS[level] >= getLogLevel();
}

// =============================================================================
// Logger API (signature unchanged for backward compatibility)
// =============================================================================

/**
 * Centralized logger with module tagging and level support.
 */
export const logger = {
  /**
   * Debug level log (most verbose)
   * @param {string} module - Module/component name
   * @param {string} message - Log message
   * @param {*} [data] - Optional data to log
   */
  debug(module, message, data = null) {
    if (shouldLog('debug')) {
      if (data !== null && data !== undefined) {
        console.log(`[${module}] ${message}`, data);
      } else {
        console.log(`[${module}] ${message}`);
      }
    }
  },

  /**
   * Info level log
   * @param {string} module - Module/component name
   * @param {string} message - Log message
   * @param {*} [data] - Optional data to log
   */
  info(module, message, data = null) {
    if (shouldLog('info')) {
      if (data !== null && data !== undefined) {
        console.log(`[${module}] ${message}`, data);
      } else {
        console.log(`[${module}] ${message}`);
      }
    }
  },

  /**
   * Warning level log
   * @param {string} module - Module/component name
   * @param {string} message - Log message
   * @param {*} [data] - Optional data to log
   */
  warn(module, message, data = null) {
    if (shouldLog('warn')) {
      if (data !== null && data !== undefined) {
        console.warn(`[${module}] ${message}`, data);
      } else {
        console.warn(`[${module}] ${message}`);
      }
    }
  },

  /**
   * Error level log (always logged unless level is 'none')
   * @param {string} module - Module/component name
   * @param {string} message - Log message
   * @param {*} [data] - Optional data to log
   */
  error(module, message, data = null) {
    if (shouldLog('error')) {
      if (data !== null && data !== undefined) {
        console.error(`[${module}] ${message}`, data);
      } else {
        console.error(`[${module}] ${message}`);
      }
    }
  },

  /**
   * Start a collapsed console group
   * @param {string} module - Module/component name
   * @param {string} label - Group label
   */
  group(module, label) {
    if (shouldLog('debug')) {
      console.group(`[${module}] ${label}`);
    }
  },

  /**
   * End a console group
   */
  groupEnd() {
    if (shouldLog('debug')) {
      console.groupEnd();
    }
  },
};

export default logger;
