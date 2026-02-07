/**
 * @fileoverview Pure transform logic for board subscription data.
 * All functions are side-effect free and receive data directly.
 * This enables direct unit testing without React hooks or subscriptions.
 */

import { normalizeWaitlist } from '../../lib/normalizeWaitlist.js';

/**
 * Generate fingerprint from blocks to detect actual changes.
 * @param {Array} blocks - Array of block objects
 * @returns {string} Fingerprint string for comparison
 */
export function generateBlocksFingerprint(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map((b) => `${b.id}:${b.startsAt || b.starts_at}:${b.endsAt || b.ends_at}`)
    .sort()
    .join('|');
}

/**
 * Extract court blocks from courts array for UI compatibility.
 * API-only: derive courtBlocks entirely from board.courts
 *
 * @param {Array} courts - Array of court objects from API
 * @returns {Array} Array of court block objects for UI
 */
export function extractCourtBlocks(courts) {
  if (!courts || !Array.isArray(courts)) return [];

  return courts
    .filter((c) => c.block)
    .map((c) => ({
      id: c.block.id,
      courtId: c.id,
      courtNumber: c.number,
      reason: c.block.reason,
      blockType: c.block.blockType || c.block.block_type,
      startTime: c.block?.startsAt || c.block?.startTime || new Date().toISOString(),
      endTime: c.block?.endsAt || c.block?.endTime,
    }));
}

/**
 * Transform raw board subscription data to UI-friendly state shape.
 *
 * @param {Object} board - Raw board data from subscription callback
 * @param {Array} board.courts - Courts array
 * @param {Array} board.waitlist - Waitlist array
 * @param {Array} board.blocks - Current blocks array
 * @param {Array} board.upcomingBlocks - Upcoming blocks array
 * @param {string} lastFingerprint - Previous blocks fingerprint for change detection
 * @returns {Object} Transformed state object with shouldBumpRefreshTrigger flag
 */
export function transformBoardUpdate(board, lastFingerprint = '') {
  // Handle null/undefined board
  if (!board) {
    return {
      courts: [],
      waitingGroups: [],
      courtBlocks: [],
      newFingerprint: '',
      shouldBumpRefreshTrigger: false,
    };
  }

  // Extract courts (default to empty array)
  const courts = board.courts || [];

  // Normalize waitlist using shared helper
  const waitingGroups = normalizeWaitlist(board.waitlist);

  // Extract court blocks from courts
  const courtBlocks = extractCourtBlocks(courts);

  // Calculate fingerprint for block change detection
  const currentBlocks = [...(board.blocks || []), ...(board.upcomingBlocks || [])];
  const newFingerprint = generateBlocksFingerprint(currentBlocks);

  // Determine if refresh trigger should be bumped
  const shouldBumpRefreshTrigger = newFingerprint !== lastFingerprint;

  return {
    courts,
    waitingGroups,
    courtBlocks,
    newFingerprint,
    shouldBumpRefreshTrigger,
  };
}
