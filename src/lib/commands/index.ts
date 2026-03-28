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
} from './assignCourt';

export {
  EndSessionCommandSchema,
  buildEndSessionCommand,
  preflightEndSession,
  toEndSessionPayload,
} from './endSession';

export {
  JoinWaitlistCommandSchema,
  buildJoinWaitlistCommand,
  preflightJoinWaitlist,
  toJoinWaitlistPayload,
} from './joinWaitlist';

// Admin commands
export {
  RemoveFromWaitlistCommandSchema,
  buildRemoveFromWaitlistCommand,
  preflightRemoveFromWaitlist,
  toRemoveFromWaitlistPayload,
} from './removeFromWaitlist';

export {
  CreateBlockCommandSchema,
  buildCreateBlockCommand,
  preflightCreateBlock,
  toCreateBlockPayload,
} from './createBlock';

export {
  DeleteBlockCommandSchema,
  buildDeleteBlockCommand,
  preflightDeleteBlock,
  toDeleteBlockPayload,
} from './deleteBlock';

export {
  MoveCourtCommandSchema,
  buildMoveCourtCommand,
  preflightMoveCourt,
  toMoveCourtPayload,
} from './moveCourt';

export {
  ClearWaitlistCommandSchema,
  buildClearWaitlistCommand,
  preflightClearWaitlist,
  toClearWaitlistPayload,
} from './clearWaitlist';

export {
  AssignFromWaitlistCommandSchema,
  buildAssignFromWaitlistCommand,
  preflightAssignFromWaitlist,
  toAssignFromWaitlistPayload,
} from './assignFromWaitlist';

export {
  PurchaseBallsCommandSchema,
  buildPurchaseBallsCommand,
  toPurchaseBallsPayload,
} from './purchaseBalls';

export {
  DeferWaitlistCommandSchema,
  buildDeferWaitlistCommand,
  preflightDeferWaitlist,
  toDeferWaitlistPayload,
} from './deferWaitlist';
