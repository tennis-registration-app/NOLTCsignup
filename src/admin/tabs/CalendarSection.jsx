import React from 'react';

/**
 * CalendarSection - Pass-through wrapper for calendar display.
 *
 * Receives domain objects constructed by App.jsx and forwards to EventCalendarEnhanced.
 *
 * @param {Object} props
 * @param {import('../types/domainObjects.js').CalendarModel} props.calendarModel
 * @param {import('../types/domainObjects.js').CalendarActions} props.calendarActions
 * @param {import('../types/domainObjects.js').AdminServices} props.services
 * @param {import('../types/domainObjects.js').BlockComponents} props.components
 */
export function CalendarSection({ calendarModel, calendarActions, services, components }) {
  // Destructure domain objects to preserve existing local names
  const { courts, currentTime, hoursOverrides, calendarView, refreshTrigger } = calendarModel;
  const { onRefresh } = calendarActions;
  const { backend } = services;
  // BlockComponents output field is EventCalendar, alias to local EventCalendarEnhanced
  const {
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
    EventCalendar: EventCalendarEnhanced,
  } = components;

  return (
    <EventCalendarEnhanced
      courts={courts}
      currentTime={currentTime}
      refreshTrigger={refreshTrigger}
      onRefresh={onRefresh}
      defaultView={calendarView}
      backend={backend}
      hoursOverrides={hoursOverrides}
      MonthView={MonthView}
      EventSummary={EventSummary}
      HoverCard={HoverCard}
      QuickActionsMenu={QuickActionsMenu}
    />
  );
}
