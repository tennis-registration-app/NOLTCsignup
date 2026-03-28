/**
 * Calendar Presenter
 *
 * Pure functions that transform controller domain objects into the flat
 * props interface expected by EventCalendarEnhanced.
 *
 * Extracted from CalendarSection.jsx — maintains exact prop mapping.
 */

/**
 * Build the data/model props for EventCalendarEnhanced.
 *
 * @param {import('../types/domainObjects.js').CalendarModel} calendarModel
 * @param {import('../types/domainObjects.js').AdminServices} services
 * @param {import('../types/domainObjects.js').BlockComponents} components
 * @returns {Object} Data props for EventCalendarEnhanced
 */
export function buildCalendarModel(calendarModel, services, components) {
  const { courts, currentTime, hoursOverrides, calendarView, refreshTrigger } = calendarModel;
  const { backend } = services;
  const { MonthView, EventSummary, HoverCard, QuickActionsMenu, EventCalendar } = components;

  return {
    courts,
    currentTime,
    refreshTrigger,
    defaultView: calendarView,
    backend,
    hoursOverrides,
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
    EventCalendar,
  };
}

/**
 * Build the action/callback props for EventCalendarEnhanced.
 *
 * @param {import('../types/domainObjects.js').CalendarActions} calendarActions
 * @returns {Object} Action props for EventCalendarEnhanced
 */
export function buildCalendarActions(calendarActions) {
  const { onRefresh } = calendarActions;

  return {
    onRefresh,
  };
}
