/**
 * AdminCommands - Admin-only mutations via TennisBackend
 * 
 * All methods require admin device authorization.
 * All mutations emit board_change_signals for realtime updates.
 * All responses follow { ok, code, message, serverNow } pattern.
 */

export class AdminCommands {
  constructor(api) {
    this.api = api;
  }

  /**
   * Create a court block (wet court, maintenance, etc.)
   * @param {Object} input
   * @param {string} input.courtId - UUID of the court
   * @param {string} input.blockType - Block type (lesson, clinic, maintenance, wet, other)
   * @param {string} input.title - Block title/description
   * @param {string} input.startsAt - ISO timestamp for block start
   * @param {string} input.endsAt - ISO timestamp for block end
   * @param {string} input.deviceId - Admin device ID
   * @param {string} input.deviceType - Device type
   */
  async createBlock(input) {
    const payload = {
      court_id: input.courtId,
      block_type: input.blockType,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      device_id: input.deviceId,
      device_type: input.deviceType || 'admin',
    };
    
    const response = await this.api.post('/create-block', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      block: response.block,
    };
  }

  /**
   * Cancel a court block
   * @param {Object} input
   * @param {string} input.blockId - UUID of the block to cancel
   * @param {string} input.deviceId - Admin device ID
   * @param {string} input.deviceType - Device type
   */
  async cancelBlock(input) {
    const payload = {
      block_id: input.blockId,
      device_id: input.deviceId,
      device_type: input.deviceType || 'admin',
    };
    
    const response = await this.api.post('/cancel-block', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
    };
  }

  /**
   * Force end any session (admin override)
   * @param {Object} input
   * @param {string} [input.sessionId] - UUID of session to end (preferred)
   * @param {string} [input.courtId] - UUID of court (finds active session)
   * @param {string} [input.reason] - Reason for ending
   * @param {string} input.deviceId - Admin device ID
   */
  async adminEndSession(input) {
    const payload = {
      session_id: input.sessionId,
      court_id: input.courtId,
      reason: input.reason || 'admin_force_end',
      device_id: input.deviceId,
    };
    
    const response = await this.api.post('/admin-end-session', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      session: response.session,
    };
  }

  /**
   * Clear all courts (emergency reset)
   * @param {Object} input
   * @param {string} [input.reason] - Reason for clearing all
   * @param {string} input.deviceId - Admin device ID
   */
  async clearAllCourts(input) {
    const payload = {
      reason: input.reason || 'admin_clear_all',
      device_id: input.deviceId,
    };
    
    const response = await this.api.post('/clear-all-courts', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      sessionsEnded: response.sessionsEnded,
    };
  }

  /**
   * Remove entry from waitlist
   * @param {Object} input
   * @param {string} input.waitlistEntryId - UUID of waitlist entry
   * @param {string} [input.reason] - Reason for removal
   * @param {string} input.deviceId - Admin device ID
   */
  async removeFromWaitlist(input) {
    const payload = {
      waitlist_entry_id: input.waitlistEntryId,
      reason: input.reason || 'admin_removed',
      device_id: input.deviceId,
    };
    
    const response = await this.api.post('/remove-from-waitlist', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
    };
  }

  /**
   * Cleanup duplicate sessions (utility)
   * @param {Object} input
   * @param {string} input.deviceId - Admin device ID
   */
  async cleanupSessions(input) {
    const payload = {
      device_id: input.deviceId,
    };
    
    const response = await this.api.post('/cleanup-sessions', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      sessionsEnded: response.endedIds?.length || 0,
    };
  }
}
