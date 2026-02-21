import React from 'react';
import { buildCalendarModel, buildCalendarActions } from '../presenters/calendarPresenter.js';

/**
 * CalendarSection - Thin wrapper that delegates to presenter.
 *
 * Receives domain objects from App.jsx, transforms via presenter,
 * and forwards flat props to EventCalendarEnhanced.
 *
 * @param {Object} props
 * @param {import('../types/domainObjects.js').CalendarModel} props.calendarModel
 * @param {import('../types/domainObjects.js').CalendarActions} props.calendarActions
 * @param {import('../types/domainObjects.js').AdminServices} props.services
 * @param {import('../types/domainObjects.js').BlockComponents} props.components
 */
export function CalendarSection({ calendarModel, calendarActions, services, components }) {
  const model = buildCalendarModel(calendarModel, services, components);
  const actions = buildCalendarActions(calendarActions);

  // EventCalendar is the component ref (aliased from EventCalendarEnhanced)
  const { EventCalendar: EventCalendarEnhanced, ...dataProps } = model;

  return <EventCalendarEnhanced {...dataProps} {...actions} />;
}
