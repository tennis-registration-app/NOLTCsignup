/**
 * CalendarSection Presenter Equivalence Test
 *
 * Proves that buildCalendarModel + buildCalendarActions produce
 * IDENTICAL props to the legacy CalendarSection destructuring.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildCalendarModel,
  buildCalendarActions,
} from '../../../src/admin/presenters/calendarPresenter.js';

// --- Fixtures ---

const mockCourts = [{ number: 1 }, { number: 2 }];
const mockCurrentTime = new Date('2025-01-15T10:00:00');
const mockHoursOverrides = [{ date: '2025-01-20', open: '09:00', close: '17:00' }];
const MockMonthView = () => null;
const MockEventSummary = () => null;
const MockHoverCard = () => null;
const MockQuickActionsMenu = () => null;
const MockEventCalendarEnhanced = () => null;
const mockBackend = { queries: {}, commands: {}, admin: {} };
const mockOnRefresh = vi.fn();

const calendarModel = {
  courts: mockCourts,
  currentTime: mockCurrentTime,
  hoursOverrides: mockHoursOverrides,
  calendarView: 'day',
  refreshTrigger: 3,
};

const calendarActions = {
  onRefresh: mockOnRefresh,
};

const services = {
  backend: mockBackend,
};

const components = {
  MonthView: MockMonthView,
  EventSummary: MockEventSummary,
  HoverCard: MockHoverCard,
  QuickActionsMenu: MockQuickActionsMenu,
  EventCalendar: MockEventCalendarEnhanced,
};

/**
 * Legacy CalendarSection prop mapping — VERBATIM from CalendarSection.jsx
 * before the presenter refactor. This is the source of truth.
 */
function legacyCalendarProps(calModel, calActions, svc, comps) {
  // Destructure domain objects to preserve existing local names
  const { courts, currentTime, hoursOverrides, calendarView, refreshTrigger } = calModel;
  const { onRefresh } = calActions;
  const { backend } = svc;
  // BlockComponents output field is EventCalendar, alias to local EventCalendarEnhanced
  const {
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
    EventCalendar: EventCalendarEnhanced,
  } = comps;

  return {
    courts,
    currentTime,
    refreshTrigger,
    onRefresh,
    defaultView: calendarView,
    backend,
    hoursOverrides,
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
    // The component itself (not a prop passed to EventCalendarEnhanced,
    // but the component that receives the other props)
    _component: EventCalendarEnhanced,
  };
}

/**
 * Presenter-based prop mapping
 */
function presenterCalendarProps(calModel, calActions, svc, comps) {
  const model = buildCalendarModel(calModel, svc, comps);
  const actions = buildCalendarActions(calActions);
  // Separate EventCalendar component ref from data props (same as CalendarSection does)
  const { EventCalendar, ...dataProps } = model;
  return {
    ...dataProps,
    ...actions,
    _component: EventCalendar,
  };
}

describe('CalendarSection presenter equivalence', () => {
  const legacy = legacyCalendarProps(calendarModel, calendarActions, services, components);
  const presenter = presenterCalendarProps(calendarModel, calendarActions, services, components);

  it('produces same keys', () => {
    expect(Object.keys(presenter).sort()).toEqual(Object.keys(legacy).sort());
  });

  it('produces identical values for all props', () => {
    for (const key of Object.keys(legacy)) {
      if (typeof legacy[key] === 'function') {
        // Functions must be reference-equal
        expect(presenter[key], `${key} reference equality`).toBe(legacy[key]);
      } else {
        // Data must be deep-equal
        expect(presenter[key], `${key} deep equality`).toEqual(legacy[key]);
      }
    }
  });

  it('no extra keys in presenter output', () => {
    const extraKeys = Object.keys(presenter).filter((k) => !(k in legacy));
    expect(extraKeys).toEqual([]);
  });

  it('no missing keys in presenter output', () => {
    const missingKeys = Object.keys(legacy).filter((k) => !(k in presenter));
    expect(missingKeys).toEqual([]);
  });

  it('all expected props are present', () => {
    const expectedProps = [
      'courts',
      'currentTime',
      'refreshTrigger',
      'onRefresh',
      'defaultView',
      'backend',
      'hoursOverrides',
      'MonthView',
      'EventSummary',
      'HoverCard',
      'QuickActionsMenu',
      '_component',
    ];

    for (const prop of expectedProps) {
      expect(presenter).toHaveProperty(prop);
    }
    expect(Object.keys(presenter).length).toBe(expectedProps.length);
  });

  it('type map matches expected shape', () => {
    const typeMap = {};
    for (const key of Object.keys(presenter).sort()) {
      typeMap[key] = typeof presenter[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "EventSummary": "function",
        "HoverCard": "function",
        "MonthView": "function",
        "QuickActionsMenu": "function",
        "_component": "function",
        "backend": "object",
        "courts": "object",
        "currentTime": "object",
        "defaultView": "string",
        "hoursOverrides": "object",
        "onRefresh": "function",
        "refreshTrigger": "number",
      }
    `);
  });
});
