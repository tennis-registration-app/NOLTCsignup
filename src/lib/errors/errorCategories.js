// @ts-check

/**
 * Error category constants for classifying application errors.
 *
 * @typedef {'VALIDATION' | 'NETWORK' | 'AUTH' | 'CONFLICT' | 'NOT_FOUND' | 'UNKNOWN'} ErrorCategory
 */

/** @type {Readonly<Record<string, ErrorCategory>>} */
export const ErrorCategories = Object.freeze({
  /** Input validation failures (bad data, schema errors) */
  VALIDATION: 'VALIDATION',

  /** Network/transport failures (fetch errors, timeouts, 5xx) */
  NETWORK: 'NETWORK',

  /** Authentication/authorization failures (401, 403) */
  AUTH: 'AUTH',

  /** Resource conflict (409, concurrent modification) */
  CONFLICT: 'CONFLICT',

  /** Resource not found (404) */
  NOT_FOUND: 'NOT_FOUND',

  /** Unclassifiable errors */
  UNKNOWN: 'UNKNOWN',
});
