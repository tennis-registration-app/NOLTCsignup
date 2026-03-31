/**
 * Domain Helper Functions for Courts and Sessions
 *
 * RULES:
 * - Pure functions only (no React, no DOM, no fetch, no localStorage)
 * - Accept Domain objects only
 * - Deterministic and easy to unit-test
 */

import type { Court, DomainSession, DomainWaitlistEntry, DomainMember } from '../types/domain';

export function getCourtPlayerNames(court: Court): string[] {
  if (!court?.session?.group?.players) return [];
  return court.session.group.players.map((p: DomainMember) => p.displayName);
}

export function getSessionMinutesRemaining(session: DomainSession | null, serverNow: string): number {
  if (!session?.scheduledEndAt || !serverNow) return 0;
  const endTime = new Date(session.scheduledEndAt).getTime();
  const now = new Date(serverNow).getTime();
  const diffMs = endTime - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60000);
}

export function isSessionOvertime(session: DomainSession | null, serverNow: string): boolean {
  if (!session?.scheduledEndAt || !serverNow) return false;
  if (session.actualEndAt) return false;
  return new Date(serverNow) > new Date(session.scheduledEndAt);
}

export function getWaitlistEntryNames(entry: DomainWaitlistEntry): string[] {
  if (!entry?.group?.players) return [];
  return entry.group.players.map((p: DomainMember) => p.displayName);
}

export function getAvailableCourts(courts: Court[]): Court[] {
  if (!Array.isArray(courts)) return [];
  return courts.filter((c) => c.isAvailable);
}

export function getOccupiedCourts(courts: Court[]): Court[] {
  if (!Array.isArray(courts)) return [];
  return courts.filter((c) => c.isOccupied);
}

export function findCourtByNumber(courts: Court[], courtNumber: number): Court | undefined {
  if (!Array.isArray(courts)) return undefined;
  return courts.find((c) => c.number === courtNumber);
}
