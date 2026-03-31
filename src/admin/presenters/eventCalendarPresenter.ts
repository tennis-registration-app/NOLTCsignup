/**
 * Pure presenter for EventCalendarEnhanced.
 * Each function corresponds to an existing useMemo computation.
 * Returns identical shapes to what the component previously computed inline.
 */
import { getEventTypeFromReason } from '../calendar/utils';

/**
 * Build calendar events from blocks and courts data.
 * Deduplicates by event key, processes events first then non-events,
 * then checks courts for backward compatibility.
 *
 * Extracted from EventCalendarEnhanced useMemo (lines 142-199).
 */
export function buildCalendarEvents({ blocks, courts }: { blocks: Record<string,unknown>[]; courts: Record<string,unknown>[] }) {
  const processedEvents = new Map();

  // Process API-sourced blocks
  blocks.forEach((block: Record<string,unknown>) => {
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
  blocks.forEach((block: Record<string,unknown>) => {
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
          eventType: block.eventType || getEventTypeFromReason(block.reason as string),
          courtNumbers: [block.courtNumber],
          isBlock: true,
          reason: block.reason,
        });
      }
    }
  });

  // Also check courts data for backward compatibility with active blocks
  courts.forEach((court: Record<string,unknown> | null, idx: number) => {
    if (!court) return;
    const blocked = court.blocked as Record<string,unknown> | null | undefined;
    if (blocked && (blocked.isEvent as unknown)) {
      const details = blocked.eventDetails as Record<string,unknown> | undefined;
      const eventKey = `${(details?.title as unknown) || (blocked.title as unknown)}-${blocked.startTime as unknown}`;
      if (!processedEvents.has(eventKey)) {
        processedEvents.set(eventKey, {
          ...blocked,
          courtNumbers: ((details?.courts as unknown) || [idx + 1]),
          id: eventKey,
        });
      }
    }
  });

  return Array.from(processedEvents.values());
}

/**
 * Filter events by date range based on view mode and selected date.
 *
 * Extracted from EventCalendarEnhanced useMemo (lines 202-239).
 */
export function filterCalendarEvents({ events, viewMode, selectedDate }: { events: Record<string,unknown>[]; viewMode: string; selectedDate: Date }) {
  let startDate, endDate;

  if (viewMode === 'month') {
    startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
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

  return events.filter((event: Record<string,unknown>) => {
    const eventStart = new Date(event.startTime as string);
    const eventEnd = new Date(event.endTime as string);
    return (
      (eventStart >= startDate && eventStart <= endDate) ||
      (eventEnd >= startDate && eventEnd <= endDate) ||
      (eventStart <= startDate && eventEnd >= endDate)
    );
  });
}

/**
 * Format calendar header text based on view mode and selected date.
 *
 * Extracted from EventCalendarEnhanced useMemo (lines 382-399).
 */
export function formatCalendarHeader({ viewMode, selectedDate }: { viewMode: string; selectedDate: Date }) {
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
