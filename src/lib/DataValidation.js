/**
 * Data Validation Utilities
 *
 * Provides validation functions for tennis court management data.
 * Used by TennisDataService and other consumers to ensure data integrity.
 */

import { TENNIS_CONFIG } from './config.js';

// Debug flag
const DEBUG = false;

// Minimal logger for validation module
const log = {
  debug: (...a) => { if (DEBUG) console.debug('[DataValidation]', ...a); },
};

export const DataValidation = {
  isValidCourtNumber(courtNumber) {
    return Number.isInteger(courtNumber) &&
           courtNumber >= 1 &&
           courtNumber <= TENNIS_CONFIG.COURTS.TOTAL_COUNT;
  },

  isValidPlayer(player) {
    return player &&
           typeof player === 'object' &&
           (typeof player.id === 'number' || (typeof player.id === 'string' && !isNaN(Number(player.id)))) &&
           typeof player.name === 'string' &&
           player.name.trim().length > 0;
  },

  isValidGroup(group) {
    return Array.isArray(group) &&
           group.length >= 0 && // Allow empty arrays for blocked courts
           group.length <= TENNIS_CONFIG.PLAYERS.MAX_PER_GROUP &&
           group.every(player => this.isValidPlayer(player));
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
      return court &&
             typeof court === 'object' &&
             this.isValidGroup(court.players) &&
             this.isValidDate(new Date(court.startTime)) &&
             this.isValidDate(new Date(court.endTime));
    }

    // Special case for NEW STRUCTURE with current and history
    if (court.current || court.history) {
      const hasValidHistory = !court.history || Array.isArray(court.history);
      const hasValidCurrent = !court.current || (
        court.current &&
        typeof court.current === 'object' &&
        this.isValidGroup(court.current.players) &&
        this.isValidDate(new Date(court.current.startTime)) &&
        this.isValidDate(new Date(court.current.endTime))
      );

      return hasValidHistory && hasValidCurrent;
    }

    // Regular court validation
    return court &&
           typeof court === 'object' &&
           this.isValidGroup(court.players) &&
           this.isValidDate(new Date(court.startTime)) &&
           this.isValidDate(new Date(court.endTime)) &&
           new Date(court.endTime) > new Date(court.startTime);
  },

  sanitizeStorageData(data) {
    // Ensure data has the correct structure
    const sanitized = {
      courts: Array(TENNIS_CONFIG.COURTS.TOTAL_COUNT).fill(null),
      waitingGroups: [],
      recentlyCleared: []
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
      sanitized.waitingGroups = data.waitingGroups.filter(group => {
        return group &&
               typeof group === 'object' &&
               this.isValidGroup(group.players) &&
               this.isValidDate(new Date(group.timestamp || new Date()));
      });
    }

    // Validate and copy recently cleared sessions
    if (Array.isArray(data.recentlyCleared)) {
      const now = new Date();
      sanitized.recentlyCleared = data.recentlyCleared.filter(session => {
        const isValid = session &&
               typeof session === 'object' &&
               this.isValidGroup(session.players) &&
               session.originalEndTime &&
               this.isValidDate(new Date(session.originalEndTime)) &&
               new Date(session.originalEndTime) > now;

        if (!isValid && session && DEBUG) {
          log.debug("Filtered out session:", {
            session,
            hasValidGroup: session.players ? this.isValidGroup(session.players) : false,
            hasOriginalEndTime: !!session.originalEndTime,
            isValidDate: session.originalEndTime ? this.isValidDate(new Date(session.originalEndTime)) : false,
            isFutureEndTime: session.originalEndTime ? new Date(session.originalEndTime) > now : false
          });
        }

        return isValid;
      });
    }

    return sanitized;
  }
};

export default DataValidation;
