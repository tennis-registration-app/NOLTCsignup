/**
 * AssignCourtCommand — Request to assign a group to a court
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
 * AssignCourtCommand schema
 */
export const AssignCourtCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  courtId: z.string().min(1, 'courtId is required'),
  players: z.array(PlayerSchema).min(1, 'At least one player required').max(4, 'Maximum 4 players'),
  groupType: z.enum(GROUP_TYPES),
  durationMinutes: z.number().int().min(30).max(120).default(60),
});

/**
 * @typedef {z.infer<typeof AssignCourtCommandSchema>} AssignCourtCommand
 */

/**
 * Build and validate an AssignCourtCommand
 * @param {Object} input - Raw input from UI
 * @returns {AssignCourtCommand}
 * @throws {Error} If validation fails
 */
export function buildAssignCourtCommand(input) {
  const result = AssignCourtCommandSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid AssignCourtCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Preflight checks using current board state (optional, for UX)
 * @param {AssignCourtCommand} command
 * @param {import('../types/domain.js').Board} board
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function preflightAssignCourt(command, board) {
  const errors = [];

  // Check court exists and is available
  const court = board?.courts?.find((c) => c.id === command.courtId);
  if (!court) {
    errors.push(`Court not found`);
  } else if (!court.isAvailable) {
    if (court.isOccupied) {
      errors.push(`Court ${court.number} is occupied`);
    } else if (court.isBlocked) {
      errors.push(`Court ${court.number} is blocked`);
    } else {
      errors.push(`Court ${court.number} is not available`);
    }
  }

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
 * Convert command to API payload (camelCase → snake_case)
 * @param {AssignCourtCommand} command
 * @returns {Object} - Payload for /assign-court API
 */
export function toAssignCourtPayload(command) {
  return {
    court_id: command.courtId,
    players: command.players.map((p) => ({
      member_id: p.memberId,
      display_name: p.displayName,
      is_guest: p.isGuest,
    })),
    group_type: command.groupType,
    duration_minutes: command.durationMinutes,
  };
}
