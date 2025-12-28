/**
 * MoveCourtCommand — Request to move a session from one court to another
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * MoveCourtCommand schema
 */
export const MoveCourtCommandSchema = z
  .object({
    commandVersion: z.string().default(COMMAND_VERSION),
    fromCourtId: z.string().min(1, 'fromCourtId is required'),
    toCourtId: z.string().min(1, 'toCourtId is required'),
  })
  .refine((data) => data.fromCourtId !== data.toCourtId, {
    message: 'Source and destination courts must be different',
  });

/**
 * @typedef {z.infer<typeof MoveCourtCommandSchema>} MoveCourtCommand
 */

/**
 * Build and validate a MoveCourtCommand
 * @param {Object} input - Raw input from UI
 * @returns {MoveCourtCommand}
 * @throws {Error} If validation fails
 */
export function buildMoveCourtCommand(input) {
  const result = MoveCourtCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid MoveCourtCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state
 * @param {MoveCourtCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightMoveCourt(command, board) {
  const errors = [];

  const fromCourt = board?.courts?.find((c) => c.id === command.fromCourtId);
  const toCourt = board?.courts?.find((c) => c.id === command.toCourtId);

  if (!fromCourt) {
    errors.push('Source court not found');
  } else if (!fromCourt.session) {
    errors.push('Source court has no active session');
  }

  if (!toCourt) {
    errors.push('Destination court not found');
  } else if (!toCourt.isAvailable) {
    if (toCourt.isOccupied) {
      errors.push(`Court ${toCourt.number} is occupied`);
    } else if (toCourt.isBlocked) {
      errors.push(`Court ${toCourt.number} is blocked`);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {MoveCourtCommand} command
 * @returns {Object} - Payload for /move-court API
 */
export function toMoveCourtPayload(command) {
  return {
    from_court_id: command.fromCourtId,
    to_court_id: command.toCourtId,
  };
}
