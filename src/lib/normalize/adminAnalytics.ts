// @ts-check

/**
 * Normalizes admin analytics data from API snake_case to internal camelCase.
 * These functions handle individual rows — apply with .map() to arrays.
 */

/**
 * Normalize a single usage heatmap data point
 * @param {Object} raw - Single row from API
 * @returns {Object} Normalized heatmap row
 */
export function normalizeHeatmapRow(raw: Record<string, unknown>) {
  return {
    dayOfWeek: Number(raw.dow ?? raw.day_of_week ?? 0),
    hour: Number(raw.hour ?? 0),
    sessionCount: Number(raw.count ?? raw.session_count ?? 0),
  };
}

/**
 * Normalize a single transaction row (ball purchase or guest fee)
 * @param {Object} raw - Single transaction row from API
 * @returns {Object} Normalized transaction
 */
export function normalizeTransaction(raw: Record<string, unknown>) {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    date: raw.date != null ? String(raw.date) : "",
    time: raw.time != null ? String(raw.time) : undefined,
    memberNumber: raw.member_number != null ? String(raw.member_number) : undefined,
    accountName: raw.account_name != null ? String(raw.account_name) : undefined,
    amountDollars: raw.amount_dollars != null ? String(raw.amount_dollars) : "0",
    amountCents: raw.amount_cents != null ? Number(raw.amount_cents) : 0,
    description: raw.description != null ? String(raw.description) : undefined,
  };
}

/**
 * Normalize a single game history session row
 * @param {Object} raw - Single session row from API
 * @returns {Object} Normalized session
 */
export function normalizeGameSession(raw: Record<string, unknown>) {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    courtNumber: raw.court_number != null ? Number(raw.court_number) : undefined,
    startedAt: raw.started_at != null ? String(raw.started_at) : undefined,
    endedAt: raw.ended_at != null ? String(raw.ended_at) : undefined,
    endReason: raw.end_reason != null ? String(raw.end_reason) : undefined,
    participants: raw.participants,
  };
}

/**
 * Normalize a single calendar block/event from API
 * @param {Object} raw - Single block from API
 * @returns {Object} Normalized block
 */
export function normalizeCalendarBlock(raw: Record<string, unknown>) {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    courtId: raw.courtId != null ? String(raw.courtId) : (raw.court_id != null ? String(raw.court_id) : undefined),
    courtNumber: raw.courtNumber != null ? Number(raw.courtNumber) : (raw.court_number != null ? Number(raw.court_number) : undefined),
    title: raw.title != null ? String(raw.title) : undefined,
    blockType: raw.blockType != null ? String(raw.blockType) : (raw.block_type != null ? String(raw.block_type) : undefined),
    startsAt: raw.startsAt != null ? String(raw.startsAt) : (raw.starts_at != null ? String(raw.starts_at) : undefined),
    endsAt: raw.endsAt != null ? String(raw.endsAt) : (raw.ends_at != null ? String(raw.ends_at) : undefined),
    isRecurring: raw.isRecurring != null ? Boolean(raw.isRecurring) : (raw.is_recurring != null ? Boolean(raw.is_recurring) : undefined),
    recurrenceRule: raw.recurrenceRule != null ? String(raw.recurrenceRule) : (raw.recurrence_rule != null ? String(raw.recurrence_rule) : undefined),
    recurrenceGroupId: raw.recurrenceGroupId != null ? String(raw.recurrenceGroupId) : (raw.recurrence_group_id != null ? String(raw.recurrence_group_id) : null),
  };
}

/**
 * Normalize AI assistant response from API
 * @param {Object} raw - Raw AI assistant response
 * @returns {Object} Normalized response
 */
export function normalizeAiResponse(raw: Record<string, unknown>) {
  return {
    ok: Boolean(raw.ok),
    error: raw.error != null ? String(raw.error) : undefined,
    response: String(raw.response || ""),
    proposedToolCalls: Array.isArray(raw.proposed_tool_calls) ? raw.proposed_tool_calls as Record<string, unknown>[] : undefined,
    actionsToken: raw.actions_token != null ? String(raw.actions_token) : null,
    requiresConfirmation: Boolean(raw.requires_confirmation),
    executedActions: Array.isArray(raw.executed_actions) ? raw.executed_actions as Record<string, unknown>[] : [],
  };
}

/**
 * Normalize AI analytics summary data
 * @param {Object} raw - Raw analytics summary
 * @returns {Object} Normalized summary
 */
export function normalizeAiAnalyticsSummary(raw: Record<string, unknown> | null) {
  if (!raw) return null;
  return {
    totalSessions: raw.total_sessions != null ? Number(raw.total_sessions) : 0,
    totalHours: raw.total_hours != null ? Number(raw.total_hours) : 0,
  };
}

/**
 * Normalize AI heatmap row for processing
 * @param {Object} raw - Raw heatmap row from AI response
 * @returns {Object} Normalized row
 */
export function normalizeAiHeatmapRow(raw: Record<string, unknown>) {
  return {
    dayOfWeek: Number(raw.day_of_week ?? 0),
    sessionCount: Number(raw.session_count ?? 0),
  };
}
