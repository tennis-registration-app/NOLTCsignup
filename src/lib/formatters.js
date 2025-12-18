/**
 * Tennis Court Registration System - Formatters
 *
 * Date, time, and string formatting utilities.
 * All formatters are pure functions with consistent output.
 */

// ============================================================
// Time Formatters
// ============================================================

/**
 * Format a date/time to "12:34 PM" format
 * @param {Date|string|number} dateInput - Date, ISO string, or timestamp
 * @returns {string|null} Formatted time string or null if invalid
 */
export function formatTime(dateInput) {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date to "Mon, Jan 1" format
 * @param {Date|string|number} dateInput - Date, ISO string, or timestamp
 * @returns {string|null} Formatted date string or null if invalid
 */
export function formatDate(dateInput) {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date to "Jan 1, 2024" format (no weekday)
 * @param {Date|string|number} dateInput - Date, ISO string, or timestamp
 * @returns {string|null} Formatted date string or null if invalid
 */
export function formatDateShort(dateInput) {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date to full date/time "01/01/2024, 12:34 PM" format
 * @param {Date|string|number} dateInput - Date, ISO string, or timestamp
 * @returns {string|null} Formatted datetime string or null if invalid
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time range "12:00 PM - 1:30 PM"
 * @param {Date|string|number} startInput - Start date/time
 * @param {Date|string|number} endInput - End date/time
 * @returns {string} Formatted time range or empty string if invalid
 */
export function formatTimeRange(startInput, endInput) {
  const startTime = formatTime(startInput);
  const endTime = formatTime(endInput);
  if (!startTime || !endTime) return '';
  return `${startTime} - ${endTime}`;
}

// ============================================================
// Duration Formatters
// ============================================================

/**
 * Format time remaining until end time
 * @param {Date|string|number} endTimeInput - End time
 * @param {Date} currentTime - Current time (default: now)
 * @returns {string} Formatted remaining time
 */
export function formatTimeRemaining(endTimeInput, currentTime = new Date()) {
  if (!endTimeInput) return '';
  const end = endTimeInput instanceof Date ? endTimeInput : new Date(endTimeInput);
  if (isNaN(end.getTime())) return '';

  const diff = end - currentTime;
  const minutes = Math.floor(diff / 60000);

  if (minutes < -60) return `${Math.abs(Math.floor(minutes / 60))}h over`;
  if (minutes < 0) return `${Math.abs(minutes)}m over`;
  if (minutes === 0) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export function formatDuration(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes)) return '';
  if (minutes < 0) return '';
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// ============================================================
// String Formatters
// ============================================================

/**
 * Format phone number to (XXX) XXX-XXXX
 * @param {string|number} phone - Phone number (digits only or with formatting)
 * @returns {string} Formatted phone number or original input if invalid
 */
export function formatPhone(phone) {
  if (!phone) return '';
  // Remove all non-digit characters
  const digits = String(phone).replace(/\D/g, '');

  // Handle 10-digit numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle 11-digit numbers starting with 1
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if doesn't match expected format
  return String(phone);
}

/**
 * Format a name (capitalize first letter of each word)
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
export function formatName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 50) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ============================================================
// Number Formatters
// ============================================================

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  if (typeof amount !== 'number' || isNaN(amount)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return '';
  return new Intl.NumberFormat('en-US').format(num);
}

// ============================================================
// Court Display Formatters
// ============================================================

/**
 * Format court number for display
 * @param {number} courtNumber - Court number
 * @returns {string} Formatted court string
 */
export function formatCourt(courtNumber) {
  if (typeof courtNumber !== 'number' || courtNumber < 1) return '';
  return `Court ${courtNumber}`;
}

/**
 * Format multiple court numbers
 * @param {number[]} courts - Array of court numbers
 * @returns {string} Formatted courts string
 */
export function formatCourts(courts) {
  if (!Array.isArray(courts) || courts.length === 0) return '';
  if (courts.length === 1) return formatCourt(courts[0]);
  return `Courts ${courts.join(', ')}`;
}

/**
 * Format player names list
 * @param {Array} players - Array of player objects with name property
 * @param {number} maxDisplay - Maximum names to display (default: 4)
 * @returns {string} Formatted names string
 */
export function formatPlayerNames(players, maxDisplay = 4) {
  if (!Array.isArray(players) || players.length === 0) return '';
  const names = players
    .map((p) => p?.name || p)
    .filter(Boolean)
    .slice(0, maxDisplay);
  if (players.length > maxDisplay) {
    return `${names.join(', ')} +${players.length - maxDisplay}`;
  }
  return names.join(', ');
}
