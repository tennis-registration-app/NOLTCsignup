/**
 * @fileoverview Wire format mappers for Edge Function payloads
 * 
 * This module translates TennisBackend canonical inputs to the current
 * Edge Function expected payloads. This isolates legacy compatibility
 * in one place.
 * 
 * TODO: Remove this module when Edge Functions are updated to target API.
 * Target API uses: courtNumber, billingMemberId, groupType (camelCase in JS, snake_case over wire)
 * Current API uses: court_number, billing_member_id, group_type, session_type, etc.
 */

/**
 * Map AssignCourtInput to current assign-court payload
 * @param {import('./types').AssignCourtInput} input
 * @returns {Object} Wire payload for /assign-court
 */
export function toAssignCourtPayload(input) {
  return {
    court_id: input.courtId,  // UUID of the court
    session_type: input.groupType,  // 'singles' | 'doubles'
    participants: input.participants.map(p => {
      if (p.kind === 'member') {
        return {
          type: 'member',
          member_id: p.memberId,
          account_id: p.accountId,
        };
      } else {
        return {
          type: 'guest',
          guest_name: p.guestName,
          account_id: p.accountId,
          charged_to_account_id: p.chargedToAccountId || p.accountId,
        };
      }
    }),
    add_balls: input.addBalls || false,
    split_balls: input.splitBalls || false,
  };
}

/**
 * Map EndSessionInput to current end-session payload
 * @param {import('./types').EndSessionInput} input
 * @returns {Object} Wire payload for /end-session
 */
export function toEndSessionPayload(input) {
  return {
    court_id: input.courtId,  // UUID of the court
    end_reason: input.reason || 'completed',
  };
}

/**
 * Map JoinWaitlistInput to current join-waitlist payload
 * @param {import('./types').JoinWaitlistInput} input
 * @returns {Object} Wire payload for /join-waitlist
 */
export function toJoinWaitlistPayload(input) {
  return {
    group_type: input.groupType,  // 'singles' | 'doubles'
    participants: input.participants.map(p => {
      if (p.kind === 'member') {
        return {
          type: 'member',
          member_id: p.memberId,
          account_id: p.accountId,
        };
      } else {
        return {
          type: 'guest',
          guest_name: p.guestName,
          account_id: p.accountId,
        };
      }
    }),
  };
}

/**
 * Map CancelWaitlistInput to current cancel-waitlist payload
 * @param {import('./types').CancelWaitlistInput} input
 * @returns {Object} Wire payload for /cancel-waitlist
 */
export function toCancelWaitlistPayload(input) {
  return {
    waitlist_id: input.entryId,
  };
}

/**
 * Map AssignFromWaitlistInput to current assign-from-waitlist payload
 * @param {import('./types').AssignFromWaitlistInput} input
 * @returns {Object} Wire payload for /assign-from-waitlist
 */
export function toAssignFromWaitlistPayload(input) {
  return {
    waitlist_id: input.waitlistEntryId,
    court_id: input.courtId,  // UUID of the court
  };
}

/**
 * Map CreateBlockInput to current create-block payload
 * @param {import('./types').CreateBlockInput} input
 * @returns {Object} Wire payload for /create-block
 */
export function toCreateBlockPayload(input) {
  return {
    court_id: input.courtId,  // UUID of the court
    block_type: input.blockType || 'maintenance',
    title: input.reason,
    starts_at: input.startTime,
    ends_at: input.endTime,
  };
}

/**
 * Map CancelBlockInput to current cancel-block payload
 * @param {import('./types').CancelBlockInput} input
 * @returns {Object} Wire payload for /cancel-block
 */
export function toCancelBlockPayload(input) {
  return {
    block_id: input.blockId,
  };
}
