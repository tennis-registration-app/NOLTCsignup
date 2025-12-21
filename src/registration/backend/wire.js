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
    court_id: input.courtNumber,  // Current API uses court_id (number), not court_number
    session_type: input.groupType,  // Current API uses session_type, not group_type
    participants: input.participants.map(p => {
      if (p.kind === 'member') {
        return { member_id: p.memberId, is_guest: false };
      } else {
        return { guest_name: p.guestName, is_guest: true };
      }
    }),
    add_balls: input.addBalls || false,
    split_balls: input.splitBalls || false,
    // billing_member_id derived from first participant on backend currently
  };
}

/**
 * Map EndSessionInput to current end-session payload
 * @param {import('./types').EndSessionInput} input
 * @returns {Object} Wire payload for /end-session
 */
export function toEndSessionPayload(input) {
  return {
    court_id: input.courtNumber,  // Current API uses court_id
    end_reason: input.reason || 'normal',
  };
}

/**
 * Map JoinWaitlistInput to current join-waitlist payload
 * @param {import('./types').JoinWaitlistInput} input
 * @returns {Object} Wire payload for /join-waitlist
 */
export function toJoinWaitlistPayload(input) {
  return {
    session_type: input.groupType,  // Current API uses session_type
    participants: input.participants.map(p => {
      if (p.kind === 'member') {
        return { member_id: p.memberId, is_guest: false };
      } else {
        return { guest_name: p.guestName, is_guest: true };
      }
    }),
    // billing_member_id derived from first participant on backend currently
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
    court_id: input.courtNumber,  // Current API uses court_id
  };
}

/**
 * Map CreateBlockInput to current create-block payload
 * @param {import('./types').CreateBlockInput} input
 * @returns {Object} Wire payload for /create-block
 */
export function toCreateBlockPayload(input) {
  return {
    court_number: input.courtNumber,
    reason: input.reason,
    start_time: input.startTime,
    end_time: input.endTime,
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
