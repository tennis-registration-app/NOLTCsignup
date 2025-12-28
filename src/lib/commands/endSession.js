/**
 * EndSessionCommand — Request to end a court session
 */

import { z } from 'zod';
import { END_REASONS } from '../types/domain.js';

const COMMAND_VERSION = '1.0';

/**
 * EndSessionCommand schema
 */
export const EndSessionCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  sessionId: z.string().min(1, 'sessionId is required'),
  endReason: z.enum(END_REASONS),
});

/**
 * @typedef {z.infer<typeof EndSessionCommandSchema>} EndSessionCommand
 */

/**
 * Build and validate an EndSessionCommand
 * @param {Object} input - Raw input from UI
 * @returns {EndSessionCommand}
 * @throws {Error} If validation fails
 */
export function buildEndSessionCommand(input) {
  const result = EndSessionCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid EndSessionCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state (optional, for UX)
 * @param {EndSessionCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightEndSession(command, board) {
  const errors = [];

  // Find the session
  const court = board?.courts?.find((c) => c.session?.id === command.sessionId);
  if (!court) {
    errors.push('Session not found');
  } else if (court.session?.actualEndAt) {
    errors.push('Session has already ended');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {EndSessionCommand} command
 * @returns {Object} - Payload for /end-session API
 */
export function toEndSessionPayload(command) {
  return {
    session_id: command.sessionId,
    end_reason: command.endReason,
  };
}
