/**
 * Calendar Module Exports
 *
 * Barrel export for all calendar-related components and utilities.
 */

// Main calendar component
export { default as EventCalendarEnhanced } from './EventCalendarEnhanced.jsx';

// View components
export { default as DayViewEnhanced } from './DayViewEnhanced.jsx';
export { default as WeekView } from './WeekView.jsx';

// Supporting components
export { default as InteractiveEvent } from './InteractiveEvent.jsx';
export { default as EventDetailsModal } from './EventDetailsModal.jsx';

// Utilities
export {
  getEventColor,
  getEventEmoji,
  getEventTypeFromReason,
  calculateEventLayout
} from './utils.js';
