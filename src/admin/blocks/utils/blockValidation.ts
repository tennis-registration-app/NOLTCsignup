/**
 * Block Validation Utilities
 *
 * Extracted VERBATIM from CompleteBlockManagerEnhanced.jsx
 * Pure validation functions for block management forms.
 *
 * IMPORTANT: These functions preserve the exact validation logic
 * from the original code. Do not modify without verifying behavior.
 */

/**
 * Check if both start and end times are provided.
 * Original line 135: `const hasValidTimes = startTime && endTime;`
 *
 * @param {string} startTime
 * @param {string} endTime
 * @returns {boolean}
 */
export function hasValidTimes(startTime, endTime) {
  return !!(startTime && endTime);
}

/**
 * Check if a reason has been provided.
 * Original line 136: `const hasReason = blockReason.trim().length > 0;`
 *
 * @param {string} blockReason
 * @returns {boolean}
 */
export function hasReason(blockReason) {
  return blockReason.trim().length > 0;
}

/**
 * Check if at least one court is selected.
 * Original line 137: `const hasCourts = selectedCourts.length > 0;`
 *
 * @param {Array} selectedCourts
 * @returns {boolean}
 */
export function hasCourts(selectedCourts) {
  return selectedCourts.length > 0;
}
