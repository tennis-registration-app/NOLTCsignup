/**
 * Legacy back-compat adapter for Time functions
 * Maps ESM time functions to IIFE window.Tennis.Domain.Time shape
 *
 * Delete this file when <script src="domain/time.js"> is removed from HTML files
 */

import { formatTime, formatDate } from '../lib/formatters.js';
import { addMinutes, isOverTime, durationForGroupSize } from '../lib/dateUtils.js';

const legacyTime = {
  addMinutes,
  durationForGroupSize,
  isOverTime,
  formatTime,
  formatDate,
};

if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.Domain = window.Tennis.Domain || {};
  window.Tennis.Domain.Time = legacyTime;
  window.Tennis.Domain.time = legacyTime;
}

export { legacyTime };
