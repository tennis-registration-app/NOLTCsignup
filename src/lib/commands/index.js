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

// Core commands
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

// Admin commands
export {
  RemoveFromWaitlistCommandSchema,
  buildRemoveFromWaitlistCommand,
  preflightRemoveFromWaitlist,
  toRemoveFromWaitlistPayload,
} from './removeFromWaitlist.js';

export {
  CreateBlockCommandSchema,
  buildCreateBlockCommand,
  preflightCreateBlock,
  toCreateBlockPayload,
} from './createBlock.js';

export {
  DeleteBlockCommandSchema,
  buildDeleteBlockCommand,
  preflightDeleteBlock,
  toDeleteBlockPayload,
} from './deleteBlock.js';

export {
  MoveCourtCommandSchema,
  buildMoveCourtCommand,
  preflightMoveCourt,
  toMoveCourtPayload,
} from './moveCourt.js';
