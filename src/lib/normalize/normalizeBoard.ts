import { normalizeCourt } from './normalizeCourt';
import { normalizeWaitlistEntry } from './normalizeWaitlistEntry';
import type { Board } from '../types/domain';

/**
 * Normalize complete board from API response to Domain Board
 *
 * THIS IS THE ONLY PUBLIC ENTRY POINT FOR NORMALIZATION.
 * Components should never import individual normalizers.
 *
 * @param {Object} raw - Raw response from /get-board API
 * @returns {import('../types/domain.js').Board}
 */
export function normalizeBoard(raw: Record<string, unknown> | null): Board {
  if (!raw) {
    console.error('[normalizeBoard] Received null/undefined response');
    return {
      serverNow: new Date().toISOString(),
      courts: [],
      waitlist: [],
    };
  }

  // Validate expected top-level fields
  if (!raw.courts) {
    console.warn('[normalizeBoard] Missing courts array');
  }
  if (!raw.serverNow) {
    console.warn('[normalizeBoard] Missing serverNow');
  }

  const serverNow = String(raw.serverNow || new Date().toISOString());

  // Normalize courts
  const courts = Array.isArray(raw.courts)
    ? (raw.courts as Record<string, unknown>[]).map((c) => normalizeCourt(c, serverNow))
    : [];

  // Normalize waitlist
  const rawWaitlist = raw.waitlist || raw.waitingGroups || [];
  const waitlist = Array.isArray(rawWaitlist)
    ? (rawWaitlist as Record<string, unknown>[]).map((w) => normalizeWaitlistEntry(w, serverNow))
    : [];

  // Sort waitlist by position
  waitlist.sort((a, b) => a.position - b.position);

  // Extract active blocks from courts for availability calculations
  // The availability module (getFreeCourtsInfo) expects a top-level blocks array
  // This ONLY contains currently active blocks (for availability logic)
  const blocks: { courtNumber: number; startTime: string; endTime: string; title: string; isActive: boolean }[] = courts
    .filter((c) => c.block !== null)
    .map((c) => ({
      courtNumber: c.number,
      startTime: c.block!.startsAt,
      endTime: c.block!.endsAt,
      title: c.block!.reason,
      isActive: c.block!.isActive,
    }));

  // Normalize upcoming blocks from API (future blocks for today)
  // This is SEPARATE from blocks - for display only, not availability calculations
  const upcomingBlocks: { id?: string; courtNumber: number; startTime: string; endTime: string; title: string; reason?: string; isActive: boolean }[] = Array.isArray(raw.upcomingBlocks)
    ? (raw.upcomingBlocks as Record<string, unknown>[]).map((b) => ({
        id: b.id != null ? String(b.id) : undefined,
        courtNumber: Number(b.courtNumber),
        startTime: String(b.startsAt || ''),
        endTime: String(b.endsAt || ''),
        title: String(b.title || ''),
        reason: b.blockType != null ? String(b.blockType) : undefined,
        isActive: false,
      }))
    : [];

  // Pass through operating hours from API (already in correct format)
  const operatingHours = (raw.operatingHours as { day_of_week: number; opens_at: string; closes_at: string; is_closed: boolean }[]) || [];

  return {
    serverNow,
    courts,
    waitlist,
    blocks, // Active blocks only (for availability)
    upcomingBlocks, // Future blocks today (for display)
    operatingHours,
  };
}
