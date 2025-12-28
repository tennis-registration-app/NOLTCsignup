/**
 * JoinWaitlistCommand — Request to join the waitlist
 */

import { z } from 'zod';
import { GROUP_TYPES } from '../types/domain.js';
import { findEngagementByMemberId, getEngagementMessage } from '../domain/engagement.js';

const COMMAND_VERSION = '1.0';

/**
 * Player schema for command
 */
const PlayerSchema = z.object({
  memberId: z.string().min(1, 'memberId is required'),
  displayName: z.string().min(1, 'displayName is required'),
  isGuest: z.boolean(),
});

/**
 * JoinWaitlistCommand schema
 */
export const JoinWaitlistCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  players: z.array(PlayerSchema).min(1, 'At least one player required').max(4, 'Maximum 4 players'),
  groupType: z.enum(GROUP_TYPES),
});

/**
 * @typedef {z.infer<typeof JoinWaitlistCommandSchema>} JoinWaitlistCommand
 */

/**
 * Build and validate a JoinWaitlistCommand
 * @param {Object} input - Raw input from UI
 * @returns {JoinWaitlistCommand}
 * @throws {Error} If validation fails
 */
export function buildJoinWaitlistCommand(input) {
  const result = JoinWaitlistCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid JoinWaitlistCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state (optional, for UX)
 * @param {JoinWaitlistCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightJoinWaitlist(command, board) {
  const errors = [];

  // Check no players already engaged
  for (const player of command.players) {
    const engagement = findEngagementByMemberId(board, player.memberId);
    if (engagement) {
      errors.push(getEngagementMessage(engagement));
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Convert command to API payload
 * @param {JoinWaitlistCommand} command
 * @returns {Object} - Payload for /join-waitlist API
 */
export function toJoinWaitlistPayload(command) {
  return {
    players: command.players.map((p) => ({
      member_id: p.memberId,
      display_name: p.displayName,
      is_guest: p.isGuest,
    })),
    group_type: command.groupType,
  };
}
