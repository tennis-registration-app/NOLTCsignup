/**
 * Date utilities for NOLTC - handles timezone conversion to Central Time
 */

// Central Time timezone
export const CLUB_TIMEZONE = 'America/Chicago';

/**
 * Convert a UTC date string or Date object to Central Time
 * @param {string|Date} utcDate - UTC date string (ISO format) or Date object
 * @returns {Date} Date object in local time
 */
export function toLocalDate(utcDate) {
  if (!utcDate) return null;
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date;
}

/**
 * Format a UTC date to Central Time display string
 * @param {string|Date} utcDate - UTC date string or Date object
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string in Central Time
 */
export function formatDateTime(utcDate, options = {}) {
  if (!utcDate) return '';

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  const defaultOptions = {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  return date.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format just the date portion in Central Time
 * @param {string|Date} utcDate
 * @returns {string} MM/DD/YYYY format
 */
export function formatDate(utcDate) {
  if (!utcDate) return '';

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  return date.toLocaleDateString('en-US', {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format just the time portion in Central Time
 * @param {string|Date} utcDate
 * @returns {string} HH:MM AM/PM format
 */
export function formatTime(utcDate) {
  if (!utcDate) return '';

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  return date.toLocaleTimeString('en-US', {
    timeZone: CLUB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time for court display (e.g., "2:30 PM")
 * @param {string|Date} utcDate
 * @returns {string}
 */
export function formatCourtTime(utcDate) {
  if (!utcDate) return '';

  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  return date.toLocaleTimeString('en-US', {
    timeZone: CLUB_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get current time in Central Time
 * @returns {Date}
 */
export function nowCentral() {
  return new Date();
}

/**
 * Format a duration in minutes to human readable
 * @param {number} minutes
 * @returns {string} e.g., "1h 30m" or "45m"
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Calculate minutes remaining from an end time
 * @param {string|Date} endTime - UTC end time
 * @returns {number} Minutes remaining (can be negative if overtime)
 */
export function minutesRemaining(endTime) {
  if (!endTime) return 0;

  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  const now = new Date();

  return Math.round((end.getTime() - now.getTime()) / 60000);
}

export default {
  formatDateTime,
  formatDate,
  formatTime,
  formatCourtTime,
  formatDuration,
  minutesRemaining,
  nowCentral,
  toLocalDate,
  CLUB_TIMEZONE,
};
