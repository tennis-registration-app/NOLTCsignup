export interface Result<T> {
  ok: true;
  data: T;
}

export interface ResultError {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

export type ResultOrError<T> = Result<T> | ResultError;

export function okResult<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function errResult(error: { code: string; message: string; details?: unknown }): ResultError {
  return { ok: false, error };
}
