/**
 * Standard orchestrator result shapes.
 *
 * These helpers produce result objects matching the Result/ResultError
 * typedefs in src/lib/types/result.js. Function signatures and return
 * shapes are unchanged from the original implementation.
 */

export interface Result<T = any> {
  ok: true;
  data: T;
}

export interface ResultError {
  ok: false;
  error: { code: string; message: string; details?: any };
}

export type ResultOrError<T = any> = Result<T> | ResultError;

/**
 * Create a success result.
 */
export function success(data: any = null): Result {
  return { ok: true, data };
}

/**
 * Create a failure result.
 */
export function failure(code: string, message: string, details?: any): ResultError {
  return { ok: false, error: { code, message, details } };
}

/**
 * Wrap an async function and normalize its result.
 * Success returns the function's resolved value as a Result.
 * Failure catches errors and returns a ResultError with UNEXPECTED_ERROR code.
 */
export async function wrapAsync(fn: () => Promise<any>): Promise<ResultOrError> {
  try {
    const data = await fn();
    return success(data);
  } catch (err: any) {
    // Cast to any to preserve exact behavior — err.message may be undefined
    // for non-Error throws, and that's the existing contract.
    return failure('UNEXPECTED_ERROR', err.message, err);
  }
}
