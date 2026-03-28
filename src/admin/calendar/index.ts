/**
 * Calendar Module Exports
 *
 * Barrel export for all calendar-related components and utilities.
 */

// Main calendar component
export { default as EventCalendarEnhanced } from './EventCalendarEnhanced';

// View components
export { default as DayViewEnhanced } from './DayViewEnhanced';
export { default as WeekView } from './WeekView';

// Supporting components
export { default as InteractiveEvent } from './InteractiveEvent';
export { default as EventDetailsModal } from './EventDetailsModal';

// Utilities
export {
  getEventColor,
  getEventEmoji,
  getEventTypeFromReason,
  calculateEventLayout
} from './utils';
