/**
 * Domain Helper Functions for Waitlist
 *
 * RULES:
 * - Pure functions only
 * - Accept Domain objects only
 */

import type { DomainWaitlistEntry } from '../types/domain';

export function getFirstWaitlistEntries(waitlist: DomainWaitlistEntry[], n = 1): DomainWaitlistEntry[] {
  if (!Array.isArray(waitlist)) return [];
  return waitlist.slice(0, n);
}

export function isMemberOnWaitlist(waitlist: DomainWaitlistEntry[], memberId: string): boolean {
  if (!Array.isArray(waitlist) || !memberId) return false;
  return waitlist.some((entry) => entry.group.players.some((p) => p.memberId === memberId));
}

export function findWaitlistEntryByMember(waitlist: DomainWaitlistEntry[], memberId: string): DomainWaitlistEntry | undefined {
  if (!Array.isArray(waitlist) || !memberId) return undefined;
  return waitlist.find((entry) => entry.group.players.some((p) => p.memberId === memberId));
}

export function getGroupTypeLabel(entry: DomainWaitlistEntry): string {
  const type = entry?.group?.type;
  switch (type) {
    case 'singles':
      return 'Singles';
    case 'doubles':
      return 'Doubles';
    default:
      return 'Group';
  }
}
