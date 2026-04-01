/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  buildCalendarEvents,
  filterCalendarEvents,
  formatCalendarHeader,
} from '../../../../src/admin/presenters/eventCalendarPresenter.js';

// --- Legacy functions copied verbatim from EventCalendarEnhanced.jsx BEFORE refactor ---

function getEventTypeFromReason(reason: any) {
  const reasonUpper = reason.toUpperCase();
  if (reasonUpper.includes('TOURNAMENT')) return 'tournament';
  if (reasonUpper.includes('LEAGUE')) return 'league';
  if (reasonUpper.includes('CLINIC')) return 'clinic';
  if (reasonUpper.includes('LESSON')) return 'lesson';
  if (reasonUpper.includes('MAINTENANCE') || reasonUpper.includes('COURT WORK')) return 'maintenance';
  if (reasonUpper.includes('WET')) return null;
  return 'other';
}

// Copied verbatim from EventCalendarEnhanced.jsx useMemo (lines 142-199)
function legacyBuildCalendarEvents(blocks: any, courts: any) {
  const processedEvents = new Map();

  // Process API-sourced blocks
  blocks.forEach((block: any) => {
    if (block.isEvent) {
      const eventKey = `${block.title || block.reason}-${block.courtNumber}-${block.startTime}`;

      if (!processedEvents.has(eventKey)) {
        processedEvents.set(eventKey, {
          ...block,
          courtNumbers: block.courtNumbers || [block.courtNumber],
          id: block.id || eventKey,
        });
      }
    }
  });

  // Process non-event blocks
  blocks.forEach((block: any) => {
    if (!block.isEvent) {
      const eventKey = `${block.title || block.reason}-${block.courtNumber}-${block.startTime}`;

      if (!processedEvents.has(eventKey)) {
        processedEvents.set(eventKey, {
          id: block.id,
          courtId: block.courtId,
          courtNumber: block.courtNumber,
          title: block.title || block.reason,
          startTime: block.startTime,
          endTime: block.endTime,
          eventType: block.eventType || getEventTypeFromReason(block.reason),
          courtNumbers: [block.courtNumber],
          isBlock: true,
          reason: block.reason,
        });
      }
    }
  });

  // Also check courts data for backward compatibility with active blocks
  courts.forEach((court: any, idx: any) => {
    if (court && court.blocked && court.blocked.isEvent) {
      const eventKey = `${court.blocked.eventDetails?.title || court.blocked.title}-${court.blocked.startTime}`;

      if (!processedEvents.has(eventKey)) {
        processedEvents.set(eventKey, {
          ...court.blocked,
          courtNumbers: court.blocked.eventDetails?.courts || [idx + 1],
          id: eventKey,
        });
      }
    }
  });

  return Array.from(processedEvents.values());
}

// Copied verbatim from EventCalendarEnhanced.jsx useMemo (lines 202-239)
function legacyFilterCalendarEvents(events: any, viewMode: any, selectedDate: any) {
  let startDate, endDate;

  if (viewMode === 'month') {
    startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    endDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
  } else if (viewMode === 'week') {
    startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);
  }

  return events.filter((event: any) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    return (
      (eventStart >= startDate && eventStart <= endDate) ||
      (eventEnd >= startDate && eventEnd <= endDate) ||
      (eventStart <= startDate && eventEnd >= endDate)
    );
  });
}

// Copied verbatim from EventCalendarEnhanced.jsx useMemo (lines 382-399)
function legacyFormatCalendarHeader(viewMode: any, selectedDate: any) {
  if (viewMode === 'month') {
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else if (viewMode === 'week') {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

// --- Fixtures ---

const fixtureDate = new Date(2025, 5, 15); // June 15, 2025 (Sunday)

const fixtureBlocks = [
  {
    id: 'block-1',
    courtId: 'court-1',
    courtNumber: 1,
    courtNumbers: [1],
    title: 'Summer League',
    startTime: '2025-06-15T09:00:00Z',
    endTime: '2025-06-15T11:00:00Z',
    reason: 'league',
    blockType: 'league',
    eventType: 'league',
    isEvent: true,
    isBlock: true,
  },
  {
    id: 'block-2',
    courtId: 'court-3',
    courtNumber: 3,
    courtNumbers: [3],
    title: 'Junior Clinic',
    startTime: '2025-06-15T14:00:00Z',
    endTime: '2025-06-15T16:00:00Z',
    reason: 'clinic',
    blockType: 'clinic',
    eventType: 'clinic',
    isEvent: true,
    isBlock: true,
  },
  {
    id: 'block-3',
    courtId: 'court-5',
    courtNumber: 5,
    title: 'Maintenance',
    startTime: '2025-06-15T08:00:00Z',
    endTime: '2025-06-15T10:00:00Z',
    reason: 'maintenance',
    blockType: 'maintenance',
    eventType: 'maintenance',
    isEvent: false,
    isBlock: true,
  },
  {
    id: 'block-4',
    courtId: 'court-7',
    courtNumber: 7,
    title: 'Wet Court',
    startTime: '2025-06-16T06:00:00Z',
    endTime: '2025-06-16T12:00:00Z',
    reason: 'wet',
    blockType: 'wet',
    eventType: null,
    isEvent: false,
    isBlock: true,
  },
  {
    id: 'block-5',
    courtId: 'court-2',
    courtNumber: 2,
    courtNumbers: [2],
    title: 'Tournament Finals',
    startTime: '2025-06-20T10:00:00Z',
    endTime: '2025-06-20T18:00:00Z',
    reason: 'tournament',
    blockType: 'tournament',
    eventType: 'tournament',
    isEvent: true,
    isBlock: true,
  },
];

const fixtureCourts: any[] = [
  { id: 'court-1', blocked: null },
  { id: 'court-2', blocked: null },
  {
    id: 'court-3',
    blocked: {
      isEvent: true,
      title: 'Evening Lesson',
      startTime: '2025-06-15T18:00:00Z',
      endTime: '2025-06-15T19:00:00Z',
      eventDetails: { title: 'Evening Lesson', courts: [3] },
    },
  },
  null, // null court entry (sparse array)
  { id: 'court-5', blocked: null },
];

// --- Tests ---

describe('eventCalendarPresenter equivalence', () => {
  describe('buildCalendarEvents', () => {
    it('matches legacy computation with mixed blocks', () => {
      const legacy = legacyBuildCalendarEvents(fixtureBlocks, fixtureCourts);
      const presenter = buildCalendarEvents({ blocks: fixtureBlocks, courts: fixtureCourts });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with empty blocks', () => {
      const legacy = legacyBuildCalendarEvents([], fixtureCourts);
      const presenter = buildCalendarEvents({ blocks: [], courts: fixtureCourts });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with empty courts', () => {
      const legacy = legacyBuildCalendarEvents(fixtureBlocks, []);
      const presenter = buildCalendarEvents({ blocks: fixtureBlocks, courts: [] });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with both empty', () => {
      const legacy = legacyBuildCalendarEvents([], []);
      const presenter = buildCalendarEvents({ blocks: [], courts: [] });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with duplicate event keys (dedup behavior)', () => {
      const dupeBlocks = [
        fixtureBlocks[0],
        { ...fixtureBlocks[0], id: 'block-1-dupe' }, // same title/court/time → same key
      ];
      const legacy = legacyBuildCalendarEvents(dupeBlocks, []);
      const presenter = buildCalendarEvents({ blocks: dupeBlocks, courts: [] });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with court backward-compat blocks', () => {
      const courtsWithBlocked = [
        {
          id: 'court-10',
          blocked: {
            isEvent: true,
            title: 'Special Event',
            startTime: '2025-06-15T20:00:00Z',
            endTime: '2025-06-15T22:00:00Z',
            eventDetails: { title: 'Special Event', courts: [10, 11] },
          },
        },
      ];
      const legacy = legacyBuildCalendarEvents([], courtsWithBlocked);
      const presenter = buildCalendarEvents({ blocks: [], courts: courtsWithBlocked });
      expect(presenter).toEqual(legacy);
    });
  });

  describe('filterCalendarEvents', () => {
    // Build events once for filter tests
    const allEvents = buildCalendarEvents({ blocks: fixtureBlocks, courts: fixtureCourts });

    it('matches legacy for day view', () => {
      const legacy = legacyFilterCalendarEvents(allEvents, 'day', fixtureDate);
      const presenter = filterCalendarEvents({ events: allEvents, viewMode: 'day', selectedDate: fixtureDate });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy for week view', () => {
      const legacy = legacyFilterCalendarEvents(allEvents, 'week', fixtureDate);
      const presenter = filterCalendarEvents({ events: allEvents, viewMode: 'week', selectedDate: fixtureDate });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy for month view', () => {
      const legacy = legacyFilterCalendarEvents(allEvents, 'month', fixtureDate);
      const presenter = filterCalendarEvents({ events: allEvents, viewMode: 'month', selectedDate: fixtureDate });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with empty events', () => {
      const legacy = legacyFilterCalendarEvents([], 'day', fixtureDate);
      const presenter = filterCalendarEvents({ events: [], viewMode: 'day', selectedDate: fixtureDate });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy for date with no events', () => {
      const farDate = new Date(2024, 0, 1); // Jan 1, 2024
      const legacy = legacyFilterCalendarEvents(allEvents, 'day', farDate);
      const presenter = filterCalendarEvents({ events: allEvents, viewMode: 'day', selectedDate: farDate });
      expect(presenter).toEqual(legacy);
    });
  });

  describe('formatCalendarHeader', () => {
    it('matches legacy for each view mode', () => {
      for (const mode of ['day', 'week', 'month']) {
        const legacy = legacyFormatCalendarHeader(mode, fixtureDate);
        const presenter = formatCalendarHeader({ viewMode: mode, selectedDate: fixtureDate });
        expect(presenter).toBe(legacy);
      }
    });

    it('matches legacy for different dates', () => {
      const dates = [
        new Date(2025, 0, 1),  // Jan 1
        new Date(2025, 11, 31), // Dec 31
        new Date(2025, 2, 15),  // Mar 15 (mid-week)
      ];
      for (const date of dates) {
        for (const mode of ['day', 'week', 'month']) {
          const legacy = legacyFormatCalendarHeader(mode, date);
          const presenter = formatCalendarHeader({ viewMode: mode, selectedDate: date });
          expect(presenter).toBe(legacy);
        }
      }
    });
  });
});
