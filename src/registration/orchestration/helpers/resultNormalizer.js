/**
 * Standard orchestrator result shapes (for future use)
 * NOTE: WP5.5 does NOT require orchestrators to use these yet.
 * They exist as helpers for optional boundary normalization.
 *
 * @typedef {{ ok: true, data: * }} OrchestratorSuccess
 * @typedef {{ ok: false, error: { code: string, message: string, details?: * } }} OrchestratorError
 * @typedef {OrchestratorSuccess | OrchestratorError} OrchestratorResult
 */

export function success(data = null) {
  return { ok: true, data };
}

export function failure(code, message, details = undefined) {
  return { ok: false, error: { code, message, details } };
}

/**
 * Wrap an async operation with standard result shape.
 * Use at boundaries only; do not force on internal orchestrator logic.
 */
export async function wrapAsync(fn) {
  try {
    const data = await fn();
    return success(data);
  } catch (err) {
    return failure('UNEXPECTED_ERROR', err.message, err);
  }
}
