/**
 * Command DTOs — Write path contracts
 *
 * Commands define the allowed requests to mutate state.
 * Each command has:
 * - Schema (Zod validation)
 * - Builder (validate + normalize)
 * - Preflight (optional board-dependent checks)
 * - toPayload (convert to API format)
 */

export {
  AssignCourtCommandSchema,
  buildAssignCourtCommand,
  preflightAssignCourt,
  toAssignCourtPayload,
} from './assignCourt.js';

export {
  EndSessionCommandSchema,
  buildEndSessionCommand,
  preflightEndSession,
  toEndSessionPayload,
} from './endSession.js';

export {
  JoinWaitlistCommandSchema,
  buildJoinWaitlistCommand,
  preflightJoinWaitlist,
  toJoinWaitlistPayload,
} from './joinWaitlist.js';
