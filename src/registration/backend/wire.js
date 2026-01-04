/**
 * @fileoverview Wire format mappers for Edge Function payloads
 *
 * This module translates TennisBackend canonical inputs to API wire payloads.
 * Single place to map Command DTOs → API payloads. This is intentional architecture,
 * not technical debt - it decouples frontend from backend wire format.
 *
 * If API wire format changes, update mappings here only.
 *
 * Conventions:
 * - Frontend uses camelCase (courtNumber, billingMemberId, groupType)
 * - API wire uses snake_case (court_number, billing_member_id, group_type)
 */

/**
 * Map AssignCourtInput to current assign-court payload
 * @param {import('./types').AssignCourtInput} input
 * @returns {Object} Wire payload for /assign-court
 */
export function toAssignCourtPayload(input) {
  const payload = {
    court_id: input.courtId, // UUID of the court
    session_type: input.groupType, // 'singles' | 'doubles'
    participants: input.participants.map((p) => {
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

  // Add geolocation for mobile device (required by backend for geofence validation)
  if (input.latitude !== undefined && input.longitude !== undefined) {
    payload.latitude = input.latitude;
    payload.longitude = input.longitude;
    // Include GPS accuracy if available (for audit logging)
    if (input.accuracy !== undefined) {
      payload.accuracy = input.accuracy;
    }
  }

  // Add location token for QR-based verification (fallback when GPS fails)
  if (input.location_token) {
    payload.location_token = input.location_token;
  }

  return payload;
}

/**
 * Map UI clear reasons to valid API end_reason values
 * Valid API values: 'cleared', 'observed_cleared', 'admin_override', 'overtime_takeover', 'auto_cleared'
 * @param {string} reason - UI reason string
 * @returns {string} Valid API end_reason
 */
function mapEndReason(reason) {
  if (!reason) return 'cleared';

  // If already a valid new value, pass through
  if (
    ['cleared', 'observed_cleared', 'admin_override', 'overtime_takeover', 'auto_cleared'].includes(
      reason
    )
  ) {
    return reason;
  }

  const r = reason.toLowerCase();

  // Player self-clear: "We finished and are leaving our court"
  if (['early', 'left', 'done', 'cleared'].some((k) => r.includes(k)) && !r.includes('observed')) {
    return 'cleared';
  }

  // Observer clear: "The players have left the court, I'm sure!"
  if (['observed', 'empty'].some((k) => r.includes(k))) {
    return 'observed_cleared';
  }

  // Admin clear
  if (['admin', 'override', 'force'].some((k) => r.includes(k))) {
    return 'admin_override';
  }

  // Bumped by overtime takeover
  if (['bump', 'takeover', 'overtime'].some((k) => r.includes(k))) {
    return 'overtime_takeover';
  }

  // Default to cleared (normal end of play)
  return 'cleared';
}

/**
 * Map EndSessionInput to current end-session payload
 * @param {import('./types').EndSessionInput} input
 * @returns {Object} Wire payload for /end-session
 */
export function toEndSessionPayload(input) {
  return {
    court_id: input.courtId, // UUID of the court
    end_reason: mapEndReason(input.reason || input.endReason),
  };
}

/**
 * Map JoinWaitlistInput to current join-waitlist payload
 * @param {import('./types').JoinWaitlistInput} input
 * @returns {Object} Wire payload for /join-waitlist
 */
export function toJoinWaitlistPayload(input) {
  const payload = {
    group_type: input.groupType, // 'singles' | 'doubles'
    participants: input.participants.map((p) => {
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

  // Add geolocation for mobile device (required by backend for geofence validation)
  if (input.latitude !== undefined && input.longitude !== undefined) {
    payload.latitude = input.latitude;
    payload.longitude = input.longitude;
    // Include GPS accuracy if available (for audit logging)
    if (input.accuracy !== undefined) {
      payload.accuracy = input.accuracy;
    }
  }

  // Add location token for QR-based verification (fallback when GPS fails)
  if (input.location_token) {
    payload.location_token = input.location_token;
  }

  return payload;
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
  const payload = {
    waitlist_id: input.waitlistEntryId,
    court_id: input.courtId, // UUID of the court
  };

  // Add geolocation for mobile device (required by backend for geofence validation)
  if (input.latitude !== undefined && input.longitude !== undefined) {
    payload.latitude = input.latitude;
    payload.longitude = input.longitude;
    // Include GPS accuracy if available (for audit logging)
    if (input.accuracy !== undefined) {
      payload.accuracy = input.accuracy;
    }
  }

  // Add location token for QR-based verification (fallback when GPS fails)
  if (input.location_token) {
    payload.location_token = input.location_token;
  }

  return payload;
}

/**
 * Map CreateBlockInput to current create-block payload
 * @param {import('./types').CreateBlockInput} input
 * @returns {Object} Wire payload for /create-block
 */
export function toCreateBlockPayload(input) {
  return {
    court_id: input.courtId, // UUID of the court
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

/**
 * Map PurchaseBallsInput to current purchase-balls payload
 * @param {import('./types').PurchaseBallsInput} input
 * @returns {Object} Wire payload for /purchase-balls
 */
export function toPurchaseBallsPayload(input) {
  return {
    session_id: input.sessionId,
    account_id: input.accountId,
    split_balls: input.splitBalls || false,
    split_account_ids: input.splitAccountIds || null,
  };
}
