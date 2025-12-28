/**
 * Validation Schemas
 *
 * Two-layer validation:
 * 1. API Envelope — validates raw API response structure
 * 2. Domain — validates normalized Domain objects (strict)
 */

export { BoardResponseSchema, ApiResponseSchema, validateBoardResponse } from './apiEnvelope.js';

export {
  MemberSchema,
  GroupSchema,
  SessionSchema,
  BlockSchema,
  CourtSchema,
  WaitlistEntrySchema,
  BoardSchema,
  validateBoard,
  assertValidBoard,
} from './domain.js';
