// @ts-check

/**
 * @typedef {import('./errorCategories.js').ErrorCategory} ErrorCategory
 */

/**
 * Application error with category and code metadata.
 *
 * Extends Error for backwards compatibility — callers catching Error still work.
 * Adds structured metadata (category, code, details) for programmatic handling.
 *
 * @example
 * throw new AppError({
 *   category: 'NETWORK',
 *   code: 'FETCH_FAILED',
 *   message: 'Failed to reach server',
 * });
 *
 * @example
 * try {
 *   await fetchData();
 * } catch (e) {
 *   // Works with both Error and AppError catches
 *   if (e instanceof AppError) {
 *     console.log(e.category, e.code);
 *   }
 * }
 */
export class AppError extends Error {
  /**
   * @param {{
   *   category: ErrorCategory,
   *   code: string,
   *   message: string,
   *   details?: *
   * }} opts
   */
  constructor({ category, code, message, details }) {
    super(message);

    /** @type {string} */
    this.name = 'AppError';

    /** @type {ErrorCategory} */
    this.category = category;

    /** @type {string} */
    this.code = code;

    /** @type {*} */
    this.details = details;

    // Preserve prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace (V8/Node — optional chaining for browser safety)
    /** @type {*} */
    const ErrorWithStackTrace = Error;
    if (typeof ErrorWithStackTrace.captureStackTrace === 'function') {
      ErrorWithStackTrace.captureStackTrace(this, AppError);
    }
  }
}
