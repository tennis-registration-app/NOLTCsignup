/**
 * @fileoverview Type definitions for TennisBackend
 *
 * These types define the interface between the UI and backend.
 * All communication goes through this layer.
 *
 * IMPORTANT: The UI must use these types exclusively.
 * Any legacy wire format mapping happens in TennisCommands/wire.ts, not here.
 */

// === Participant Input ===

export interface MemberParticipant {
  kind: 'member';
  memberId: string;
  accountId: string;
}

export interface GuestParticipant {
  kind: 'guest';
  guestName: string;
  accountId: string;
  chargedToAccountId?: string;
}

export type ParticipantInput = MemberParticipant | GuestParticipant;

// === Command Inputs ===

export interface AssignCourtInput {
  courtId: string;
  participants: ParticipantInput[];
  groupType: 'singles' | 'doubles';
  addBalls?: boolean;
  splitBalls?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  location_token?: string;
}

export interface EndSessionInput {
  courtId: string;
  reason?: string;
  endReason?: string;
  sessionId?: string;
}

export interface JoinWaitlistInput {
  participants: ParticipantInput[];
  billingMemberId?: string;
  groupType: 'singles' | 'doubles';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  location_token?: string;
  deferred?: boolean;
}

export interface CancelWaitlistInput {
  entryId: string;
  reason?: string;
}

export interface DeferWaitlistInput {
  entryId: string;
  deferred: boolean;
}

export interface AssignFromWaitlistInput {
  waitlistEntryId: string;
  courtId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  location_token?: string;
}

export interface CreateBlockInput {
  courtId: string;
  reason: string;
  startTime?: string;
  endTime?: string;
  blockType?: string;
}

export interface CancelBlockInput {
  blockId: string;
}

export interface PurchaseBallsInput {
  sessionId: string;
  accountId: string;
  splitBalls?: boolean;
  splitAccountIds?: string[] | null;
  idempotencyKey?: string;
}

export interface MoveCourtInput {
  fromCourtId: string;
  toCourtId: string;
}

// === Read Models ===

export interface Participant {
  memberId: string;
  displayName: string;
  isGuest: boolean;
}

export interface BackendSession {
  id: string;
  courtNumber: number;
  participants: Participant[];
  groupType: 'singles' | 'doubles';
  startedAt: string;
  scheduledEndAt: string;
  minutesRemaining: number;
  group?: object;
  isTournament?: boolean;
}

export interface BackendBlock {
  id: string;
  courtNumber: number;
  reason: string;
  endTime?: string;
  startTime?: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface CourtState {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'overtime' | 'blocked';
  session: BackendSession | null;
  block: BackendBlock | null;
}

export interface WaitlistEntry {
  id: string;
  position: number;
  participants: Participant[];
  groupType: 'singles' | 'doubles';
  joinedAt: string;
  minutesWaiting: number;
  group?: object;
  deferred?: boolean;
}

export interface OperatingHoursEntry {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface BoardState {
  serverNow: string;
  courts: CourtState[];
  waitlist: WaitlistEntry[];
  operatingHours: OperatingHoursEntry[];
  upcomingBlocks?: object[];
}

export interface BackendMember {
  id: string;
  accountId: string;
  memberNumber: string;
  displayName: string;
  isPrimary: boolean;
  unclearedStreak?: number;
  playCount?: number;
}

// === Response Types ===

export interface SuccessResponse {
  ok: true;
  serverNow: string;
}

export interface DenialResponse {
  ok: false;
  code: string;
  message: string;
  serverNow: string;
}

export type CommandResponse = SuccessResponse | DenialResponse;

// === Denial Codes ===

export const DenialCodes = {
  COURT_OCCUPIED: 'COURT_OCCUPIED',
  COURT_BLOCKED: 'COURT_BLOCKED',
  COURT_NOT_FOUND: 'COURT_NOT_FOUND',
  MEMBER_ALREADY_PLAYING: 'MEMBER_ALREADY_PLAYING',
  MEMBER_ON_WAITLIST: 'MEMBER_ON_WAITLIST',
  OUTSIDE_OPERATING_HOURS: 'OUTSIDE_OPERATING_HOURS',
  OUTSIDE_GEOFENCE: 'OUTSIDE_GEOFENCE',
  INVALID_MEMBER: 'INVALID_MEMBER',
  INVALID_REQUEST: 'INVALID_REQUEST',
  WAITLIST_ENTRY_NOT_FOUND: 'WAITLIST_ENTRY_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_ALREADY_ENDED: 'SESSION_ALREADY_ENDED',
  QUERY_ERROR: 'QUERY_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type DenialCode = typeof DenialCodes[keyof typeof DenialCodes];

export default {};
