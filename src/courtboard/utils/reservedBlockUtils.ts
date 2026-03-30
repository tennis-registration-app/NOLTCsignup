/**
 * Reserved block normalization and filtering logic.
 *
 * NOTE: This is the canonical testable version. An identical copy exists in
 * mobile-fallback-bar.js (IIFE, loaded via <script> tag — cannot import ESM).
 * Deletion condition: when mobile-fallback-bar.js is migrated to ESM (ADR-006),
 * the IIFE copy should be removed and this module imported instead.
 */


interface RawBlock {
  startTime?: string;
  start?: string;
  endTime?: string;
  end?: string;
  courts?: unknown[];
  courtNumber?: unknown;
  reason?: string;
  templateName?: string;
}

/**
 * Normalize a raw block object into a standard shape.
 * Accepts both `startTime/endTime` and `start/end` field names.
 * Accepts both `courts` array and single `courtNumber`.
 * @param {Object|null|undefined} block
 * @returns {{ courts: any[], start: Date, end: Date, reason: string } | null}
 */
export function normalizeBlock(block: RawBlock | null | undefined): { courts: unknown[]; start: Date; end: Date; reason: string } | null {
  if (!block) return null;
  const start = new Date((block.startTime || block.start) as string);
  const end = new Date((block.endTime || block.end) as string);
  const courts = Array.isArray(block.courts) ? block.courts : [block.courtNumber].filter(Boolean);
  const reason = (block.reason || block.templateName || 'Reserved') as string;
  if (!start || !end || courts.length === 0) return null;
  return { courts, start, end, reason };
}

/**
 * Filter and group blocks into reserved items for today (from `now` forward).
 * Blocks are normalized, filtered to today-and-future, grouped by
 * reason+start+end key, and sorted by start time.
 * @param {Array|null|undefined} blocks - Raw block objects
 * @param {Date} now - Current time
 * @returns {Array<{ key: string, courts: number[], start: Date, end: Date, reason: string }>}
 */
export function selectReservedSafe(blocks: RawBlock[] | null | undefined, now: Date): Array<{ key: string; courts: number[]; start: Date; end: Date; reason: string }> {
  try {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    type NormalizedBlock = { courts: unknown[]; start: Date; end: Date; reason: string };
    const normalized = (blocks || []).map(normalizeBlock).filter(
      (b): b is NormalizedBlock => b != null
    );
    const todayFuture = normalized
      .filter((b) => b.end > now && b.start <= endOfToday)
      .map((b) => ({ ...b, end: b.end > endOfToday ? endOfToday : b.end }))
      .sort((a: NormalizedBlock, b: NormalizedBlock) => a.start.getTime() - b.start.getTime());

    const byKey = new Map();
    for (const b of todayFuture) {
      const k = `${b.reason}|${b.start.toISOString()}|${b.end.toISOString()}`;
      if (!byKey.has(k)) byKey.set(k, { ...b, courts: new Set(b.courts) });
      else b.courts.forEach((c: unknown) => (byKey.get(k) as { courts: Set<unknown> }).courts.add(c));
    }

    return Array.from(byKey.values()).map((v) => ({
      key: `${v.reason}|${v.start.getTime()}|${v.end.getTime()}`,
      courts: (Array.from(v.courts) as number[]).sort((a, b) => a - b),
      start: v.start,
      end: v.end,
      reason: v.reason,
    }));
  } catch (e) {
    console.warn('Error in selectReservedSafe:', e);
    return [];
  }
}
