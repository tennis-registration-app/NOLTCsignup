/**
 * Consistent logging wrapper for NOLTC Tennis Registration
 *
 * Usage:
 *   import { logger } from '@lib/logger';
 *   logger.info('Registration', 'Player added', { playerId });
 *   logger.error('API', 'Request failed', { endpoint, error });
 *   logger.debug('CTA', 'State computed', { gateCount, waitlist });
 *
 * Levels can be controlled via localStorage:
 *   localStorage.setItem('NOLTC_LOG_LEVEL', 'debug'); // debug|info|warn|error|none
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

function getLogLevel() {
  if (typeof window === 'undefined') return LOG_LEVELS.info;
  const stored = localStorage.getItem('NOLTC_LOG_LEVEL');
  return LOG_LEVELS[stored] ?? LOG_LEVELS.info;
}

function formatMessage(module, message) {
  return `[${module}] ${message}`;
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= getLogLevel();
}

export const logger = {
  debug(module, message, data = null) {
    if (!shouldLog('debug')) return;
    if (data) {
      console.log(`[${module}] ${message}`, data);
    } else {
      console.log(`[${module}] ${message}`);
    }
  },

  info(module, message, data = null) {
    if (!shouldLog('info')) return;
    if (data) {
      console.log(`[${module}] ${message}`, data);
    } else {
      console.log(`[${module}] ${message}`);
    }
  },

  warn(module, message, data = null) {
    if (!shouldLog('warn')) return;
    if (data) {
      console.warn(`[${module}] ${message}`, data);
    } else {
      console.warn(`[${module}] ${message}`);
    }
  },

  error(module, message, data = null) {
    if (!shouldLog('error')) return;
    if (data) {
      console.error(`[${module}] ${message}`, data);
    } else {
      console.error(`[${module}] ${message}`);
    }
  },

  // Group related logs together
  group(module, label) {
    if (!shouldLog('debug')) return;
    console.group(`[${module}] ${label}`);
  },

  groupEnd() {
    if (!shouldLog('debug')) return;
    console.groupEnd();
  },
};

// Export for convenience
export default logger;
