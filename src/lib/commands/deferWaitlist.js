/**
 * DeferWaitlistCommand — Toggle deferred flag on a waitlist entry
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * DeferWaitlistCommand schema
 */
export const DeferWaitlistCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  waitlistEntryId: z.string().min(1, 'waitlistEntryId is required'),
  deferred: z.boolean(),
});

/**
 * @typedef {z.infer<typeof DeferWaitlistCommandSchema>} DeferWaitlistCommand
 */

/**
 * Build and validate a DeferWaitlistCommand
 * @param {Object} input - Raw input from UI
 * @returns {DeferWaitlistCommand}
 * @throws {Error} If validation fails
 */
export function buildDeferWaitlistCommand(input) {
  const result = DeferWaitlistCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = /** @type {any} */ (result.error).errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Invalid DeferWaitlistCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state
 * @param {DeferWaitlistCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightDeferWaitlist(command, board) {
  const errors = [];

  const entry = board?.waitlist?.find((e) => e.id === command.waitlistEntryId);
  if (!entry) {
    errors.push('Waitlist entry not found');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {DeferWaitlistCommand} command
 * @returns {Object}
 */
export function toDeferWaitlistPayload(command) {
  return {
    waitlist_id: command.waitlistEntryId,
    deferred: command.deferred,
  };
}
