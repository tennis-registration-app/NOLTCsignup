/**
 * ClearWaitlistCommand — Admin action to cancel all waiting entries
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * ClearWaitlistCommand schema
 */
export const ClearWaitlistCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  // No required fields - this is a batch operation
});

/**
 * @typedef {z.infer<typeof ClearWaitlistCommandSchema>} ClearWaitlistCommand
 */

/**
 * Build and validate a ClearWaitlistCommand
 * @param {Object} input - Raw input from UI
 * @returns {ClearWaitlistCommand}
 * @throws {Error} If validation fails
 */
export function buildClearWaitlistCommand(input = {}) {
  const result = ClearWaitlistCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid ClearWaitlistCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state
 * @param {ClearWaitlistCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightClearWaitlist(command, board) {
  const errors = [];

  const waitingCount = board?.waitlist?.filter((e) => e.status === 'waiting')?.length || 0;
  if (waitingCount === 0) {
    errors.push('Waitlist is already empty');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {ClearWaitlistCommand} command
 * @returns {Object}
 */
export function toClearWaitlistPayload(_command) {
  return {};
}
