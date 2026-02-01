// @ts-check

/**
 * Standard orchestrator result shapes.
 *
 * These helpers produce result objects matching the Result/ResultError
 * typedefs in src/lib/types/result.js. Function signatures and return
 * shapes are unchanged from the original implementation.
 *
 * @typedef {import('../../../lib/types/result.js').Result<*>} Result
 * @typedef {import('../../../lib/types/result.js').ResultError} ResultError
 * @typedef {import('../../../lib/types/result.js').ResultOrError<*>} ResultOrError
 */

/**
 * Create a success result.
 *
 * @param {*} [data=null] - The success payload
 * @returns {Result}
 */
export function success(data = null) {
  return { ok: true, data };
}

/**
 * Create a failure result.
 *
 * @param {string} code - Error code (e.g., 'UNEXPECTED_ERROR')
 * @param {string} message - Human-readable error message
 * @param {*} [details] - Optional additional context
 * @returns {ResultError}
 */
export function failure(code, message, details = undefined) {
  return { ok: false, error: { code, message, details } };
}

/**
 * Wrap an async function and normalize its result.
 * Success returns the function's resolved value as a Result.
 * Failure catches errors and returns a ResultError with UNEXPECTED_ERROR code.
 *
 * @param {() => Promise<*>} fn - Async function to wrap
 * @returns {Promise<ResultOrError>}
 */
export async function wrapAsync(fn) {
  try {
    const data = await fn();
    return success(data);
  } catch (err) {
    // Cast to any to preserve exact behavior — err.message may be undefined
    // for non-Error throws, and that's the existing contract.
    return failure('UNEXPECTED_ERROR', /** @type {any} */ (err).message, err);
  }
}
