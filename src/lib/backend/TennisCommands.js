/**
 * @fileoverview TennisCommands - Mutation operations
 *
 * All mutations go through Edge Functions.
 * Uses wire.js mappers to translate canonical inputs to current API payloads.
 * Returns { ok, ...data } or { ok: false, code, message, serverNow }
 */

import {
  toAssignCourtPayload,
  toEndSessionPayload,
  toJoinWaitlistPayload,
  toCancelWaitlistPayload,
  toDeferWaitlistPayload,
  toAssignFromWaitlistPayload,
  toCreateBlockPayload,
  toCancelBlockPayload,
} from './wire.js';
import { logger } from '../logger.js';

// Command DTO validation (fail-fast before API call)
import {
  buildAssignCourtCommand,
  buildEndSessionCommand,
  buildJoinWaitlistCommand,
  buildMoveCourtCommand,
  toMoveCourtPayload,
  buildClearWaitlistCommand,
  toClearWaitlistPayload,
  buildCreateBlockCommand,
  buildDeleteBlockCommand,
  buildRemoveFromWaitlistCommand,
  buildAssignFromWaitlistCommand,
  buildPurchaseBallsCommand,
  toPurchaseBallsPayload,
  buildDeferWaitlistCommand,
} from '../commands/index.js';

export class TennisCommands {
  constructor(apiAdapter, directory = null) {
    this.api = apiAdapter;
    this.directory = directory; // TennisDirectory for member lookups
  }

  /**
   * Set the directory for member lookups
   * @param {import('./TennisDirectory').TennisDirectory} directory
   */
  setDirectory(directory) {
    this.directory = directory;
  }

  /**
   * Assign a court to a group
   * @param {import('./types').AssignCourtInput} input
   * @returns {Promise<import('./types').CommandResponse & { session?: Object }>}
   */
  async assignCourt(input) {
    const payload = toAssignCourtPayload(input);
    const response = await this.api.post('/assign-court', payload);
    return response;
  }

  /**
   * End a session on a court
   * @param {import('./types').EndSessionInput} input
   * @returns {Promise<import('./types').CommandResponse>}
   */
  async endSession(input) {
    // Validate command structure (fail-fast)
    // Note: EndSessionCommand uses sessionId, but wire.js uses courtId
    // The backend finds the session by court
    if (input.sessionId) {
      buildEndSessionCommand({
        sessionId: input.sessionId,
        endReason: input.reason || 'completed',
      });
    }

    const payload = toEndSessionPayload(input);
    const response = await this.api.post('/end-session', payload);
    return response;
  }

  /**
   * Join the waitlist
   * @param {import('./types').JoinWaitlistInput} input
   * @returns {Promise<import('./types').CommandResponse & { entry?: Object, position?: number }>}
   */
  async joinWaitlist(input) {
    const payload = toJoinWaitlistPayload(input);
    const response = await this.api.post('/join-waitlist', payload);
    return response;
  }

  /**
   * Cancel a waitlist entry
   * @param {import('./types').CancelWaitlistInput} input
   * @returns {Promise<import('./types').CommandResponse>}
   */
  async cancelWaitlist(input) {
    // Validate command structure (fail-fast)
    buildRemoveFromWaitlistCommand({
      waitlistEntryId: input.entryId,
      reason: input.reason || 'cancelled',
    });

    const payload = toCancelWaitlistPayload(input);
    const response = await this.api.post('/cancel-waitlist', payload);
    return response;
  }

  /**
   * Defer or undefer a waitlist entry
   * @param {import('./types').DeferWaitlistInput} input
   * @returns {Promise<import('./types').CommandResponse>}
   */
  async deferWaitlistEntry(input) {
    // Validate command structure (fail-fast)
    buildDeferWaitlistCommand({
      waitlistEntryId: input.entryId,
      deferred: input.deferred,
    });

    const payload = toDeferWaitlistPayload(input);
    const response = await this.api.post('/defer-waitlist', payload);
    return response;
  }

  /**
   * Assign a court from the waitlist
   * @param {import('./types').AssignFromWaitlistInput} input
   * @returns {Promise<import('./types').CommandResponse & { session?: Object }>}
   */
  async assignFromWaitlist(input) {
    // Validate command structure (fail-fast)
    buildAssignFromWaitlistCommand({
      waitlistEntryId: input.waitlistEntryId,
      courtId: input.courtId,
    });

    const payload = toAssignFromWaitlistPayload(input);
    const response = await this.api.post('/assign-from-waitlist', payload);
    return response;
  }

  /**
   * Higher-level method to assign from waitlist with mobile geolocation
   *
   * @param {Object} params
   * @param {string} params.waitlistEntryId - UUID of the waitlist entry
   * @param {string} params.courtId - UUID of the court to assign
   * @param {number} [params.latitude] - For mobile geofence validation
   * @param {number} [params.longitude] - For mobile geofence validation
   * @returns {Promise<import('./types').CommandResponse & { session?: Object }>}
   */
  async assignFromWaitlistWithLocation({ waitlistEntryId, courtId, latitude, longitude }) {
    return this.assignFromWaitlist({
      waitlistEntryId,
      courtId,
      latitude,
      longitude,
    });
  }

  /**
   * Restore a displaced session (undo overtime takeover)
   * @param {Object} params
   * @param {string} params.displacedSessionId - UUID of the session to restore
   * @param {string} params.takeoverSessionId - UUID of the session that caused displacement
   * @returns {Promise<import('./types').CommandResponse & { restoredSessionId?: string }>}
   */
  async restoreSession({ displacedSessionId, takeoverSessionId }) {
    const response = await this.api.post('/restore-session', {
      displaced_session_id: displacedSessionId,
      takeover_session_id: takeoverSessionId,
    });
    return response;
  }

  /**
   * Undo an overtime takeover atomically
   * Ends the takeover session and restores the displaced session in one operation
   *
   * @param {Object} params
   * @param {string} params.takeoverSessionId - UUID of the session that took over the court
   * @param {string} params.displacedSessionId - UUID of the session that was displaced
   * @returns {Promise<import('./types').CommandResponse & { endedSessionId?: string, restoredSessionId?: string }>}
   */
  async undoOvertimeTakeover({ takeoverSessionId, displacedSessionId }) {
    const response = await this.api.post('/undo-overtime-takeover', {
      takeover_session_id: takeoverSessionId,
      displaced_session_id: displacedSessionId,
    });
    return response;
  }

  /**
   * Create a block on a court
   * @param {import('./types').CreateBlockInput} input
   * @returns {Promise<import('./types').CommandResponse & { block?: Object }>}
   */
  async createBlock(input) {
    // Validate command structure (fail-fast)
    buildCreateBlockCommand({
      courtId: input.courtId,
      startsAt: input.startTime,
      endsAt: input.endTime,
      reason: input.reason,
    });

    const payload = toCreateBlockPayload(input);
    const response = await this.api.post('/create-block', payload);
    return response;
  }

  /**
   * Cancel a block
   * @param {import('./types').CancelBlockInput} input
   * @returns {Promise<import('./types').CommandResponse>}
   */
  async cancelBlock(input) {
    // Validate command structure (fail-fast)
    buildDeleteBlockCommand({
      blockId: input.blockId,
    });

    const payload = toCancelBlockPayload(input);
    const response = await this.api.post('/cancel-block', payload);
    return response;
  }

  /**
   * Purchase balls for a session
   * @param {import('./types').PurchaseBallsInput} input
   * @returns {Promise<import('./types').CommandResponse & { transaction?: Object }>}
   */
  async purchaseBalls(input) {
    // Validate command structure (fail-fast) and get idempotency key
    const command = buildPurchaseBallsCommand({
      sessionId: input.sessionId,
      accountId: input.accountId,
      splitBalls: input.splitBalls || false,
      splitAccountIds: input.splitAccountIds || null,
      idempotencyKey: input.idempotencyKey,
    });

    // Build payload using DTO mapper
    const payload = toPurchaseBallsPayload(command);

    const response = await this.api.post('/purchase-balls', payload);
    return response;
  }

  /**
   * Move a session from one court to another
   * @param {import('./types').MoveCourtInput} input
   * @returns {Promise<import('./types').CommandResponse & { sessionId?: string, fromCourtId?: string, toCourtId?: string }>}
   */
  async moveCourt(input) {
    // Validate command structure (fail-fast)
    const command = buildMoveCourtCommand({
      fromCourtId: input.fromCourtId,
      toCourtId: input.toCourtId,
    });

    // Build payload using DTO mapper
    const payload = toMoveCourtPayload(command);

    const response = await this.api.post('/move-court', payload);
    return response;
  }

  /**
   * Clear the entire waitlist (admin action)
   * @returns {Promise<import('./types').CommandResponse & { cancelledCount?: number }>}
   */
  async clearWaitlist() {
    // Validate command structure (fail-fast)
    const command = buildClearWaitlistCommand({});

    // Build payload using DTO mapper
    const payload = toClearWaitlistPayload(command);

    const response = await this.api.post('/clear-waitlist', payload);
    return response;
  }

  // ========================================
  // Helper Methods for Player -> Participant Conversion
  // ========================================

  /**
   * Convert UI player format to canonical ParticipantInput format
   * Uses TennisDirectory to look up member UUIDs and account IDs
   *
   * @param {Array<Object>} players - Players in UI format (with name, memberNumber, isGuest, etc.)
   * @returns {Promise<import('./types').ParticipantInput[]>}
   * @throws {Error} If a member cannot be resolved
   *
   * UI Player format:
   *   { name: string, memberNumber?: string, isGuest?: boolean, id?: string }
   *
   * Canonical ParticipantInput format:
   *   { kind: 'member', memberId: uuid, accountId: uuid }
   *   { kind: 'guest', guestName: string, accountId: uuid }
   */
  async resolvePlayersToParticipants(players) {
    if (!this.directory) {
      throw new Error('TennisDirectory not set - cannot resolve players');
    }

    const tStart = performance.now();

    // Separate members from guests and collect unique member numbers
    const memberPlayers = [];
    const guestPlayers = [];

    for (const player of players) {
      if (player.isGuest || player.type === 'guest') {
        guestPlayers.push(player);
      } else {
        const memberNumber = player.memberNumber || player.clubNumber;
        const name = player.name || player.displayName;

        if (!memberNumber) {
          throw new Error(`Member ${name} has no member number`);
        }

        memberPlayers.push({ ...player, memberNumber, name });
      }
    }

    // Get unique member numbers for parallel fetch
    const uniqueMemberNumbers = [...new Set(memberPlayers.map((p) => p.memberNumber))];

    // Fetch all accounts in parallel
    const t0 = performance.now();
    const accountResults = await Promise.all(
      uniqueMemberNumbers.map(async (memberNumber) => {
        const a0 = performance.now();
        const members = await this.directory.getMembersByAccount(memberNumber);
        const a1 = performance.now();
        logger.debug('TennisCommands', `getMembersByAccount ${memberNumber}`, {
          durationMs: (a1 - a0).toFixed(0),
          memberCount: members?.length ?? 0,
        });
        return [memberNumber, members];
      })
    );
    logger.debug('TennisCommands', 'Account fetch complete', {
      durationMs: (performance.now() - t0).toFixed(0),
    });

    // Build lookup map: memberNumber -> members[]
    const membersByAccount = new Map(accountResults);

    // Resolve each member player (no await needed - data already fetched)
    const participants = [];
    let firstMemberAccount = null;

    for (const player of memberPlayers) {
      const members = membersByAccount.get(player.memberNumber) || [];
      const nameLower = (player.name || '').toLowerCase().trim();

      // Find matching member (exact match, then partial, then last name)
      // Members are already normalized by TennisDirectory - use camelCase only
      let member = members.find((m) => (m.displayName || '').toLowerCase().trim() === nameLower);

      if (!member) {
        // Partial match
        member = members.find((m) => {
          const display = (m.displayName || '').toLowerCase().trim();
          return display.includes(nameLower) || nameLower.includes(display);
        });
      }

      if (!member) {
        // Last name match
        member = members.find((m) => {
          const displayLast = (m.displayName || '').toLowerCase().split(' ').pop();
          const nameLast = nameLower.split(' ').pop();
          return displayLast === nameLast;
        });
      }

      if (!member && members.length === 1) {
        // Single member on account - use it with warning
        logger.warn('TennisCommands', 'Using only member on account', {
          found: members[0].displayName,
          searched: player.name,
        });
        member = members[0];
      }

      if (!member) {
        throw new Error(`Could not find member: ${player.name} (account ${player.memberNumber})`);
      }

      participants.push({
        kind: 'member',
        memberId: member.id,
        accountId: member.accountId,
      });

      // Track first member's account for guests
      if (!firstMemberAccount) {
        firstMemberAccount = member.accountId;
      }
    }

    // Add guest participants
    for (const player of guestPlayers) {
      participants.push({
        kind: 'guest',
        guestName: player.name || player.guest_name || 'Guest',
        accountId: '__NEEDS_ACCOUNT__',
      });
    }

    // Assign guest accounts from first member
    if (firstMemberAccount) {
      for (const p of participants) {
        if (p.accountId === '__NEEDS_ACCOUNT__') {
          p.accountId = firstMemberAccount;
        }
      }
    } else {
      // All guests, no members - error
      const hasGuest = participants.some((p) => p.accountId === '__NEEDS_ACCOUNT__');
      if (hasGuest) {
        throw new Error('Cannot register guests without a member');
      }
    }

    logger.debug('TennisCommands', 'resolvePlayers complete', {
      durationMs: (performance.now() - tStart).toFixed(0),
    });
    return participants;
  }

  /**
   * Higher-level method to assign a court from UI data
   * Handles player resolution automatically
   *
   * @param {Object} params
   * @param {string} params.courtId - UUID of the court
   * @param {Array<Object>} params.players - Players in UI format
   * @param {'singles' | 'doubles'} params.groupType
   * @param {boolean} [params.addBalls]
   * @param {boolean} [params.splitBalls]
   * @param {number} [params.latitude] - For mobile geofence validation
   * @param {number} [params.longitude] - For mobile geofence validation
   * @returns {Promise<import('./types').CommandResponse & { session?: Object }>}
   */
  async assignCourtWithPlayers({
    courtId,
    players,
    groupType,
    addBalls = false,
    splitBalls = false,
    latitude,
    longitude,
  }) {
    const tStart = performance.now();
    logger.debug('TennisCommands', 'assignCourtWithPlayers start', {
      courtId,
      playerCount: players.length,
      groupType,
    });

    // 1. Validate command structure (fail-fast)
    // INPUT-NORMALIZE: Accept either format from UI, normalize to camelCase for validation
    const validPlayers = players.map((p) => ({
      memberId: p.memberId || p.id || '',
      displayName: p.displayName || p.name || '',
      isGuest: p.isGuest ?? false,
    }));

    buildAssignCourtCommand({
      courtId,
      players: validPlayers,
      groupType,
      durationMinutes: 60, // Default duration for validation
    });

    // 2. Resolve players to participants (member lookup)
    const participants = await this.resolvePlayersToParticipants(players);
    logger.debug('TennisCommands', 'Resolved participants', {
      durationMs: (performance.now() - tStart).toFixed(0),
    });

    // 3. Send to API
    const tPost = performance.now();
    const result = await this.assignCourt({
      courtId,
      participants,
      groupType,
      addBalls,
      splitBalls,
      latitude,
      longitude,
    });
    logger.debug('TennisCommands', 'POST /assign-court complete', {
      durationMs: (performance.now() - tPost).toFixed(0),
    });
    logger.debug('TennisCommands', 'assignCourtWithPlayers complete', {
      durationMs: (performance.now() - tStart).toFixed(0),
    });

    return result;
  }

  /**
   * Higher-level method to join waitlist from UI data
   * Handles player resolution automatically
   *
   * @param {Object} params
   * @param {Array<Object>} params.players - Players in UI format
   * @param {'singles' | 'doubles'} params.groupType
   * @param {number} [params.latitude] - For mobile geofence validation
   * @param {number} [params.longitude] - For mobile geofence validation
   * @returns {Promise<import('./types').CommandResponse & { entry?: Object, position?: number }>}
   */
  async joinWaitlistWithPlayers({ players, groupType, latitude, longitude, deferred }) {
    // 1. Validate command structure (fail-fast)
    // INPUT-NORMALIZE: Accept either format from UI, normalize to camelCase for validation
    const validPlayers = players.map((p) => ({
      memberId: p.memberId || p.id || '',
      displayName: p.displayName || p.name || '',
      isGuest: p.isGuest ?? false,
    }));

    buildJoinWaitlistCommand({
      players: validPlayers,
      groupType,
    });

    // 2. Resolve players to participants (member lookup)
    const participants = await this.resolvePlayersToParticipants(players);

    // 3. Send to API
    return this.joinWaitlist({
      participants,
      groupType,
      latitude,
      longitude,
      deferred,
    });
  }

  /**
   * Update the tournament flag on an active session
   * @param {Object} input
   * @param {string} input.sessionId - UUID of the session
   * @param {boolean} input.isTournament - Whether this is a tournament match
   * @returns {Promise<import('./types').CommandResponse>}
   */
  async updateSessionTournament({ sessionId, isTournament }) {
    const response = await this.api.post('/update-session-tournament', {
      session_id: sessionId,
      is_tournament: isTournament,
    });
    return response;
  }

  /**
   * Generate a location verification token for QR code display
   * Used on kiosk when mobile users need alternative to GPS
   *
   * @param {Object} params
   * @param {number} [params.validityMinutes=5] - Token validity duration
   * @returns {Promise<{ok: boolean, token?: string, expiresAt?: string, message?: string}>}
   */
  async generateLocationToken({ validityMinutes = 5 } = {}) {
    const response = await this.api.post('/generate-location-token', {
      validity_minutes: validityMinutes,
    });
    return response;
  }
}

export default TennisCommands;
