// @ts-check

/**
 * Standard result types for operations that can succeed or fail.
 *
 * These formalize the existing { ok, data } / { ok, error } envelope
 * pattern already used throughout the codebase. No field renames —
 * these match the shapes services and orchestrators already produce.
 *
 * @typedef {import('../errors/AppError.js').AppError} AppError
 */

/**
 * Successful result.
 *
 * @template T
 * @typedef {Object} Result
 * @property {true} ok
 * @property {T} data
 */

/**
 * Failed result with structured error.
 *
 * @typedef {Object} ResultError
 * @property {false} ok
 * @property {{ code: string, message: string, details?: * }} error
 */

/**
 * Union of success and failure results.
 *
 * @template T
 * @typedef {Result<T> | ResultError} ResultOrError
 */

/**
 * Helper to create a success result.
 *
 * @template T
 * @param {T} data
 * @returns {Result<T>}
 */
export function okResult(data) {
  return { ok: true, data };
}

/**
 * Helper to create an error result.
 *
 * @param {{ code: string, message: string, details?: * }} error
 * @returns {ResultError}
 */
export function errResult(error) {
  return { ok: false, error };
}
