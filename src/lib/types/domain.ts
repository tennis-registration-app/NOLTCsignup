/**
 * NOLTC Tennis Registration - Canonical Domain Types
 *
 * RULES:
 * - All times are ISO 8601 strings
 * - IDs use consistent naming: id, memberId, courtNumber
 * - Player container is always Group.players
 * - Derived fields computed in normalizeBoard()
 * - No snake_case in Domain - all camelCase
 */

export interface DomainMember {
  memberId: string;
  displayName: string;
  isGuest: boolean;
  name?: string;
}

export interface Group {
  id: string;
  players: DomainMember[];
  type: "singles" | "doubles";
}

export interface DomainSession {
  id: string;
  courtNumber: number;
  group: Group;
  startedAt: string;
  scheduledEndAt: string;
  actualEndAt: string | null;
  endReason: "completed" | "cleared_early" | "admin_override" | null;
  isOvertime: boolean;
  isTournament: boolean;
  participants?: DomainMember[];
}

export interface DomainBlock {
  id: string;
  courtNumber: number;
  startsAt: string;
  endsAt: string;
  reason: string;
  blockType?: string;
  isActive: boolean;
  title?: string;
}

export interface Court {
  id: string;
  number: number;
  isOccupied: boolean;
  isBlocked: boolean;
  isOvertime: boolean;
  isAvailable: boolean;
  isTournament: boolean;
  session: DomainSession | null;
  block: DomainBlock | null;
}

export interface DomainWaitlistEntry {
  id: string;
  position: number;
  group: Group;
  joinedAt: string;
  minutesWaiting: number;
  estimatedCourtTime: string | null;
  deferred: boolean;
  status?: string;
}

export interface Board {
  serverNow: string;
  courts: Court[];
  waitlist: DomainWaitlistEntry[];
  _raw?: object;
  operatingHours?: object[];
  upcomingBlocks?: Array<{
    id?: string;
    courtNumber: number;
    startTime: string;
    endTime: string;
    title: string;
    reason?: string;
    isActive: boolean;
  }>;
  blocks?: Array<{
    courtNumber: number;
    startTime: string;
    endTime: string;
    title: string;
    isActive: boolean;
  }>;
}

export type EndReason = "completed" | "cleared_early" | "admin_override";
export type WaitlistStatus = "waiting" | "assigned" | "cancelled";

export const END_REASONS = ["completed", "cleared_early", "admin_override"];
export const WAITLIST_STATUSES = ["waiting", "assigned", "cancelled"];
export const GROUP_TYPES = ["singles", "doubles"];
export const COURT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const SINGLES_ONLY_COURT_NUMBERS = [8];

export function isCourtEligibleForGroup(courtNumber: number, playerCount: number): boolean {
  if (SINGLES_ONLY_COURT_NUMBERS.includes(courtNumber) && playerCount >= 4) {
    return false;
  }
  return true;
}