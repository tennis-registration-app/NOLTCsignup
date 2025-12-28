// Data Validation Utilities for Registration
// Extracted from App.jsx for modularity

import { TENNIS_CONFIG as _sharedTennisConfig } from '@lib';

const TENNIS_CONFIG = _sharedTennisConfig;

// Debug flag - matches App.jsx pattern
const DEBUG = false;

// Minimal logger for validation module
const log = {
  debug: (...a) => {
    if (DEBUG) console.debug('[DataValidation]', ...a);
  },
};

export const DataValidation = {
  isValidCourtNumber(courtNumber) {
    return (
      Number.isInteger(courtNumber) &&
      courtNumber >= 1 &&
      courtNumber <= TENNIS_CONFIG.COURTS.TOTAL_COUNT
    );
  },

  isValidPlayer(player) {
    // ID can be:
    // - A number (legacy hardcoded data)
    // - A numeric string like "1021" (legacy)
    // - A UUID string like "4f3a4213-4c17-44e1-aeea-1ac0276bcfa2" (API backend)
    const hasValidId =
      typeof player.id === 'number' || (typeof player.id === 'string' && player.id.length > 0);

    return (
      player &&
      typeof player === 'object' &&
      hasValidId &&
      typeof player.name === 'string' &&
      player.name.trim().length > 0
    );
  },

  isValidGroup(group) {
    return (
      Array.isArray(group) &&
      group.length >= 0 && // Changed from MIN_PER_GROUP to allow empty arrays for blocked courts
      group.length <= TENNIS_CONFIG.PLAYERS.MAX_PER_GROUP &&
      group.every((player) => this.isValidPlayer(player))
    );
  },

  isValidDuration(duration) {
    return Number.isInteger(duration) && duration > 0 && duration <= 240; // Max 4 hours
  },

  isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
  },

  isValidCourtData(court) {
    if (!court) return true; // null/empty court is valid

    // Special case for cleared courts
    if (court.wasCleared) {
      return (
        court &&
        typeof court === 'object' &&
        this.isValidGroup(court.players) &&
        this.isValidDate(new Date(court.startTime)) &&
        this.isValidDate(new Date(court.endTime))
      );
    }

    // Domain format validation: court.session.group.players
    if (court.session || court.history) {
      // Validate the Domain structure
      const hasValidHistory = !court.history || Array.isArray(court.history);
      const hasValidSession =
        !court.session ||
        (court.session &&
          typeof court.session === 'object' &&
          this.isValidGroup(court.session.group?.players) &&
          this.isValidDate(new Date(court.session.startedAt)) &&
          this.isValidDate(new Date(court.session.scheduledEndAt)));

      return hasValidHistory && hasValidSession;
    }

    // Remove old block validation - blocks are now handled via courtBlocks localStorage
    // Old court.blocked properties are no longer used

    // Regular court validation
    return (
      court &&
      typeof court === 'object' &&
      this.isValidGroup(court.players) &&
      this.isValidDate(new Date(court.startTime)) &&
      this.isValidDate(new Date(court.endTime)) &&
      new Date(court.endTime) > new Date(court.startTime)
    );
  },

  sanitizeStorageData(data) {
    // Ensure data has the correct structure
    const sanitized = {
      courts: Array(TENNIS_CONFIG.COURTS.TOTAL_COUNT).fill(null),
      waitingGroups: [],
      recentlyCleared: [], // Include in sanitized structure
    };

    // Validate and copy courts
    if (Array.isArray(data.courts)) {
      data.courts.forEach((court, index) => {
        if (index < TENNIS_CONFIG.COURTS.TOTAL_COUNT) {
          if (this.isValidCourtData(court)) {
            sanitized.courts[index] = court;
          }
        }
      });
    }

    // Validate and copy waiting groups
    if (Array.isArray(data.waitingGroups)) {
      sanitized.waitingGroups = data.waitingGroups.filter((group) => {
        return (
          group &&
          typeof group === 'object' &&
          this.isValidGroup(group.players) &&
          this.isValidDate(new Date(group.timestamp || new Date()))
        );
      });
    }

    // Validate and copy recently cleared sessions
    if (Array.isArray(data.recentlyCleared)) {
      const now = new Date();
      sanitized.recentlyCleared = data.recentlyCleared.filter((session) => {
        const isValid =
          session &&
          typeof session === 'object' &&
          this.isValidGroup(session.players) &&
          session.originalEndTime &&
          this.isValidDate(new Date(session.originalEndTime)) &&
          new Date(session.originalEndTime) > now; // Only keep future end times

        if (!isValid && session) {
          if (DEBUG) {
            log.debug('Filtered out session:', {
              session,
              hasValidGroup: session.players ? this.isValidGroup(session.players) : false,
              hasOriginalEndTime: !!session.originalEndTime,
              isValidDate: session.originalEndTime
                ? this.isValidDate(new Date(session.originalEndTime))
                : false,
              isFutureEndTime: session.originalEndTime
                ? new Date(session.originalEndTime) > now
                : false,
            });
          }
        }

        return isValid;
      });
    }

    return sanitized;
  },
};

export default DataValidation;
