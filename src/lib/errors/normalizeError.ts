import { AppError } from './AppError';
import { ErrorCategories, ErrorCategory } from './errorCategories';

export interface NormalizedError {
  message: string;
  category: ErrorCategory;
  code: string | null;
  details: unknown;
  isAppError: boolean;
}

/**
 * Extracts structured metadata from any caught error.
 * Works with AppError (preserves category/code), plain Error, or unknown values.
 */
export function normalizeError(err: unknown): NormalizedError {
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
