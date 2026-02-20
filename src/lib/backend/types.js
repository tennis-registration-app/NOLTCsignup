/**
 * @fileoverview Type definitions for TennisBackend
 *
 * These JSDoc types define the interface between the UI and backend.
 * All communication goes through this layer.
 *
 * IMPORTANT: The UI must use these types exclusively.
 * Any legacy wire format mapping happens in TennisCommands/wire.js, not here.
 */

// === Participant Input ===

/**
 * @typedef {Object} MemberParticipant
 * @property {'member'} kind
 * @property {string} memberId - UUID from members table
 * @property {string} accountId - UUID from accounts table
 */

/**
 * @typedef {Object} GuestParticipant
 * @property {'guest'} kind
 * @property {string} guestName
 * @property {string} accountId - UUID of account to charge
 * @property {string} [chargedToAccountId] - UUID of account to charge guest fee to (defaults to accountId)
 */

/** @typedef {MemberParticipant | GuestParticipant} ParticipantInput */

// === Command Inputs ===

/**
 * @typedef {Object} AssignCourtInput
 * @property {string} courtId - UUID of the court
 * @property {ParticipantInput[]} participants
 * @property {'singles' | 'doubles'} groupType
 * @property {boolean} [addBalls]
 * @property {boolean} [splitBalls]
 * @property {number} [latitude] - GPS latitude for geofence validation
 * @property {number} [longitude] - GPS longitude for geofence validation
 * @property {number} [accuracy] - GPS accuracy in meters
 * @property {string} [location_token] - QR-based location verification token
 */

/**
 * @typedef {Object} EndSessionInput
 * @property {string} courtId - UUID of the court
 * @property {string} [reason] - 'normal', 'admin_override', 'no_show'
 * @property {string} [endReason] - Legacy alias for reason
 * @property {string} [sessionId] - Session UUID (for command validation)
 */

/**
 * @typedef {Object} JoinWaitlistInput
 * @property {ParticipantInput[]} participants
 * @property {string} [billingMemberId]
 * @property {'singles' | 'doubles'} groupType
 * @property {number} [latitude] - GPS latitude for geofence validation
 * @property {number} [longitude] - GPS longitude for geofence validation
 * @property {number} [accuracy] - GPS accuracy in meters
 * @property {string} [location_token] - QR-based location verification token
 * @property {boolean} [deferred] - Wait for Full Time flow
 */

/**
 * @typedef {Object} CancelWaitlistInput
 * @property {string} entryId
 * @property {string} [reason] - Cancellation reason
 */

/**
 * @typedef {Object} DeferWaitlistInput
 * @property {string} entryId
 * @property {boolean} deferred
 */

/**
 * @typedef {Object} AssignFromWaitlistInput
 * @property {string} waitlistEntryId
 * @property {string} courtId - UUID of the court
 * @property {number} [latitude] - GPS latitude for geofence validation
 * @property {number} [longitude] - GPS longitude for geofence validation
 * @property {number} [accuracy] - GPS accuracy in meters
 * @property {string} [location_token] - QR-based location verification token
 */

/**
 * @typedef {Object} CreateBlockInput
 * @property {string} courtId - UUID of the court
 * @property {string} reason
 * @property {string} [startTime] - ISO timestamp
 * @property {string} [endTime] - ISO timestamp
 * @property {string} [blockType] - Block type enum (maintenance, lesson, etc.)
 */

/**
 * @typedef {Object} CancelBlockInput
 * @property {string} blockId
 */

/**
 * @typedef {Object} PurchaseBallsInput
 * @property {string} sessionId - UUID of the session
 * @property {string} accountId - UUID of the account to charge
 * @property {boolean} [splitBalls] - Whether to split across players
 * @property {string[]} [splitAccountIds] - Account IDs for split billing
 * @property {string} [idempotencyKey] - Idempotency key for dedup
 */

/**
 * @typedef {Object} MoveCourtInput
 * @property {string} fromCourtId - UUID of source court
 * @property {string} toCourtId - UUID of destination court
 */

// === Read Models ===

/**
 * @typedef {Object} Participant
 * @property {string} memberId
 * @property {string} displayName
 * @property {boolean} isGuest
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {number} courtNumber
 * @property {Participant[]} participants
 * @property {'singles' | 'doubles'} groupType
 * @property {string} startedAt - ISO timestamp
 * @property {string} scheduledEndAt - ISO timestamp
 * @property {number} minutesRemaining
 * @property {Object} [group] - Group with players (from domain normalization)
 * @property {boolean} [isTournament] - True if tournament match
 */

/**
 * @typedef {Object} Block
 * @property {string} id
 * @property {number} courtNumber
 * @property {string} reason
 * @property {string} [endTime] - ISO timestamp
 * @property {string} [startTime] - ISO timestamp
 * @property {string} [title] - Display title
 * @property {string} [startsAt] - ISO timestamp (domain alias)
 * @property {string} [endsAt] - ISO timestamp (domain alias)
 */

/**
 * @typedef {Object} CourtState
 * @property {string} id - UUID of the court
 * @property {number} number - Court number (1-12)
 * @property {'available' | 'occupied' | 'overtime' | 'blocked'} status
 * @property {Session | null} session
 * @property {Block | null} block
 */

/**
 * @typedef {Object} WaitlistEntry
 * @property {string} id
 * @property {number} position
 * @property {Participant[]} participants
 * @property {'singles' | 'doubles'} groupType
 * @property {string} joinedAt - ISO timestamp
 * @property {number} minutesWaiting
 * @property {Object} [group] - Group with players (from domain normalization)
 * @property {boolean} [deferred] - True if deferred
 */

/**
 * @typedef {Object} OperatingHoursEntry
 * @property {number} dayOfWeek - 0-6 (Sunday = 0)
 * @property {string} opensAt - "HH:MM:SS"
 * @property {string} closesAt - "HH:MM:SS"
 */

/**
 * @typedef {Object} BoardState
 * @property {string} serverNow - ISO timestamp
 * @property {CourtState[]} courts
 * @property {WaitlistEntry[]} waitlist
 * @property {OperatingHoursEntry[]} operatingHours
 * @property {Array<Object>} [upcomingBlocks] - Future blocks for today
 */

/**
 * @typedef {Object} Member
 * @property {string} id - UUID
 * @property {string} accountId - UUID
 * @property {string} memberNumber - e.g., "1001"
 * @property {string} displayName
 * @property {boolean} isPrimary
 * @property {number} [unclearedStreak] - Consecutive uncleared session count
 */

// === Response Types ===

/**
 * @typedef {Object} SuccessResponse
 * @property {true} ok
 * @property {string} serverNow
 */

/**
 * @typedef {Object} DenialResponse
 * @property {false} ok
 * @property {string} code - Machine-readable denial code
 * @property {string} message - Human-readable message
 * @property {string} serverNow
 */

/** @typedef {SuccessResponse | DenialResponse} CommandResponse */

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
};

export default {};
