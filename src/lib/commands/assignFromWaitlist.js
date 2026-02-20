/**
 * AssignFromWaitlistCommand — Assign a waitlist entry to a court
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * AssignFromWaitlistCommand schema
 */
export const AssignFromWaitlistCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  waitlistEntryId: z.string().min(1, 'waitlistEntryId is required'),
  courtId: z.string().min(1, 'courtId is required'),
});

/**
 * @typedef {z.infer<typeof AssignFromWaitlistCommandSchema>} AssignFromWaitlistCommand
 */

/**
 * Build and validate an AssignFromWaitlistCommand
 * @param {Object} input - Raw input from UI
 * @returns {AssignFromWaitlistCommand}
 * @throws {Error} If validation fails
 */
export function buildAssignFromWaitlistCommand(input) {
  const result = AssignFromWaitlistCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = /** @type {any} */ (result.error).errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Invalid AssignFromWaitlistCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state
 * @param {AssignFromWaitlistCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightAssignFromWaitlist(command, board) {
  const errors = [];

  // Check waitlist entry exists
  const entry = board?.waitlist?.find((e) => e.id === command.waitlistEntryId);
  if (!entry) {
    errors.push('Waitlist entry not found');
  } else if (entry.status !== 'waiting') {
    errors.push('Waitlist entry is no longer waiting');
  }

  // Check court is available
  const court = board?.courts?.find((c) => c.id === command.courtId);
  if (!court) {
    errors.push('Court not found');
  } else if (!court.isAvailable) {
    errors.push(`Court ${court.number} is not available`);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {AssignFromWaitlistCommand} command
 * @returns {Object}
 */
export function toAssignFromWaitlistPayload(command) {
  return {
    waitlist_id: command.waitlistEntryId,
    court_id: command.courtId,
  };
}
