/**
 * Domain Schemas
 *
 * STRICT validation of Domain objects (after normalization).
 * If these fail, it means the normalization layer has a bug.
 */

import { z } from 'zod';
import { END_REASONS, GROUP_TYPES, COURT_NUMBERS } from '../types/domain.js';

// Member schema
export const MemberSchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  isGuest: z.boolean(),
});

// Group schema
export const GroupSchema = z.object({
  id: z.string(),
  players: z.array(MemberSchema),
  type: z.enum(GROUP_TYPES),
});

// Session schema
export const SessionSchema = z.object({
  id: z.string(),
  courtNumber: z.number(),
  group: GroupSchema,
  startedAt: z.string(),
  scheduledEndAt: z.string(),
  actualEndAt: z.string().nullable(),
  endReason: z.enum(END_REASONS).nullable(),
  isOvertime: z.boolean(),
});

// Block schema
export const BlockSchema = z.object({
  id: z.string(),
  courtNumber: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string(),
  isActive: z.boolean(),
});

// Court schema
export const CourtSchema = z.object({
  id: z.string(), // Court UUID (for API commands)
  number: z.number().refine((n) => COURT_NUMBERS.includes(n), {
    message: 'Invalid court number',
  }),
  isOccupied: z.boolean(),
  isBlocked: z.boolean(),
  isOvertime: z.boolean(),
  isAvailable: z.boolean(),
  session: SessionSchema.nullable(),
  block: BlockSchema.nullable(),
});

// WaitlistEntry schema
export const WaitlistEntrySchema = z.object({
  id: z.string(),
  position: z.number(),
  group: GroupSchema,
  joinedAt: z.string(),
  minutesWaiting: z.number(),
  estimatedCourtTime: z.string().nullable(),
});

// Board schema (complete state)
export const BoardSchema = z.object({
  serverNow: z.string(),
  courts: z.array(CourtSchema),
  waitlist: z.array(WaitlistEntrySchema),
});

/**
 * Validate a Domain Board object
 * @param {Object} board - Normalized board
 * @returns {{ success: boolean, data?: import('../types/domain.js').Board, error?: z.ZodError }}
 */
export function validateBoard(board) {
  const result = BoardSchema.safeParse(board);
  if (!result.success) {
    console.error('[validateBoard] Domain validation failed:', result.error.format());
    console.error('[validateBoard] This indicates a bug in the normalization layer');
  }
  return result;
}

/**
 * Validate and throw if invalid (for strict enforcement)
 * @param {Object} board - Normalized board
 * @returns {import('../types/domain.js').Board}
 * @throws {Error} If validation fails
 */
export function assertValidBoard(board) {
  const result = BoardSchema.safeParse(board);
  if (!result.success) {
    console.error('[assertValidBoard] Validation errors:', result.error.format());
    throw new Error('Invalid Board domain object: ' + result.error.message);
  }
  return result.data;
}
