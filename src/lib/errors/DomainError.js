/**
 * Domain error contract for service layer.
 *
 * @property {string} code - Stable machine key (UNKNOWN, NETWORK, DB_ERROR, EDGE_FN_ERROR, TRANSFORM_ERROR)
 * @property {string} message - User-safe message (preserved from original by default)
 * @property {Record<string, unknown>} [safeDetails] - Sanitized metadata safe for logging
 * @property {unknown} [cause] - Original error object (NOT for UI display)
 */
export class DomainError extends Error {
  constructor(code, message, { safeDetails, cause } = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.safeDetails = safeDetails ?? {};
    this.cause = cause;

    // Preserve stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }
}

/**
 * Check if an error is a DomainError.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isDomainError(err) {
  return err instanceof DomainError;
}

/**
 * Supported error codes (minimal set, expand as follow-ons).
 * @readonly
 * @enum {string}
 */
export const ErrorCodes = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  NETWORK: 'NETWORK',
  DB_ERROR: 'DB_ERROR',
  EDGE_FN_ERROR: 'EDGE_FN_ERROR',
  TRANSFORM_ERROR: 'TRANSFORM_ERROR',
});
