/**
 * Engagement Lookup — Domain-level query for player engagement
 *
 * Determines if a member is currently engaged (on a court or waitlist).
 * Uses ONLY memberId for matching — no name-based fallbacks.
 */

import type { Board } from '../types/domain';

/** Minimal board shape needed for engagement queries — avoids requiring the full Board type */
interface EngagementBoard {
  courts?: Array<{
    number: number;
    session: {
      group: {
        id?: string;
        players: Array<{ memberId: string; displayName?: string }>;
      };
    } | null;
  }>;
  waitlist?: Array<{
    position: number;
    group: {
      id?: string;
      players: Array<{ memberId: string; displayName?: string }>;
    };
  }>;
}

export interface Engagement {
  kind: 'court' | 'waitlist';
  courtNumber?: number;
  waitlistPosition?: number;
  groupId?: string;
  displayName?: string;
}

export function findEngagementByMemberId(board: Board | EngagementBoard, memberId: string): Engagement | null {
  if (!board || !memberId) return null;

  // Check courts
  for (const court of board.courts || []) {
    const players = court.session?.group?.players || [];
    const found = players.find((p) => p.memberId === memberId);
    if (found) {
      return {
        kind: 'court',
        courtNumber: court.number,
        groupId: court.session?.group?.id,
        displayName: found.displayName,
      };
    }
  }

  // Check waitlist
  for (const entry of board.waitlist || []) {
    const players = entry.group?.players || [];
    const found = players.find((p) => p.memberId === memberId);
    if (found) {
      return {
        kind: 'waitlist',
        waitlistPosition: entry.position,
        groupId: entry.group?.id,
        displayName: found.displayName,
      };
    }
  }

  return null;
}

/**
 * Build an index of all engaged members for fast lookup
 * @param {import('../types/domain.js').Board} board - Domain board
 * @returns {Map<string, Engagement>} - Map of memberId to Engagement
 */
export function buildEngagementIndex(board: Board): Map<string, Engagement> {
  const index: Map<string, Engagement> = new Map();

  if (!board) return index;

  // Index court players
  for (const court of board.courts || []) {
    const players = court.session?.group?.players || [];
    for (const player of players) {
      if (player.memberId) {
        index.set(player.memberId, {
          kind: 'court',
          courtNumber: court.number,
          groupId: court.session?.group?.id,
          displayName: player.displayName,
        });
      }
    }
  }

  // Index waitlist players
  for (const entry of board.waitlist || []) {
    const players = entry.group?.players || [];
    for (const player of players) {
      if (player.memberId) {
        index.set(player.memberId, {
          kind: 'waitlist',
          waitlistPosition: entry.position,
          groupId: entry.group?.id,
          displayName: player.displayName,
        });
      }
    }
  }

  return index;
}

/**
 * Get a human-readable message for an engagement
 * @param {Engagement} engagement
 * @returns {string}
 */
export function getEngagementMessage(engagement: Engagement): string {
  if (!engagement) return '';

  if (engagement.kind === 'court') {
    return `${engagement.displayName || 'Player'} is already playing on Court ${engagement.courtNumber}`;
  }

  if (engagement.kind === 'waitlist') {
    return `${engagement.displayName || 'Player'} is already on the waitlist (position ${engagement.waitlistPosition})`;
  }

  return 'Player is already engaged';
}
