// @ts-check
/**
 * API Envelope Schemas
 *
 * These validate the raw API response structure.
 * Moderate strictness — catches wrong shape, missing keys.
 * Nested payloads are loosely typed (tightened via Domain validation after normalization).
 */

import { z } from 'zod';

// Board API response envelope
export const BoardResponseSchema = z
  .object({
    ok: z.boolean().optional().default(true),
    serverNow: z.string(),
    courts: z.array(z.any()), // Loose — validated after normalization
    waitlist: z.array(z.any()).optional().default([]),
  })
  .passthrough();

// Generic API response envelope
export const ApiResponseSchema = z
  .object({
    ok: z.boolean(),
    serverNow: z.string().optional(),
    error: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

/**
 * Validate board API response
 * @param {Object} raw - Raw API response
 * @returns {{ success: boolean, data?: Object, error?: z.ZodError }}
 */
export function validateBoardResponse(raw) {
  const result = BoardResponseSchema.safeParse(raw);
  if (!result.success) {
    console.error('[validateBoardResponse] Invalid API envelope:', result.error.format());
  }
  return result;
}
