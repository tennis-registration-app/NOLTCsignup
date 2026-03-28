import { ErrorCategory } from './errorCategories';

interface AppErrorOptions {
  category: ErrorCategory;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Application error with category and code metadata.
 *
 * Extends Error for backwards compatibility — callers catching Error still work.
 * Adds structured metadata (category, code, details) for programmatic handling.
 */
export class AppError extends Error {
  name: string;
  category: ErrorCategory;
  code: string;
  details: unknown;

  constructor({ category, code, message, details }: AppErrorOptions) {
    super(message);

    this.name = 'AppError';
    this.category = category;
    this.code = code;
    this.details = details;

    // Preserve prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace (V8/Node — optional chaining for browser safety)
    const ErrorWithStackTrace = Error as typeof Error & { captureStackTrace?: (target: Error, constructor: unknown) => void };
    if (typeof ErrorWithStackTrace.captureStackTrace === 'function') {
      ErrorWithStackTrace.captureStackTrace(this, AppError);
    }
  }
}
