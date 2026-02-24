// @ts-check

import { AppError } from './AppError.js';
import { ErrorCategories } from './errorCategories.js';

/**
 * @typedef {import('./errorCategories.js').ErrorCategory} ErrorCategory
 */

/**
 * @typedef {Object} NormalizedError
 * @property {string} message - Human-readable message (same as original)
 * @property {ErrorCategory} category - Error category (preserved from AppError, UNKNOWN otherwise)
 * @property {string | null} code - Error code (preserved from AppError, null otherwise)
 * @property {* | null} details - Error details (preserved from AppError, null otherwise)
 * @property {boolean} isAppError - Whether the original error was an AppError
 */

/**
 * Extracts structured metadata from any caught error.
 * Works with AppError (preserves category/code), plain Error, or unknown values.
 *
 * Usage in orchestrators:
 *   catch (err) {
 *     const meta = normalizeError(err);
 *     toast(meta.message);  // same message as before
 *     // meta.category and meta.code available for future use
 *   }
 *
 * @param {unknown} err
 * @returns {NormalizedError}
 */
export function normalizeError(err) {
  if (err instanceof AppError) {
    return {
      message: err.message,
      category: err.category,
      code: err.code,
      details: err.details,
      isAppError: true,
    };
  }

  if (err instanceof Error) {
    return {
      message: err.message,
      category: ErrorCategories.UNKNOWN,
      code: null,
      details: null,
      isAppError: false,
    };
  }

  return {
    message: String(err) || 'An unexpected error occurred',
    category: ErrorCategories.UNKNOWN,
    code: null,
    details: null,
    isAppError: false,
  };
}
