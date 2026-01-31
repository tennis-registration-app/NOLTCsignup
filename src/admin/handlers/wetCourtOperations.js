/**
 * Wet Court Backend Operations
 * Pure backend calls extracted verbatim from admin/App.jsx handlers.
 * NO state updates, NO Events.emitDom, NO refresh signals.
 */

/**
 * Activate wet courts (mark all courts as wet)
 * Extracted from: handleEmergencyWetCourt
 * @param {Object} ctx - Context with dependencies
 * @param {Object} ctx.backend - Backend API
 * @param {Function} ctx.getDeviceId - Device ID getter
 * @returns {Promise<Object>} - Raw backend result: {ok, courtsMarked, endsAt, courtNumbers, message}
 */
export async function activateWetCourtsOp(ctx) {
  const { backend, getDeviceId } = ctx;

  const result = await backend.admin.markWetCourts({
    deviceId: getDeviceId(),
    durationMinutes: 720, // 12 hours
    reason: 'WET COURT',
    idempotencyKey: `wet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });

  return result;
}

/**
 * Clear all wet court blocks
 * Extracted from: removeAllWetCourtBlocks
 * @param {Object} ctx - Context with dependencies
 * @param {Object} ctx.backend - Backend API
 * @param {Function} ctx.getDeviceId - Device ID getter
 * @returns {Promise<Object>} - Raw backend result: {ok, blocksCleared, message}
 */
export async function clearAllWetCourtsOp(ctx) {
  const { backend, getDeviceId } = ctx;

  const result = await backend.admin.clearWetCourts({
    deviceId: getDeviceId(),
  });

  return result;
}

/**
 * Clear a single wet court
 * Extracted from: clearWetCourt
 * @param {Object} ctx - Context with dependencies
 * @param {Object} ctx.backend - Backend API
 * @param {Function} ctx.getDeviceId - Device ID getter
 * @param {string} ctx.courtId - Court ID to clear
 * @returns {Promise<Object>} - Raw backend result: {ok, blocksCleared, message}
 */
export async function clearWetCourtOp(ctx) {
  const { backend, getDeviceId, courtId } = ctx;

  const result = await backend.admin.clearWetCourts({
    deviceId: getDeviceId(),
    courtIds: [courtId],
  });

  return result;
}
