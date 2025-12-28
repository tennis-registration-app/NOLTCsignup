/**
 * Normalize a block from API response to Domain Block
 *
 * @param {Object} raw - Raw block from API
 * @param {string} serverNow - Server time for isActive calculation
 * @returns {import('../types/domain.js').Block}
 */
export function normalizeBlock(raw, serverNow) {
  if (!raw) return null;

  const startsAt = raw.startsAt || raw.starts_at || raw.startTime || '';
  const endsAt = raw.endsAt || raw.ends_at || raw.endTime || '';

  // Calculate if block is currently active
  const now = serverNow ? new Date(serverNow) : new Date();
  const isActive = startsAt && endsAt ? now >= new Date(startsAt) && now < new Date(endsAt) : false;

  return {
    id: raw.id || raw.blockId || raw.block_id || 'unknown',
    courtNumber: raw.courtNumber || raw.court_number || raw.courtNum || 0,
    startsAt,
    endsAt,
    reason: raw.reason || raw.description || '',
    isActive,
  };
}
