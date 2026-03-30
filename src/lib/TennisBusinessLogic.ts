/**
 * TennisBusinessLogic - Business rules and calculations for tennis court management
 *
 * Contains utility functions for:
 * - Player name formatting
 * - Wait time calculations
 * - Player status checking
 * - Game duration calculations
 * - Group overlap detection
 * - Re-registration blocking logic
 */

import { TENNIS_CONFIG } from './config';
import { getCourtBlockStatus as _getCourtBlockStatus } from './court-blocks';

// Get court block status - direct import (window fallbacks removed as dead code)
const getCourtBlockStatus = (courtNumber: number) => {
  try {
    return _getCourtBlockStatus ? _getCourtBlockStatus(courtNumber) : null;
  } catch {
    return null;
  }
};

/**
 * Helper to compare two player groups for equality
 * Compares by memberId, then id, then name (case-insensitive)
 */
const sameGroup = (a: Array<Record<string, unknown>> = [], b: Array<Record<string, unknown>> = []) => {
  const norm = (p: Record<string, unknown>) => {
    const memberId = String(p?.memberId || '');
    const id = String(p?.id || '');
    const name = String(p?.name || '');
    return memberId.toLowerCase() || id.toLowerCase() || name.trim().toLowerCase();
  };
  if (a.length !== b.length) return false;
  const A = a.map(norm).sort();
  const B = b.map(norm).sort();
  return A.every((x, i) => x === B[i]);
};

export const TennisBusinessLogic = {
  /**
   * Format player name for display (e.g., "John Smith" -> "J. Smith")
   */
  formatPlayerDisplayName(name: string) {
    if (!name) return '';
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || firstName;
    return nameParts.length > 1 ? `${firstName.charAt(0)}. ${lastName}` : firstName;
  },

  /**
   * Calculate estimated wait time for a position in the waitlist
   * @param {number} position - Position in waitlist (1-indexed)
   * @param {Array} courts - Array of court data
   * @param {Date} currentTime - Current time
   * @param {number} avgGameTime - Average game duration in minutes (default: 75)
   * @returns {number} Estimated wait time in minutes
   */
  calculateEstimatedWaitTime(position: number, courts: Record<string, unknown>[], currentTime: Date, avgGameTime = 75) {
    if (!courts || !Array.isArray(courts) || position < 1) return 0;

    const courtEndTimes = courts
      .map((court) => {
        if (!court) return null;

        // Prefer end time of current session if available (Domain format)
        if (court.session?.scheduledEndAt) {
          return new Date(court.session.scheduledEndAt).getTime();
        }

        // Check for blocks using new system
        const courtIndex = courts.indexOf(court);
        const blockStatus = getCourtBlockStatus(courtIndex + 1);
        if (blockStatus && blockStatus.endTime) {
          return new Date(blockStatus.endTime).getTime();
        }

        return null;
      })
      .filter((time): time is number => time != null && time > currentTime.getTime())
      .sort((a, b) => a - b);

    // No courts ending soon, and you're first in line
    if (courtEndTimes.length === 0 && position === 1) return 0;

    // If your position is within the count of courts, return estimated time for that slot
    if (position <= courtEndTimes.length) {
      return Math.ceil((courtEndTimes[position - 1] - currentTime.getTime()) / 60000);
    }

    // Estimate based on cycles (rounds) through courts
    const courtsAvailable = courts.length;
    const rounds = Math.ceil(position / courtsAvailable);

    if (courtEndTimes.length > 0) {
      let waitTime = Math.ceil((courtEndTimes[0] - currentTime.getTime()) / 60000);
      waitTime += (rounds - 1) * avgGameTime;
      return waitTime;
    } else {
      return Math.ceil(((position - 1) / courtsAvailable) * avgGameTime);
    }
  },

  /**
   * Check if a player is already playing or waiting
   * @param {string|number} playerId - Player ID to check
   * @param {Object} data - Tennis data containing courts and waitingGroups
   * @param {Array} currentGroup - Current group being formed (optional)
   * @returns {Object} Status object with isPlaying, location, and details
   */
  isPlayerAlreadyPlaying(playerId: string | number, data: Record<string, unknown> | null | undefined, currentGroup: Array<{ id?: string | number; name?: string; displayName?: string; [key: string]: unknown }> = []) {
    // Defensive: if data is missing or malformed, player is not playing
    if (!data) return { isPlaying: false };

    // Check courts (Domain format: court.session.group.players)
    const courts = (data.courts as unknown[]) || [];
    for (const _court of courts) {
      const court = _court as Record<string, unknown>;
      const session = court?.session as Record<string, unknown> | undefined;
      const group = session?.group as Record<string, unknown> | undefined;
      const sessionPlayers = group?.players as Array<Record<string, unknown>> | undefined;
      if (sessionPlayers) {
        // Domain uses memberId, not id
        const player = sessionPlayers.find((p) => (p.memberId as unknown) === playerId);
        if (player) {
          return {
            isPlaying: true,
            location: 'court',
            courtNumber: court.number as number,
            playerName: (player.displayName as string) || 'Player',
          };
        }
      }
    }

    // Check waitlist (Domain format: data.waitlist[].group.players)
    const waitlist = (data.waitlist as unknown[]) || [];
    for (let i = 0; i < waitlist.length; i++) {
      const entry = waitlist[i] as Record<string, unknown>;
      const entryGroup = entry?.group as Record<string, unknown> | undefined;
      const players = entryGroup?.players as Array<Record<string, unknown>> | undefined;
      if (players) {
        // Domain uses memberId, not id
        const player = players.find((p) => (p.memberId as unknown) === playerId);
        if (player) {
          return {
            isPlaying: true,
            location: 'waiting',
            position: (entry.position as number) || i + 1,
            playerName: (player.displayName as string) || 'Player',
          };
        }
      }
    }

    // Check current group (uses id from UI layer)
    if (currentGroup && currentGroup.some((player) => player.id === playerId)) {
      const player = currentGroup.find((p) => p.id === playerId);
      return {
        isPlaying: true,
        location: 'current',
        playerName: player?.name || player?.displayName || 'Player',
      };
    }

    return { isPlaying: false };
  },

  /**
   * Calculate game duration based on group size
   * @param {number} groupSize - Number of players
   * @param {number} singlesMinutes - Duration for singles (default from config)
   * @param {number} doublesMinutes - Duration for doubles (default from config)
   * @param {number} maxPlayers - Max players threshold (default from config)
   * @returns {number} Duration in minutes
   */
  calculateGameDuration(
    groupSize: number,
    singlesMinutes = TENNIS_CONFIG.TIMING.SINGLES_DURATION_MIN,
    doublesMinutes = TENNIS_CONFIG.TIMING.DOUBLES_DURATION_MIN,
    maxPlayers = TENNIS_CONFIG.PLAYERS.MAX_PER_GROUP
  ) {
    return groupSize >= maxPlayers ? doublesMinutes : singlesMinutes;
  },

  /**
   * Check if two groups have overlapping players
   * @param {Array} group1 - First group of players
   * @param {Array} group2 - Second group of players
   * @returns {Object} Overlap details including hasOverlap, overlappingPlayers, isExactMatch, etc.
   */
  checkGroupOverlap(group1: Array<Record<string, unknown>>, group2: Array<Record<string, unknown>>) {
    if (!group1 || !group2 || !Array.isArray(group1) || !Array.isArray(group2)) {
      return { hasOverlap: false, overlappingPlayers: [], overlappingCount: 0, isExactMatch: false, isSubset: false, isSuperset: false, group1Size: 0, group2Size: 0 };
    }

    const ids1 = group1.map((p) => p.id);
    const ids2 = group2.map((p) => p.id);

    const overlappingIds = ids1.filter((id) => ids2.includes(id));
    const overlappingPlayers = group1.filter((p) => overlappingIds.includes(p.id));

    const result = {
      hasOverlap: overlappingIds.length > 0,
      overlappingPlayers: overlappingPlayers,
      overlappingCount: overlappingIds.length,
      isExactMatch: ids1.length === ids2.length && overlappingIds.length === ids1.length,
      isSubset: overlappingIds.length === ids2.length && ids1.length > ids2.length,
      isSuperset: overlappingIds.length === ids1.length && ids2.length > ids1.length,
      group1Size: ids1.length,
      group2Size: ids2.length,
    };

    return result;
  },

  /**
   * Check if any player in a group recently cleared a court and return their original end time
   * Used to enforce consistent session end times when players re-register early
   * @param {Array} players - Array of players to check
   * @param {Array} recentlyCleared - Array of recently cleared sessions
   * @returns {string|null} Original end time ISO string if found, null otherwise
   */
  getOriginalEndTimeForGroup(players: Array<Record<string, unknown>>, recentlyCleared: Array<{ originalEndTime: string; players: Array<Record<string, unknown>> }>) {
    const ps = Array.isArray(players) ? players : [];
    const rc = Array.isArray(recentlyCleared) ? recentlyCleared : [];

    if (ps.length === 0) return null;
    if (rc.length === 0) return null;

    const now = new Date();

    // Check each recently cleared session
    for (const session of rc) {
      // Skip if session has expired
      if (new Date(session.originalEndTime) <= now) {
        continue;
      }

      // Check if this is the exact same group that was recently cleared
      const hasExactMatch = sameGroup(ps, session.players);

      if (hasExactMatch) {
        return session.originalEndTime;
      }
    }

    return null;
  },

  // Expose sameGroup for external use
  sameGroup,
};

// Default export
export default TennisBusinessLogic;
