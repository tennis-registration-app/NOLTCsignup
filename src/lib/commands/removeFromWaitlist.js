/**
 * RemoveFromWaitlistCommand — Request to remove a group from waitlist
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * RemoveFromWaitlistCommand schema
 */
export const RemoveFromWaitlistCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  waitlistEntryId: z.string().min(1, 'waitlistEntryId is required'),
  reason: z.string().optional().default('admin_removed'),
});

/**
 * @typedef {z.infer<typeof RemoveFromWaitlistCommandSchema>} RemoveFromWaitlistCommand
 */

/**
 * Build and validate a RemoveFromWaitlistCommand
 * @param {Object} input - Raw input from UI
 * @returns {RemoveFromWaitlistCommand}
 * @throws {Error} If validation fails
 */
export function buildRemoveFromWaitlistCommand(input) {
  const result = RemoveFromWaitlistCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid RemoveFromWaitlistCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state
 * @param {RemoveFromWaitlistCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightRemoveFromWaitlist(command, board) {
  const errors = [];

  const entry = board?.waitlist?.find((e) => e.id === command.waitlistEntryId);
  if (!entry) {
    errors.push('Waitlist entry not found');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {RemoveFromWaitlistCommand} command
 * @returns {Object}
 */
export function toRemoveFromWaitlistPayload(command) {
  return {
    waitlist_entry_id: command.waitlistEntryId,
    reason: command.reason,
  };
}
