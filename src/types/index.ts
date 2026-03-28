/**
 * src/types/index.ts -- shared type re-exports
 *
 * All domain types live in appTypes.ts.
 * This module re-exports them under canonical names and adds
 * types used across 3+ files that do not exist elsewhere.
 */

// Re-export everything from the canonical type file
export type {
  // Utility
  Setter,

  // Config / Services
  RegistrationConstants,
  ApiConfig,
  TennisConfig,
  TennisBackendShape,
  DataStoreShape,
  TennisBusinessLogicShape,

  // App state
  AppState,
  Handlers,

  // Domain entities
  DomainMember,
  DomainGroup,
  DomainSession,
  DomainBlock,
  DomainCourt,
  DomainWaitlistEntry,
  DomainBoard,
  BoardBlock,
  UpcomingBlock,
  OperatingHoursEntry,
  GroupPlayer,
  DisplacementInfo,
  ReplacedGroup,
  OriginalCourtData,
  CourtDataMutable,
  CourtSelectionResult,
  SelectableCourt,
  WaitlistEntrySummary,
  FrequentPartner,
  AutocompleteSuggestion,
  MemberDatabaseEntry,
  ApiMember,
  CourtBlockStatusResult,

  // Orchestrator deps
  AssignCourtDeps,
  WaitlistDeps,
  SuggestionClickDeps,
  AddPlayerSuggestionClickDeps,
  CourtChangeDeps,
  ResetFormDeps,
} from "./appTypes.js";

// ============================================================
// Types added in Phase 1 (not yet in appTypes.ts)
// ============================================================

/**
 * Raw API response envelope -- shape returned by all Edge Functions
 * before domain normalization.
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  code?: string;
  message?: string;
  serverNow?: string;
  data?: T;
  board?: unknown;
  error?: string;
}

/**
 * Club member account (billing/family unit).
 * Evidence: TennisDirectory / getMembersByAccount responses.
 */
export interface Account {
  id: string;
  member_number: string;
  account_name: string;
  status: string;
}

/**
 * Raw member record from the directory service.
 * Maps to ApiMember after normalization.
 * Evidence: TennisDirectory.js, normalizeMember.js
 */
export interface Member {
  id: string;
  account_id: string;
  display_name: string;
  is_primary: boolean;
  status: string;
  member_number: string;
  plays_180d?: number;
}

/**
 * Raw court record from the database / API (snake_case).
 * Maps to DomainCourt after normalization.
 * Evidence: normalizeCourt.js
 */
export interface Court {
  id: string;
  court_number: number;
  court_name?: string;
  status: "available" | "occupied" | "overtime" | "blocked";
  session_id?: string;
  started_at?: string;
  scheduled_end_at?: string;
  session_type?: string;
  participants?: unknown[];
  block_id?: string;
  block_type?: string;
  block_title?: string;
  block_starts_at?: string;
  block_ends_at?: string;
}

/**
 * Raw block record from the database / API (snake_case).
 * Maps to DomainBlock after normalization.
 * Evidence: normalizeBlock.js, AdminCommands.js
 */
export interface Block {
  id: string;
  court_id: string;
  block_type: string;
  title: string;
  starts_at: string;
  ends_at: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  recurrence_group_id?: string;
  cancelled_at?: string | null;
}

/**
 * Raw session record from the database / API (snake_case).
 * Maps to DomainSession after normalization.
 * Evidence: normalizeSession.js
 */
export interface Session {
  id: string;
  court_id: string;
  started_at: string;
  scheduled_end_at: string;
  actual_end_at?: string | null;
  session_type?: string;
  participants?: unknown[];
}

/**
 * Recurrence configuration for block creation.
 * Evidence: expandRecurrenceDates.js, useBlockFormState.js
 */
export interface Recurrence {
  pattern: "daily" | "weekly" | "monthly";
  frequency: number;
  daysOfWeek?: number[];
  endType: "after" | "date" | "never";
  occurrences?: number;
  endDate?: Date | string | null;
}

/**
 * Normalized board court as returned by the get-board Edge Function.
 * Evidence: normalizeBoard.js, boardApi.js
 */
export interface BoardCourt {
  id: string;
  number: number;
  status: "available" | "occupied" | "overtime" | "blocked";
  isOccupied: boolean;
  isBlocked: boolean;
  isOvertime: boolean;
  isAvailable: boolean;
  isTournament: boolean;
  session: import("./appTypes.js").DomainSession | null;
  block: import("./appTypes.js").DomainBlock | null;
}
