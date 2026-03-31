import React from "react";
import { buildCalendarModel, buildCalendarActions } from "../presenters/calendarPresenter";
import type {
  createCalendarModel,
  createAdminServices,
  createBlockComponents,
  createCalendarActions,
} from "../types/domainObjects";

type CalendarModel = ReturnType<typeof createCalendarModel>;
type AdminServices = ReturnType<typeof createAdminServices>;
type BlockComponents = ReturnType<typeof createBlockComponents>;
type CalendarActions = ReturnType<typeof createCalendarActions>;

interface CalendarSectionProps {
  calendarModel: CalendarModel;
  calendarActions: CalendarActions;
  services: AdminServices;
  components: BlockComponents;
}

export function CalendarSection({ calendarModel, calendarActions, services, components }: CalendarSectionProps) {
  const model = buildCalendarModel(calendarModel as Record<string, unknown>, services as Record<string, unknown>, components as Record<string, unknown>);
  const actions = buildCalendarActions(calendarActions as Record<string, unknown>);

  // EventCalendar is the component ref (aliased from EventCalendarEnhanced)
  const { EventCalendar: EventCalendarEnhanced, ...dataProps } = model;
  const CalendarComponent = EventCalendarEnhanced as React.ComponentType<Record<string, unknown>>;

  return <CalendarComponent {...dataProps} {...actions} />;
}
