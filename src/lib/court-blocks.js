/**
 * Tennis Court Registration System - Court Block Utilities
 *
 * Functions for checking court block status and upcoming block warnings.
 * Used by Registration.html and CourtBoard.html.
 */

import { STORAGE } from './constants.js';
import { readJSON } from './storage.js';

/**
 * Get the current block status for a court
 * Checks for wet court blocks (priority) and other active blocks.
 *
 * @param {number} courtNumber - Court number to check
 * @returns {Object} Block status object
 * @returns {boolean} returns.isBlocked - Whether the court is currently blocked
 * @returns {boolean} returns.isCurrent - Whether a block is currently active
 * @returns {string} [returns.reason] - Reason for the block
 * @returns {string} [returns.title] - Title of the block event
 * @returns {Object} [returns.eventDetails] - Additional event details
 * @returns {string} [returns.startTime] - ISO string of block start time
 * @returns {string} [returns.endTime] - ISO string of block end time
 * @returns {number} [returns.remainingMinutes] - Minutes remaining in current block
 * @returns {boolean} returns.isWetCourt - Whether this is a wet court block
 */
export function getCourtBlockStatus(courtNumber) {
  const now = new Date();

  try {
    let blocks = [];
    try {
      blocks = readJSON(STORAGE.BLOCKS) || [];
    } catch {
      // Transient partial write; use empty array
    }

    // PRIORITY 1: Check for active wet court blocks first
    const wetBlock = blocks.find(
      (block) =>
        block.courtNumber === courtNumber &&
        block.isWetCourt === true &&
        new Date(block.endTime) >= now &&
        new Date(block.startTime) <= now
    );

    if (wetBlock) {
      return {
        isBlocked: true,
        isCurrent: true,
        reason: 'WET COURT',
        startTime: wetBlock.startTime,
        endTime: wetBlock.endTime,
        remainingMinutes: Math.ceil((new Date(wetBlock.endTime) - now) / (1000 * 60)),
        isWetCourt: true,
      };
    }

    // PRIORITY 2: Check for other active blocks (maintenance, lessons, etc.)
    const activeBlocks = blocks
      .filter(
        (block) =>
          block.courtNumber === courtNumber &&
          !block.isWetCourt &&
          new Date(block.startTime) <= now &&
          new Date(block.endTime) > now
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    if (activeBlocks.length > 0) {
      const currentBlock = activeBlocks[0];
      const blockStartTime = new Date(currentBlock.startTime);
      const blockEndTime = new Date(currentBlock.endTime);
      const isCurrent = now >= blockStartTime && now < blockEndTime;

      return {
        isBlocked: true,
        isCurrent: isCurrent,
        reason: currentBlock.reason,
        title: currentBlock.title,
        eventDetails: currentBlock.eventDetails,
        startTime: currentBlock.startTime,
        endTime: currentBlock.endTime,
        remainingMinutes: isCurrent ? Math.ceil((blockEndTime - now) / (1000 * 60)) : 0,
        isWetCourt: false,
      };
    }
  } catch (error) {
    console.error('Error checking court blocks:', error);
  }

  return {
    isBlocked: false,
    isCurrent: false,
    isWetCourt: false,
  };
}

/**
 * Check for upcoming blocks that would limit playing time
 * Uses provided blocks array instead of localStorage.
 *
 * @param {number} courtNumber - Court number to check
 * @param {number} [duration=60] - Intended play duration in minutes (0 = any upcoming block)
 * @param {Array} blocksArray - Array of block objects with courtNumber, startTime, endTime, reason, isWetCourt
 * @returns {Object|null} Warning object or null if no warning needed
 * @returns {string} returns.type - 'blocked' if cannot play, 'limited' if time limited
 * @returns {string} returns.reason - Reason for the upcoming block
 * @returns {string} returns.startTime - ISO string of block start time
 * @returns {number} [returns.limitedDuration] - Available minutes if limited
 * @returns {number} [returns.originalDuration] - Originally requested duration
 * @returns {number} returns.minutesUntilBlock - Minutes until block starts
 */
export function getUpcomingBlockWarningFromBlocks(courtNumber, duration = 60, blocksArray = []) {
  const now = new Date();
  const sessionEndTime = new Date(now.getTime() + duration * 60 * 1000);

  try {
    // Filter blocks for this court
    const blocks = blocksArray.filter((b) => b.courtNumber === courtNumber);

    // Find the earliest block that would interfere with the session
    const upcomingBlock = blocks
      .filter((block) => {
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);

        // Skip blocks that are currently active or already past
        if (blockStart <= now || blockEnd <= now) return false;

        // Skip wet court blocks (they're handled separately)
        if (block.isWetCourt) return false;

        // If duration is 0, return any upcoming block (for display purposes)
        if (duration === 0) return true;

        // Block interferes if it starts before our session would naturally end
        return blockStart < sessionEndTime;
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

    if (!upcomingBlock) return null;

    const blockStart = new Date(upcomingBlock.startTime);
    const minutesUntilBlock = Math.floor((blockStart.getTime() - now.getTime()) / (60 * 1000));

    // Don't allow registration if block starts within 5 minutes
    if (minutesUntilBlock <= 5) {
      return {
        type: 'blocked',
        reason: upcomingBlock.reason || upcomingBlock.title || 'Reserved',
        startTime: upcomingBlock.startTime,
        minutesUntilBlock,
      };
    }

    // Warn if playing time will be limited (or if duration=0, always return limited)
    if (duration === 0 || minutesUntilBlock < duration) {
      return {
        type: 'limited',
        reason: upcomingBlock.reason || upcomingBlock.title || 'Reserved',
        startTime: upcomingBlock.startTime,
        limitedDuration: minutesUntilBlock,
        originalDuration: duration,
        minutesUntilBlock,
      };
    }

    return null;
  } catch (error) {
    console.warn('Error checking upcoming blocks:', error);
    return null;
  }
}

/**
 * Check for upcoming blocks that would limit playing time
 * Reads blocks from localStorage for backwards compatibility.
 *
 * @param {number} courtNumber - Court number to check
 * @param {number} [duration=60] - Intended play duration in minutes
 * @returns {Object|null} Warning object or null if no warning needed
 */
export function getUpcomingBlockWarning(courtNumber, duration = 60) {
  try {
    const allBlocks = readJSON(STORAGE.BLOCKS) || [];
    return getUpcomingBlockWarningFromBlocks(courtNumber, duration, allBlocks);
  } catch (error) {
    console.warn('Error checking upcoming blocks:', error);
    return null;
  }
}
