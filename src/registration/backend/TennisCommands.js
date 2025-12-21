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
} from './wire.js';

export class TennisCommands {
  constructor(apiAdapter) {
    this.api = apiAdapter;
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
}

export default TennisCommands;
