/**
 * Registration Helper Utilities
 *
 * Pure utility functions for player/name normalization and engagement detection.
 * These functions are used for duplicate checking and validation.
 */

import { getCourtStatuses } from '../../tennis/domain/availability.js';
import { readDataSafe, readJSON } from '../../lib/storage';
import { STORAGE } from '../../lib/constants';

type NameLike = string | { name?: string; fullName?: string; playerName?: string; displayName?: string } | null | undefined;
type CourtDataLike = { courts?: unknown[]; waitlist?: unknown[] } | null | undefined;
type BlockLike = { isWetCourt?: unknown; startTime?: unknown; start?: unknown; endTime?: unknown; end?: unknown; courtNumber: number };

export function normalizeName(n: NameLike): string {
  const obj = n as { name?: string; fullName?: string; playerName?: string } | null | undefined;
  return (obj?.name ?? obj?.fullName ?? obj?.playerName ?? (n as string | number | null | undefined) ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function findEngagementFor(name: NameLike, data: CourtDataLike): { type: string; court?: number; position?: number } | null {
  const norm = normalizeName(name);

  const courts = Array.isArray(data?.courts) ? data.courts : [];
  for (let i = 0; i < courts.length; i++) {
    const court = courts[i] as { session?: { group?: { players?: NameLike[] } } };
    const session = court?.session;
    if (!session) continue;
    const players = Array.isArray(session.group?.players) ? (session.group.players as NameLike[]) : [];
    for (const p of players) {
      if (
        normalizeName(p) === norm ||
        normalizeName((p as { name?: string })?.name) === norm ||
        normalizeName((p as { displayName?: string })?.displayName) === norm
      ) {
        return { type: 'playing', court: i + 1 };
      }
    }
  }

  const wg = Array.isArray(data?.waitlist) ? data.waitlist : [];
  for (let i = 0; i < wg.length; i++) {
    const entry = wg[i] as { group?: { players?: NameLike[] } };
    const players = Array.isArray(entry?.group?.players) ? (entry.group.players as NameLike[]) : [];
    for (const p of players) {
      if (
        normalizeName(p) === norm ||
        normalizeName((p as { name?: string })?.name) === norm ||
        normalizeName((p as { displayName?: string })?.displayName) === norm
      ) {
        return { type: 'waitlist', position: i + 1 };
      }
    }
  }

  return null;
}

export function validateGuestName(name: unknown): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  return words.length >= 2;
}

export function computeOccupiedCourts() {
  const now = new Date();
  const data = readDataSafe();
  const blocks = readJSON(STORAGE.BLOCKS) || [];
  const wetSet: Set<number> = new Set(
    (blocks || [])
      .filter((b: BlockLike) =>
          b?.isWetCourt &&
          new Date((b.startTime ?? b.start) as string) <= now &&
          now < new Date((b.endTime ?? b.end) as string)
      )
      .map((b: BlockLike) => b.courtNumber)
  );
  const statuses = getCourtStatuses({ data: data as any, now, blocks, wetSet });
  const occupied = statuses.filter((s) => s.status === 'occupied').map((s) => s.courtNumber);
  return { occupied, data };
}

export function getCourtsOccupiedForClearing() {
  const now = new Date();
  const data = readDataSafe();
  const blocks = readJSON(STORAGE.BLOCKS) || [];
  const wetSet: Set<number> = new Set(
    blocks
      .filter((b: BlockLike) =>
          b?.isWetCourt &&
          new Date((b.startTime ?? b.start) as string) <= now &&
          now < new Date((b.endTime ?? b.end) as string)
      )
      .map((b: BlockLike) => b.courtNumber)
  );

  const statuses = getCourtStatuses({ data: data as any, now, blocks, wetSet });
  const clearableCourts = statuses
    .filter((s) => (s.isOccupied || s.isOvertime) && !s.isBlocked)
    .map((s) => s.courtNumber)
    .sort((a: number, b: number) => a - b);
  return clearableCourts;
}
