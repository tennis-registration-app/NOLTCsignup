/**
 * AdminCommands - Admin-only mutations via TennisBackend
 *
 * All methods require admin device authorization.
 * All mutations emit board_change_signals for realtime updates.
 * All responses follow { ok, code, message, serverNow } pattern.
 */

type ApiResponse = { ok: boolean; code?: string; message?: string; error?: string; serverNow?: string; [key: string]: unknown };

export class AdminCommands {
  api: { get(url: string): Promise<ApiResponse>; post(url: string, body?: Record<string, unknown>): Promise<ApiResponse>; aiAssistant(opts: Record<string, unknown>): Promise<ApiResponse> };

  constructor(api: AdminCommands['api']) {
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
   * @param {string} [input.recurrenceGroupId] - Optional recurrence group UUID
   */
  async createBlock(input) {
    const payload: Record<string, unknown> = {
      court_id: input.courtId,
      block_type: input.blockType,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      device_id: input.deviceId,
      device_type: input.deviceType || 'admin',
    };
    if (input.recurrenceGroupId) {
      payload.recurrence_group_id = input.recurrenceGroupId;
    }

    const response = await this.api.post('/create-block', payload);
    return {
      ok: response.ok as boolean,
      code: response.code as string | undefined,
      message: (response.message || response.error) as string | undefined,
      serverNow: response.serverNow as string | undefined,
      block: response.block,
      board: response.board,
    };
  }

  /**
   * Update a court block
   * @param {Object} input
   * @param {string} input.blockId - UUID of the block to update
   * @param {string} [input.courtId] - New court UUID
   * @param {string} [input.blockType] - Block type (lesson, clinic, maintenance, wet, other)
   * @param {string} [input.title] - Block title/description
   * @param {string} [input.startsAt] - ISO timestamp for block start
   * @param {string} [input.endsAt] - ISO timestamp for block end
   * @param {string} input.deviceId - Admin device ID
   * @param {string} input.deviceType - Device type
   */
  async updateBlock(input) {
    const payload: Record<string, unknown> = {
      block_id: input.blockId,
      device_id: input.deviceId,
      device_type: input.deviceType || 'admin',
    };

    // Only include optional fields if provided
    if (input.courtId !== undefined) payload.court_id = input.courtId;
    if (input.blockType !== undefined) payload.block_type = input.blockType;
    if (input.title !== undefined) payload.title = input.title;
    if (input.startsAt !== undefined) payload.starts_at = input.startsAt;
    if (input.endsAt !== undefined) payload.ends_at = input.endsAt;

    const response = await this.api.post('/update-block', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      block: (response.data as Record<string, unknown> | undefined)?.block || response.block,
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
      board: response.board,
    };
  }

  /**
   * Cancel all blocks in a recurrence group
   * @param {Object} input
   * @param {string} input.recurrenceGroupId - UUID of the recurrence group
   * @param {boolean} [input.futureOnly] - If true, only cancel blocks starting after now
   * @param {string} input.deviceId - Admin device ID
   * @param {string} input.deviceType - Device type
   */
  async cancelBlockGroup(input) {
    const payload = {
      recurrence_group_id: input.recurrenceGroupId,
      device_id: input.deviceId,
      device_type: input.deviceType || 'admin',
      future_only: input.futureOnly || false,
    };

    const response = await this.api.post('/cancel-block-group', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      cancelledCount: (response.data as Record<string, unknown> | undefined)?.cancelled_count || 0,
      blockIds: (response.data as Record<string, unknown> | undefined)?.block_ids || [],
    };
  }

  /**
   * List active recurring block groups
   * @returns {Promise<{ok: boolean, code: string, message: string, serverNow: string, groups: Array}>}
   */
  async listBlockGroups() {
    const response = await this.api.post('/list-block-groups', {
      device_id: 'admin-device',
      device_type: 'admin',
    });
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      groups: response.groups || [],
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
      board: response.board,
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
      board: response.board,
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
      board: response.board,
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
      sessionsEnded: (response.endedIds as unknown[] | undefined)?.length || 0,
    };
  }

  /**
   * Mark courts as wet (batch operation)
   * @param {Object} input
   * @param {string} input.deviceId - Admin device ID
   * @param {number} [input.durationMinutes] - Duration in minutes (default: 720 = 12 hours)
   * @param {string[]} [input.courtIds] - Specific court UUIDs (default: all courts)
   * @param {string} [input.reason] - Reason (default: 'WET COURT')
   * @param {string} [input.idempotencyKey] - Prevent duplicate operations
   */
  async markWetCourts(input) {
    const payload = {
      device_id: input.deviceId,
      duration_minutes: input.durationMinutes,
      court_ids: input.courtIds,
      reason: input.reason,
      idempotency_key: input.idempotencyKey,
    };

    const response = await this.api.post('/mark-wet-courts', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      courtsMarked: response.courts_marked,
      courtNumbers: response.court_numbers,
      blocksCreated: response.blocks_created,
      blocksCancelled: response.blocks_cancelled,
      endsAt: response.ends_at,
      idempotent: response.idempotent,
    };
  }

  /**
   * Clear wet court blocks (batch operation)
   * @param {Object} input
   * @param {string} input.deviceId - Admin device ID
   * @param {string[]} [input.courtIds] - Specific court UUIDs (default: all courts)
   * @param {string} [input.idempotencyKey] - Prevent duplicate operations
   */
  async clearWetCourts(input) {
    const payload = {
      device_id: input.deviceId,
      court_ids: input.courtIds,
      idempotency_key: input.idempotencyKey,
    };

    const response = await this.api.post('/clear-wet-courts', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      blocksCleared: response.blocks_cleared,
      courtNumbers: response.court_numbers,
    };
  }

  /**
   * Get blocks within a date range (admin only)
   * @param {Object} input
   * @param {string} [input.courtId] - Optional: filter by court UUID
   * @param {string} [input.fromDate] - Optional: ISO date, defaults to now
   * @param {string} [input.toDate] - Optional: ISO date, defaults to fromDate + 90 days
   * @returns {Promise<{ok: boolean, blocks: Array, serverNow: string, code?: string, message?: string}>}
   */
  async getBlocks({ courtId = undefined, fromDate = undefined, toDate = undefined }: { courtId?: string; fromDate?: string; toDate?: string } = {}) {
    const payload: Record<string, unknown> = {};
    if (courtId) payload.court_id = courtId;
    if (fromDate) payload.from_date = fromDate;
    if (toDate) payload.to_date = toDate;

    const response = await this.api.post('/get-blocks', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      blocks: response.blocks || [],
    };
  }

  /**
   * Get transactions with optional filters
   * @param {Object} input
   * @param {string} [input.type] - Transaction type filter ('ball_purchase', 'guest_fee', 'reversal')
   * @param {string} [input.dateStart] - Start date (YYYY-MM-DD)
   * @param {string} [input.dateEnd] - End date (YYYY-MM-DD)
   * @param {string} [input.memberNumber] - Filter by member number
   * @param {number} [input.limit] - Max results (default: 100)
   * @returns {Promise<{ok: boolean, summary: Object, transactions: Array}>}
   */
  async getTransactions({
    type = undefined,
    dateStart = undefined,
    dateEnd = undefined,
    memberNumber = undefined,
    limit = 100,
  } = {}) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (dateStart) params.append('date_start', dateStart);
    if (dateEnd) params.append('date_end', dateEnd);
    if (memberNumber) params.append('member_number', memberNumber);
    if (limit) params.append('limit', limit.toString());

    const url = `/get-transactions?${params.toString()}`;
    const response = await this.api.get(url);
    return response;
  }

  /**
   * Get system settings
   * @returns {Promise<{ok: boolean, settings: Object, operating_hours: Array, upcoming_overrides: Array}>}
   */
  async getSettings() {
    const response = await this.api.get('/get-settings');
    if (response.ok && response.data) {
      return { ok: true, ...response.data };
    }
    return response;
  }

  /**
   * Update system settings
   * @param {Object} params
   * @param {Object} [params.settings] - Key-value pairs (ball_price_cents, guest_fee_weekday_cents, etc.)
   * @param {Array} [params.operatingHours] - Weekly schedule
   * @param {Object} [params.operatingHoursOverride] - Single date override
   * @param {string} [params.deleteOverride] - Date to delete override for
   * @returns {Promise<{ok: boolean, updated: Array}>}
   */
  async updateSettings({ settings, operatingHours, operatingHoursOverride, deleteOverride }: { settings?: Record<string, unknown>; operatingHours?: unknown; operatingHoursOverride?: unknown; deleteOverride?: string }) {
    const payload: Record<string, unknown> = {};
    if (settings) payload.settings = settings;
    if (operatingHours) payload.operating_hours = operatingHours;
    if (operatingHoursOverride) payload.operating_hours_override = operatingHoursOverride;
    if (deleteOverride) payload.delete_override = deleteOverride;

    return this.api.post('/update-system-settings', payload);
  }

  /**
   * Reorder a waitlist entry to a new position
   * @param {Object} params
   * @param {string} params.entryId - Waitlist entry ID
   * @param {number} params.newPosition - Target position (1-based)
   * @returns {Promise<{ok: boolean, old_position?: number, new_position?: number}>}
   */
  async reorderWaitlist({ entryId, newPosition }) {
    return this.api.post('/reorder-waitlist', {
      entry_id: entryId,
      new_position: newPosition,
    });
  }

  /**
   * Get session history with filters
   * @param {Object} params
   * @param {number} [params.courtNumber] - Filter by court number
   * @param {string} [params.memberName] - Filter by member name (partial match)
   * @param {string} [params.dateStart] - Start date (YYYY-MM-DD)
   * @param {string} [params.dateEnd] - End date (YYYY-MM-DD)
   * @param {number} [params.limit=50] - Max results
   * @returns {Promise<{ok: boolean, sessions: Array}>}
   */
  async getSessionHistory({ courtNumber, memberName, dateStart, dateEnd, limit = 50 }: { courtNumber?: number; memberName?: string; dateStart?: string; dateEnd?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (courtNumber) params.append('court_number', String(courtNumber));
    if (memberName) params.append('member_name', memberName);
    if (dateStart) params.append('date_start', dateStart);
    if (dateEnd) params.append('date_end', dateEnd);
    params.append('limit', limit.toString());

    return this.api.get(`/get-session-history?${params.toString()}`);
  }

  /**
   * Get usage analytics heatmap data
   * @param {number} [days=90] - Number of days to analyze (7-365)
   * @returns {Promise<{ok: boolean, heatmap: Array<{day_of_week: number, hour: number, session_count: number}>, daysAnalyzed: number}>}
   */
  async getUsageAnalytics(days = 90) {
    return this.api.post('/get-usage-analytics', { days });
  }

  /**
   * Get unified analytics data (summary + heatmap)
   * @param {Object} params
   * @param {string} params.start - Start date (YYYY-MM-DD)
   * @param {string} params.end - End date (YYYY-MM-DD, inclusive)
   * @returns {Promise<{ok: boolean, summary: Object, heatmap: Array}>}
   */
  async getAnalytics({ start, end }) {
    return this.api.post('/get-analytics', { start, end });
  }

  /**
   * Get usage comparison data for bar chart
   * @param {Object} params
   * @param {string} params.metric - 'usage' (Phase 2: 'waittime')
   * @param {string} params.primaryStart - ISO date YYYY-MM-DD
   * @param {string} params.primaryEnd - ISO date YYYY-MM-DD
   * @param {string} params.granularity - 'auto' | 'day' | 'week' | 'month'
   * @param {string|null} params.comparisonStart - ISO date or null
   * @returns {Promise<{metric: string, unit: string, granularity: string, primary: Object, comparison: Object|null}>}
   */
  async getUsageComparison({
    metric = 'usage',
    primaryStart,
    primaryEnd,
    granularity = 'auto',
    comparisonStart = null,
  }) {
    const snakePayload = {
      metric,
      primary_start: primaryStart,
      primary_end: primaryEnd,
      granularity,
      comparison_start: comparisonStart,
    };

    const result = await this.api.post('/get-usage-comparison', snakePayload);

    // If backend rejects snake_case (schema validation), retry with legacy camelCase.
    // Business denial codes (COURT_OCCUPIED, etc.) always have a known code field —
    // a schema rejection returns ok:false without a recognised code.
    if (!result.ok && !result.code) {
      return this.api.post('/get-usage-comparison', {
        metric,
        primaryStart,
        primaryEnd,
        granularity,
        comparisonStart,
      });
    }

    return result;
  }

  async aiAssistant({ prompt, mode = 'draft', actions_token = null, confirm_destructive = false }) {
    return this.api.aiAssistant({ prompt, mode, actions_token, confirm_destructive });
  }

  /**
   * Update an active session (players, end time)
   * @param {Object} input
   * @param {string} input.sessionId - UUID of session to update
   * @param {Array<{name: string, type: 'member' | 'guest', member_id?: string}>} input.participants
   * @param {string|null} input.scheduledEndAt - ISO timestamp or null for "no end time" (midnight)
   * @param {string} input.deviceId - Admin device ID
   * @returns {Promise<{ok: boolean, session?: Object, code?: string, message?: string, serverNow?: string}>}
   */
  async updateSession(input) {
    const payload = {
      session_id: input.sessionId,
      participants: input.participants,
      scheduled_end_at: input.scheduledEndAt,
      device_id: input.deviceId,
    };

    const response = await this.api.post('/admin-update-session', payload);
    return {
      ok: response.ok,
      code: response.code,
      message: response.message || response.error,
      serverNow: response.serverNow,
      session: response.session,
    };
  }
}
