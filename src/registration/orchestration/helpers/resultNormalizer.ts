/**
 * Result normalization utilities for standardizing success/failure envelopes.
 *
 * STATUS: Available but currently unused in production code.
 * Decision pending WP-ERROR-TAXONOMY-CHAIN — may be adopted by orchestrators
 * to unify error handling across thrown Error/AppError and returned {ok:false}
 * envelopes.
 *
 * If adopted: expand tests for the integration paths.
 * If not needed after error taxonomy work is complete: delete as dead code.
 *
 * These helpers produce result objects matching the Result/ResultError
 * typedefs in src/lib/types/result.js. Function signatures and return
 * shapes are unchanged from the original implementation.
 *
 * @see docs/ERROR_HANDLING.md for the full error propagation model.
 */

export interface Result<T = unknown> {
  ok: true;
  data: T;
}

export interface ResultError {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

export type ResultOrError<T = unknown> = Result<T> | ResultError;

/**
 * Create a success result.
 */
export function success(data: unknown = null): Result {
  return { ok: true, data };
}

/**
 * Create a failure result.
 */
export function failure(code: string, message: string, details?: unknown): ResultError {
  return { ok: false, error: { code, message, details } };
}

/**
 * Wrap an async function and normalize its result.
 * Success returns the function's resolved value as a Result.
 * Failure catches errors and returns a ResultError with UNEXPECTED_ERROR code.
 */
export async function wrapAsync(fn: () => Promise<unknown>): Promise<ResultOrError> {
  try {
    const data = await fn();
    return success(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return failure('UNEXPECTED_ERROR', message, err);
  }
}
