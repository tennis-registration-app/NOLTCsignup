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
 */

/**
 * @typedef {Object} GuestParticipant
 * @property {'guest'} kind
 * @property {string} guestName
 */

/** @typedef {MemberParticipant | GuestParticipant} ParticipantInput */

// === Command Inputs ===

/**
 * @typedef {Object} AssignCourtInput
 * @property {number} courtNumber
 * @property {ParticipantInput[]} participants
 * @property {string} billingMemberId - UUID of member responsible for charges
 * @property {'singles' | 'doubles'} groupType
 * @property {boolean} [addBalls]
 * @property {boolean} [splitBalls]
 */

/**
 * @typedef {Object} EndSessionInput
 * @property {number} courtNumber
 * @property {string} [reason] - 'normal', 'admin_override', 'no_show'
 */

/**
 * @typedef {Object} JoinWaitlistInput
 * @property {ParticipantInput[]} participants
 * @property {string} billingMemberId
 * @property {'singles' | 'doubles'} groupType
 */

/**
 * @typedef {Object} CancelWaitlistInput
 * @property {string} entryId
 */

/**
 * @typedef {Object} AssignFromWaitlistInput
 * @property {string} waitlistEntryId
 * @property {number} courtNumber
 */

/**
 * @typedef {Object} CreateBlockInput
 * @property {number} courtNumber
 * @property {string} reason
 * @property {string} [startTime] - ISO timestamp
 * @property {string} [endTime] - ISO timestamp
 */

/**
 * @typedef {Object} CancelBlockInput
 * @property {string} blockId
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
 */

/**
 * @typedef {Object} Block
 * @property {string} id
 * @property {number} courtNumber
 * @property {string} reason
 * @property {string} [endTime] - ISO timestamp
 */

/**
 * @typedef {Object} CourtState
 * @property {number} number
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
 */

/**
 * @typedef {Object} Member
 * @property {string} id - UUID
 * @property {string} accountId - UUID
 * @property {string} memberNumber - e.g., "1001"
 * @property {string} displayName
 * @property {boolean} isPrimary
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
