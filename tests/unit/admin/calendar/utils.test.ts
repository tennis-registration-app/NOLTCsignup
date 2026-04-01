import { describe, it, expect } from 'vitest';
import {
  getEventColor,
  getEventTypeFromReason,
  getEventEmoji,
  calculateEventLayout,
  type CalendarEvent,
} from '../../../../src/admin/calendar/utils.js';

// ── getEventColor ──────────────────────────────────────────────
describe('getEventColor', () => {
  // By eventType
  it('returns purple for tournament eventType', () => {
    expect(getEventColor({ eventType: 'tournament', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-purple-200/);
  });

  it('returns yellow for league eventType', () => {
    expect(getEventColor({ eventType: 'league', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-yellow-300/);
  });

  it('returns purple-100 for clinic eventType', () => {
    expect(getEventColor({ eventType: 'clinic', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-purple-100/);
  });

  it('returns teal for lesson eventType', () => {
    expect(getEventColor({ eventType: 'lesson', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-teal-500/);
  });

  it('returns amber for maintenance eventType', () => {
    expect(getEventColor({ eventType: 'maintenance', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-amber-200/);
  });

  // By reason fallback (no eventType)
  it('returns blue for WET reason', () => {
    expect(getEventColor({ reason: 'Wet Court', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-blue-200/);
  });

  it('returns orange for MAINTENANCE reason', () => {
    expect(getEventColor({ reason: 'Maintenance', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-orange-200/);
  });

  it('returns orange for COURT WORK reason', () => {
    expect(getEventColor({ reason: 'Court Work', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-orange-200/);
  });

  it('returns green for LESSON reason', () => {
    expect(getEventColor({ reason: 'Lesson time', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-green-200/);
  });

  it('returns purple-100 for CLINIC reason', () => {
    expect(getEventColor({ reason: 'Clinic', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-purple-100/);
  });

  it('returns purple-200 for TOURNAMENT reason', () => {
    expect(getEventColor({ reason: 'Tournament', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-purple-200/);
  });

  it('returns yellow for LEAGUE reason', () => {
    expect(getEventColor({ reason: 'League Play', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-yellow-300/);
  });

  it('returns gray default for unknown', () => {
    expect(getEventColor({ reason: 'Something else', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-gray-200/);
  });

  it('returns gray default for empty event', () => {
    expect(getEventColor({ startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-gray-200/);
  });

  it('uses event.type when event.eventType is absent', () => {
    expect(getEventColor({ type: 'league', startTime: '', endTime: '' } as CalendarEvent)).toMatch(/bg-yellow-300/);
  });
});

// ── getEventTypeFromReason ─────────────────────────────────────
describe('getEventTypeFromReason', () => {
  it('returns tournament for TOURNAMENT reason', () => {
    expect(getEventTypeFromReason('Tournament Play')).toBe('tournament');
  });

  it('returns league for LEAGUE reason', () => {
    expect(getEventTypeFromReason('League Match')).toBe('league');
  });

  it('returns clinic for CLINIC reason', () => {
    expect(getEventTypeFromReason('Clinic Session')).toBe('clinic');
  });

  it('returns lesson for LESSON reason', () => {
    expect(getEventTypeFromReason('Private Lesson')).toBe('lesson');
  });

  it('returns maintenance for MAINTENANCE reason', () => {
    expect(getEventTypeFromReason('Maintenance')).toBe('maintenance');
  });

  it('returns maintenance for COURT WORK reason', () => {
    expect(getEventTypeFromReason('Court Work')).toBe('maintenance');
  });

  it('returns null for WET reason', () => {
    expect(getEventTypeFromReason('Wet Courts')).toBeNull();
  });

  it('returns other for custom reasons', () => {
    expect(getEventTypeFromReason('Special Event')).toBe('other');
  });

  it('is case insensitive', () => {
    expect(getEventTypeFromReason('tournament')).toBe('tournament');
    expect(getEventTypeFromReason('TOURNAMENT')).toBe('tournament');
  });
});

// ── getEventEmoji ──────────────────────────────────────────────
describe('getEventEmoji', () => {
  it.each([
    ['league', '🏆'],
    ['tournament', '⭐'],
    ['clinic', '🎓'],
    ['lesson', '👥'],
    ['maintenance', '🔧'],
  ])('returns %s emoji for %s', (type, emoji) => {
    expect(getEventEmoji(type)).toBe(emoji);
  });

  it('returns calendar emoji for unknown type', () => {
    expect(getEventEmoji('other')).toBe('📅');
  });

  it('returns calendar emoji for null', () => {
    expect(getEventEmoji(null as any)).toBe('📅');
  });
});

// ── calculateEventLayout ───────────────────────────────────────
describe('calculateEventLayout', () => {
  const mkEvent = (id: string, startHour: number, endHour: number, court = 1): CalendarEvent => ({
    id,
    startTime: `2024-01-15T${String(startHour).padStart(2, '0')}:00:00`,
    endTime: `2024-01-15T${String(endHour).padStart(2, '0')}:00:00`,
    courtNumbers: [court],
  });

  it('returns empty map for empty array', () => {
    const result = calculateEventLayout([]);
    expect(result.size).toBe(0);
  });

  it('assigns single event to column 0 with totalColumns 1', () => {
    const events = [mkEvent('a', 10, 11)];
    const layout = calculateEventLayout(events);
    const info = layout.get('a');
    expect(info!.column).toBe(0);
    expect(info!.totalColumns).toBe(1);
  });

  it('assigns non-overlapping events to column 0', () => {
    const events = [mkEvent('a', 10, 11), mkEvent('b', 12, 13)];
    const layout = calculateEventLayout(events);
    expect(layout.get('a')!.column).toBe(0);
    expect(layout.get('b')!.column).toBe(0);
  });

  it('assigns overlapping events to different columns', () => {
    const events = [mkEvent('a', 10, 12), mkEvent('b', 11, 13)];
    const layout = calculateEventLayout(events);
    const colA = layout.get('a')!.column;
    const colB = layout.get('b')!.column;
    expect(colA).not.toBe(colB);
    expect(layout.get('a')!.totalColumns).toBe(2);
    expect(layout.get('b')!.totalColumns).toBe(2);
  });

  it('handles three overlapping events', () => {
    const events = [mkEvent('a', 10, 13), mkEvent('b', 11, 14), mkEvent('c', 12, 15)];
    const layout = calculateEventLayout(events);
    const cols = new Set([
      layout.get('a')!.column,
      layout.get('b')!.column,
      layout.get('c')!.column,
    ]);
    expect(cols.size).toBe(3);
    expect(layout.get('a')!.totalColumns).toBe(3);
  });

  it('uses startTime-courtNumber as fallback key when no id', () => {
    const events = [{
      startTime: '2024-01-15T10:00:00',
      endTime: '2024-01-15T11:00:00',
      courtNumbers: [3],
    }];
    const layout = calculateEventLayout(events);
    const info = layout.get('2024-01-15T10:00:00-3');
    expect(info).toBeDefined();
    expect(info!.column).toBe(0);
  });

  it('sorts by start time, then longer events first', () => {
    // Longer event starting at same time should come first in sort
    const short = mkEvent('short', 10, 11);
    const long = mkEvent('long', 10, 13);
    const layout = calculateEventLayout([short, long]);
    // Both overlap, should be in different columns; long should get col 0
    expect(layout.get('long')!.column).toBe(0);
    expect(layout.get('short')!.column).toBe(1);
  });
});
