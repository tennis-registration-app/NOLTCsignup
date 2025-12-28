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
  toAssignFromWaitlistPayload,
  toCreateBlockPayload,
  toCancelBlockPayload,
  toPurchaseBallsPayload,
} from './wire.js';

// Command DTO validation (fail-fast before API call)
import {
  buildAssignCourtCommand,
  buildEndSessionCommand,
  buildJoinWaitlistCommand,
} from '../../lib/commands/index.js';

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
    const payload = toCancelWaitlistPayload(input);
    const response = await this.api.post('/cancel-waitlist', payload);
    return response;
  }

  /**
   * Assign a court from the waitlist
   * @param {import('./types').AssignFromWaitlistInput} input
   * @returns {Promise<import('./types').CommandResponse & { session?: Object }>}
   */
  async assignFromWaitlist(input) {
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
   * Create a block on a court
   * @param {import('./types').CreateBlockInput} input
   * @returns {Promise<import('./types').CommandResponse & { block?: Object }>}
   */
  async createBlock(input) {
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
    const payload = toPurchaseBallsPayload(input);
    const response = await this.api.post('/purchase-balls', payload);
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

    const participants = [];
    let firstMemberAccount = null;

    for (const player of players) {
      if (player.isGuest || player.type === 'guest') {
        // Guest - will need an account for fees (resolved after members)
        participants.push({
          kind: 'guest',
          guestName: player.name || player.guest_name || 'Guest',
          accountId: '__NEEDS_ACCOUNT__',
        });
      } else {
        // Member - resolve via directory
        const memberNumber = player.memberNumber || player.member_number || player.clubNumber;
        const name = player.name || player.displayName;

        if (!memberNumber) {
          throw new Error(`Member ${name} has no member number`);
        }

        const member = await this.directory.findMemberByName(memberNumber, name);

        if (!member) {
          throw new Error(`Could not find member: ${name} (account ${memberNumber})`);
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
    }

    // Assign guest accounts
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
    // 1. Validate command structure (fail-fast)
    const validPlayers = players.map((p) => ({
      memberId: p.memberId || p.member_id || p.id || '',
      displayName: p.displayName || p.display_name || p.name || '',
      isGuest: p.isGuest ?? p.is_guest ?? false,
    }));

    buildAssignCourtCommand({
      courtId,
      players: validPlayers,
      groupType,
      durationMinutes: 60, // Default duration for validation
    });

    // 2. Resolve players to participants (member lookup)
    const participants = await this.resolvePlayersToParticipants(players);

    // 3. Send to API
    return this.assignCourt({
      courtId,
      participants,
      groupType,
      addBalls,
      splitBalls,
      latitude,
      longitude,
    });
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
  async joinWaitlistWithPlayers({ players, groupType, latitude, longitude }) {
    // 1. Validate command structure (fail-fast)
    const validPlayers = players.map((p) => ({
      memberId: p.memberId || p.member_id || p.id || '',
      displayName: p.displayName || p.display_name || p.name || '',
      isGuest: p.isGuest ?? p.is_guest ?? false,
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
    });
  }
}

export default TennisCommands;
