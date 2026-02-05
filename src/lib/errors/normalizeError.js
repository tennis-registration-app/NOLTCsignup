import { DomainError, isDomainError, ErrorCodes } from './DomainError.js';

/**
 * Context for error normalization.
 * @typedef {Object} NormalizeContext
 * @property {string} [service] - Service name (e.g., 'courtsService')
 * @property {string} [op] - Operation name (e.g., 'refreshCourtData')
 * @property {string} [codeOverride] - Explicit code override (must be valid ErrorCodes value)
 */

// Valid code values for override validation
const validCodes = new Set(Object.values(ErrorCodes));

/**
 * Normalize any error into a DomainError.
 *
 * Rules:
 * 1. IDEMPOTENT: If already DomainError, return unchanged
 * 2. PRESERVE MESSAGE: Use original error.message by default (UI safety)
 *    - Scrubbing intentionally deferred; preserve message to avoid UI contract breaks.
 *    - Message scrubbing logged as follow-on for WP5-B.6.
 * 3. ALWAYS ATTACH CAUSE: Original error goes in cause for debugging
 * 4. SANITIZE CONTEXT: Only service/op go in safeDetails
 *
 * @param {unknown} err - The caught error
 * @param {NormalizeContext} [context] - Additional context
 * @returns {DomainError}
 */
export function normalizeServiceError(err, context = {}) {
  // Rule 1: Idempotent - return existing DomainError unchanged
  if (isDomainError(err)) {
    return err;
  }

  const { service, op, codeOverride } = context;

  // Build safeDetails from context
  const safeDetails = {};
  if (service) safeDetails.service = service;
  if (op) safeDetails.operation = op;

  // Determine code - validate codeOverride against ErrorCodes
  let code;
  if (codeOverride && validCodes.has(codeOverride)) {
    code = codeOverride;
  } else {
    // Invalid or missing override - detect from error shape
    code = detectErrorCode(err);
  }

  // Rule 2: Preserve original message (UI safety)
  const message = extractMessage(err);

  return new DomainError(code, message, {
    safeDetails,
    cause: err,
  });
}

/**
 * Detect error code from error shape.
 * @param {unknown} err
 * @returns {string}
 */
function detectErrorCode(err) {
  if (!err) return ErrorCodes.UNKNOWN;

  // Supabase-like error shape: { code, message, details?, hint? }
  if (typeof err === 'object' && err !== null) {
    if ('code' in err && ('details' in err || 'hint' in err)) {
      return ErrorCodes.DB_ERROR;
    }

    // Edge function error (typically has status + body)
    if ('status' in err && 'body' in err) {
      return ErrorCodes.EDGE_FN_ERROR;
    }
  }

  // Network errors
  if (err instanceof TypeError && err.message?.includes('fetch')) {
    return ErrorCodes.NETWORK;
  }
  if (err instanceof Error && err.message?.toLowerCase().includes('network')) {
    return ErrorCodes.NETWORK;
  }

  return ErrorCodes.UNKNOWN;
}

/**
 * Extract message from various error shapes.
 * Preserves original message for UI compatibility.
 * @param {unknown} err
 * @returns {string}
 */
function extractMessage(err) {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    if ('message' in err && typeof err.message === 'string') return err.message;
    if ('error' in err && typeof err.error === 'object' && err.error?.message) {
      return err.error.message;
    }
  }
  return 'An unexpected error occurred';
}
