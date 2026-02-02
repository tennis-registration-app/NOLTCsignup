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
export function normalizeHeatmapRow(raw) {
  return {
    dayOfWeek: raw.dow ?? raw.day_of_week,
    hour: raw.hour,
    sessionCount: raw.count ?? raw.session_count,
  };
}

/**
 * Normalize a single transaction row (ball purchase or guest fee)
 * @param {Object} raw - Single transaction row from API
 * @returns {Object} Normalized transaction
 */
export function normalizeTransaction(raw) {
  return {
    id: raw.id,
    date: raw.date,
    time: raw.time,
    memberNumber: raw.member_number,
    accountName: raw.account_name,
    amountDollars: raw.amount_dollars,
    amountCents: raw.amount_cents,
    description: raw.description,
  };
}

/**
 * Normalize a single game history session row
 * @param {Object} raw - Single session row from API
 * @returns {Object} Normalized session
 */
export function normalizeGameSession(raw) {
  return {
    id: raw.id,
    courtNumber: raw.court_number,
    startedAt: raw.started_at,
    endedAt: raw.ended_at,
    endReason: raw.end_reason,
    participants: raw.participants,
  };
}

/**
 * Normalize a single calendar block/event from API
 * @param {Object} raw - Single block from API
 * @returns {Object} Normalized block
 */
export function normalizeCalendarBlock(raw) {
  return {
    id: raw.id,
    courtId: raw.courtId ?? raw.court_id,
    courtNumber: raw.courtNumber ?? raw.court_number,
    title: raw.title,
    blockType: raw.blockType ?? raw.block_type,
    startsAt: raw.startsAt ?? raw.starts_at,
    endsAt: raw.endsAt ?? raw.ends_at,
    isRecurring: raw.isRecurring ?? raw.is_recurring,
    recurrenceRule: raw.recurrenceRule ?? raw.recurrence_rule,
  };
}

/**
 * Normalize AI assistant response from API
 * @param {Object} raw - Raw AI assistant response
 * @returns {Object} Normalized response
 */
export function normalizeAiResponse(raw) {
  return {
    ok: raw.ok,
    error: raw.error,
    response: raw.response,
    proposedToolCalls: raw.proposed_tool_calls,
    actionsToken: raw.actions_token,
    requiresConfirmation: raw.requires_confirmation,
    executedActions: raw.executed_actions,
  };
}

/**
 * Normalize AI analytics summary data
 * @param {Object} raw - Raw analytics summary
 * @returns {Object} Normalized summary
 */
export function normalizeAiAnalyticsSummary(raw) {
  if (!raw) return null;
  return {
    totalSessions: raw.total_sessions,
    totalHours: raw.total_hours,
  };
}

/**
 * Normalize AI heatmap row for processing
 * @param {Object} raw - Raw heatmap row from AI response
 * @returns {Object} Normalized row
 */
export function normalizeAiHeatmapRow(raw) {
  return {
    dayOfWeek: raw.day_of_week,
    sessionCount: raw.session_count,
  };
}
