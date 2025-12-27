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

import { TENNIS_CONFIG } from './config.js';
import { getCourtBlockStatus as _getCourtBlockStatus } from './court-blocks.js';

// Get court block status - prefer shared, fallback to window
const getCourtBlockStatus = (courtNumber) => {
  try {
    const fn = _getCourtBlockStatus ||
               window.Tennis?.Domain?.blocks?.getCourtBlockStatus ||
               window.getCourtBlockStatus;
    return fn ? fn(courtNumber) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Helper to compare two player groups for equality
 * Compares by memberId, then id, then name (case-insensitive)
 */
const sameGroup = (a = [], b = []) => {
  const norm = (p) => {
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
  formatPlayerDisplayName(name) {
    if (!name) return '';
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || firstName;
    return nameParts.length > 1
      ? `${firstName.charAt(0)}. ${lastName}`
      : firstName;
  },

  /**
   * Calculate estimated wait time for a position in the waitlist
   * @param {number} position - Position in waitlist (1-indexed)
   * @param {Array} courts - Array of court data
   * @param {Date} currentTime - Current time
   * @param {number} avgGameTime - Average game duration in minutes (default: 75)
   * @returns {number} Estimated wait time in minutes
   */
  calculateEstimatedWaitTime(position, courts, currentTime, avgGameTime = 75) {
    if (!courts || !Array.isArray(courts) || position < 1) return 0;

    const courtEndTimes = courts
      .map(court => {
        if (!court) return null;

        // Prefer end time of current game if available
        if (court.current?.endTime) {
          return new Date(court.current.endTime).getTime();
        }

        // Check for blocks using new system
        const courtIndex = courts.indexOf(court);
        const blockStatus = getCourtBlockStatus(courtIndex + 1);
        if (blockStatus && blockStatus.endTime) {
          return new Date(blockStatus.endTime).getTime();
        }

        return null;
      })
      .filter(time => time && time > currentTime.getTime())
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
  isPlayerAlreadyPlaying(playerId, data, currentGroup = []) {
    // Defensive: if data is missing or malformed, player is not playing
    if (!data) return { isPlaying: false };

    // Check courts
    const courts = data.courts || [];
    for (let i = 0; i < courts.length; i++) {
      const court = courts[i];

      // Check old structure
      if (court && court.players && court.players.some(player => player.id === playerId)) {
        const player = court.players.find(p => p.id === playerId);
        return {
          isPlaying: true,
          location: 'court',
          courtNumber: i + 1,
          playerName: player ? player.name : 'Player'
        };
      }

      // Check new structure
      if (court && court.current && court.current.players && court.current.players.some(player => player.id === playerId)) {
        const player = court.current.players.find(p => p.id === playerId);
        return {
          isPlaying: true,
          location: 'court',
          courtNumber: i + 1,
          playerName: player ? player.name : 'Player'
        };
      }
    }

    // Check waiting groups
    const waitingGroups = data.waitingGroups || [];
    for (let i = 0; i < waitingGroups.length; i++) {
      const group = waitingGroups[i];
      if (group && group.players && group.players.some(player => player.id === playerId)) {
        const player = group.players.find(p => p.id === playerId);
        return {
          isPlaying: true,
          location: 'waiting',
          position: i + 1,
          playerName: player ? player.name : 'Player'
        };
      }
    }

    // Check current group
    if (currentGroup && currentGroup.some(player => player.id === playerId)) {
      const player = currentGroup.find(p => p.id === playerId);
      return {
        isPlaying: true,
        location: 'current',
        playerName: player ? player.name : 'Player'
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
    groupSize,
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
  checkGroupOverlap(group1, group2) {
    if (!group1 || !group2 || !Array.isArray(group1) || !Array.isArray(group2)) {
      return { hasOverlap: false, overlappingPlayers: [], isSubset: false, isSuperset: false };
    }

    const ids1 = group1.map(p => p.id);
    const ids2 = group2.map(p => p.id);

    const overlappingIds = ids1.filter(id => ids2.includes(id));
    const overlappingPlayers = group1.filter(p => overlappingIds.includes(p.id));

    const result = {
      hasOverlap: overlappingIds.length > 0,
      overlappingPlayers: overlappingPlayers,
      overlappingCount: overlappingIds.length,
      isExactMatch: ids1.length === ids2.length && overlappingIds.length === ids1.length,
      isSubset: overlappingIds.length === ids2.length && ids1.length > ids2.length,
      isSuperset: overlappingIds.length === ids1.length && ids2.length > ids1.length,
      group1Size: ids1.length,
      group2Size: ids2.length
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
  getOriginalEndTimeForGroup(players, recentlyCleared) {
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
  sameGroup
};

// Export singleton for backward compatibility
export const tennisBusinessLogic = TennisBusinessLogic;

// Default export
export default TennisBusinessLogic;
