/**
 * CreateBlockCommand — Request to block a court
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * CreateBlockCommand schema
 */
export const CreateBlockCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  courtId: z.string().min(1, 'courtId is required'),
  startsAt: z.string().min(1, 'startsAt is required'),
  endsAt: z.string().min(1, 'endsAt is required'),
  reason: z.string().min(1, 'reason is required'),
});

/**
 * @typedef {z.infer<typeof CreateBlockCommandSchema>} CreateBlockCommand
 */

/**
 * Build and validate a CreateBlockCommand
 * @param {Object} input - Raw input from UI
 * @returns {CreateBlockCommand}
 * @throws {Error} If validation fails
 */
export function buildCreateBlockCommand(input) {
  const result = CreateBlockCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = /** @type {any} */ (result.error).errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Invalid CreateBlockCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state
 * @param {CreateBlockCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightCreateBlock(command, board) {
  const errors = [];

  const court = board?.courts?.find((c) => c.id === command.courtId);
  if (!court) {
    errors.push('Court not found');
  }

  // Check time validity
  const startsAt = new Date(command.startsAt);
  const endsAt = new Date(command.endsAt);
  if (isNaN(startsAt.getTime())) {
    errors.push('Invalid start time');
  }
  if (isNaN(endsAt.getTime())) {
    errors.push('Invalid end time');
  }
  if (startsAt >= endsAt) {
    errors.push('End time must be after start time');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {CreateBlockCommand} command
 * @returns {Object}
 */
export function toCreateBlockPayload(command) {
  return {
    court_id: command.courtId,
    starts_at: command.startsAt,
    ends_at: command.endsAt,
    reason: command.reason,
  };
}
