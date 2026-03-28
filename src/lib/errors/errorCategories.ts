/**
 * Error category constants for classifying application errors.
 */

export type ErrorCategory = 'VALIDATION' | 'NETWORK' | 'AUTH' | 'CONFLICT' | 'NOT_FOUND' | 'UNKNOWN';

export const ErrorCategories: Readonly<Record<string, ErrorCategory>> = Object.freeze({
  /** Input validation failures (bad data, schema errors) */
  VALIDATION: 'VALIDATION' as ErrorCategory,

  /** Network/transport failures (fetch errors, timeouts, 5xx) */
  NETWORK: 'NETWORK' as ErrorCategory,

  /** Authentication/authorization failures (401, 403) */
  AUTH: 'AUTH' as ErrorCategory,

  /** Resource conflict (409, concurrent modification) */
  CONFLICT: 'CONFLICT' as ErrorCategory,

  /** Resource not found (404) */
  NOT_FOUND: 'NOT_FOUND' as ErrorCategory,

  /** Unclassifiable errors */
  UNKNOWN: 'UNKNOWN' as ErrorCategory,
});
