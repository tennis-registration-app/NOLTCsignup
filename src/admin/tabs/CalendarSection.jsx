import React from 'react';

export function CalendarSection({
  courts,
  currentTime,
  refreshTrigger,
  onRefresh,
  calendarView,
  backend,
  hoursOverrides,
  MonthView,
  EventSummary,
  HoverCard,
  QuickActionsMenu,
  Tennis,
  EventCalendarEnhanced,
}) {
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
      Tennis={Tennis}
    />
  );
}
