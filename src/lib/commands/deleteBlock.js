/**
 * DeleteBlockCommand — Request to delete a court block
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * DeleteBlockCommand schema
 */
export const DeleteBlockCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  blockId: z.string().min(1, 'blockId is required'),
});

/**
 * @typedef {z.infer<typeof DeleteBlockCommandSchema>} DeleteBlockCommand
 */

/**
 * Build and validate a DeleteBlockCommand
 * @param {Object} input - Raw input from UI
 * @returns {DeleteBlockCommand}
 * @throws {Error} If validation fails
 */
export function buildDeleteBlockCommand(input) {
  const result = DeleteBlockCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = /** @type {any} */ (result.error).errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Invalid DeleteBlockCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state
 * @param {DeleteBlockCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightDeleteBlock(command, board) {
  const errors = [];

  // Find the block across all courts
  let blockFound = false;
  for (const court of board?.courts || []) {
    if (court.block?.id === command.blockId) {
      blockFound = true;
      break;
    }
  }

  if (!blockFound) {
    errors.push('Block not found');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {DeleteBlockCommand} command
 * @returns {Object}
 */
export function toDeleteBlockPayload(command) {
  return {
    block_id: command.blockId,
  };
}
