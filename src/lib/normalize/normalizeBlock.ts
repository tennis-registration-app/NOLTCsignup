// @ts-check
/**
 * Normalize a block from API response to Domain Block
 *
 * @param {Object} raw - Raw block from API
 * @param {string} serverNow - Server time for isActive calculation
 * @returns {import('../types/domain.js').Block | null}
 */
export function normalizeBlock(raw: Record<string, unknown>, serverNow: string) {
  if (!raw) return null;

  const startsAt = String(raw.startsAt || raw.starts_at || raw.startTime || '');
  const endsAt = String(raw.endsAt || raw.ends_at || raw.endTime || '');

  // Calculate if block is currently active
  const now = serverNow ? new Date(serverNow) : new Date();
  const isActive = startsAt && endsAt ? now >= new Date(startsAt) && now < new Date(endsAt) : false;

  return {
    id: String(raw.id || raw.blockId || raw.block_id || 'unknown'),
    courtNumber: Number(raw.courtNumber || raw.court_number || raw.courtNum || 0),
    startsAt,
    endsAt,
    reason: String(raw.reason || raw.description || ''),
    blockType: raw.blockType != null ? String(raw.blockType) : (raw.block_type != null ? String(raw.block_type) : (raw.type != null ? String(raw.type) : undefined)),
    isActive,
  };
}
