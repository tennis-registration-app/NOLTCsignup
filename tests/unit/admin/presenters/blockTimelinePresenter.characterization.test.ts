/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  filterBlocksByDateAndCourt,
  groupBlocksByDate,
  sortGroupedBlocks,
  getBlockStatus,
  getStatusColor,
  getDateLabel,
} from '../../../../src/admin/presenters/blockTimelinePresenter.js';

// --- Legacy functions copied verbatim from BlockTimeline.jsx BEFORE refactor ---

// Copied from BlockTimeline useMemo (lines 106-160)
function legacyFilterBlocks(blocks, viewMode, selectedDate, filterCourt) {
  let filtered = [...blocks];

  filtered = filtered.filter((block) => {
    const blockStart = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);

    if (viewMode === 'day') {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      return (
        (blockStart >= dayStart && blockStart <= dayEnd) ||
        (blockEnd >= dayStart && blockEnd <= dayEnd) ||
        (blockStart <= dayStart && blockEnd >= dayEnd)
      );
    } else {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return (
        (blockStart >= weekStart && blockStart <= weekEnd) ||
        (blockEnd >= weekStart && blockEnd <= weekEnd) ||
        (blockStart <= weekStart && blockEnd >= weekEnd)
      );
    }
  });

  if (filterCourt !== 'all') {
    filtered = filtered.filter((block) => block.courtNumber === parseInt(filterCourt));
  }

  filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return filtered;
}

// Copied from BlockTimeline inline reduce (lines 184-197)
function legacyGroupBlocksByDate(blocks) {
  return blocks.reduce((groups, block) => {
    const blockDate = new Date(block.startTime);
    const dateKey = blockDate.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: blockDate,
        blocks: [],
      };
    }

    groups[dateKey].blocks.push(block);
    return groups;
  }, {});
}

// Copied from BlockTimeline inline sort (lines 199-201)
function legacySortGroupedBlocks(grouped) {
  return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Copied from BlockTimeline getBlockStatus (lines 162-169)
function legacyGetBlockStatus(block, currentTime) {
  const start = new Date(block.startTime);
  const end = new Date(block.endTime);

  if (currentTime >= start && currentTime < end) return 'active';
  if (currentTime >= end) return 'past';
  return 'future';
}

// Copied from BlockTimeline getStatusColor (lines 171-182)
function legacyGetStatusColor(status) {
  switch (status) {
    case 'active':
      return 'bg-red-50 border-red-300 text-red-900';
    case 'past':
      return 'bg-gray-50 border-gray-300 text-gray-600';
    case 'future':
      return 'bg-blue-50 border-blue-300 text-blue-900';
    default:
      return '';
  }
}

// --- Fixtures ---

// Fixed date: Wednesday June 18, 2025
const fixtureDate = new Date(2025, 5, 18, 12, 0, 0);

const fixtureBlocks = [
  {
    id: 'b1',
    courtId: 'c1',
    courtNumber: 1,
    startTime: '2025-06-18T09:00:00',
    endTime: '2025-06-18T11:00:00',
    reason: 'maintenance',
    title: 'Court Resurfacing',
  },
  {
    id: 'b2',
    courtId: 'c3',
    courtNumber: 3,
    startTime: '2025-06-18T14:00:00',
    endTime: '2025-06-18T16:00:00',
    reason: 'lesson',
    title: 'Junior Lesson',
  },
  {
    id: 'b3',
    courtId: 'c5',
    courtNumber: 5,
    startTime: '2025-06-19T08:00:00',
    endTime: '2025-06-19T10:00:00',
    reason: 'wet',
    title: 'Wet Court',
    isWetCourt: true,
  },
  {
    id: 'b4',
    courtId: 'c1',
    courtNumber: 1,
    startTime: '2025-06-20T10:00:00',
    endTime: '2025-06-20T12:00:00',
    reason: 'tournament',
    title: 'Club Tournament',
    isRecurring: true,
  },
  {
    id: 'b5',
    courtId: 'c7',
    courtNumber: 7,
    startTime: '2025-06-18T06:00:00',
    endTime: '2025-06-18T08:00:00',
    reason: 'maintenance',
    title: 'Morning Prep',
  },
  {
    id: 'b6',
    courtId: 'c3',
    courtNumber: 3,
    startTime: '2025-06-22T09:00:00',
    endTime: '2025-06-22T11:00:00',
    reason: 'league',
    title: 'Summer League',
  },
];

// --- Tests ---

describe('blockTimelinePresenter equivalence', () => {
  describe('filterBlocksByDateAndCourt', () => {
    it('matches legacy for day view', () => {
      const legacy = legacyFilterBlocks(fixtureBlocks, 'day', fixtureDate, 'all');
      const presenter = filterBlocksByDateAndCourt({
        blocks: fixtureBlocks,
        viewMode: 'day',
        selectedDate: fixtureDate,
        filterCourt: 'all',
      });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy for week view', () => {
      const legacy = legacyFilterBlocks(fixtureBlocks, 'week', fixtureDate, 'all');
      const presenter = filterBlocksByDateAndCourt({
        blocks: fixtureBlocks,
        viewMode: 'week',
        selectedDate: fixtureDate,
        filterCourt: 'all',
      });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with court filter', () => {
      const legacy = legacyFilterBlocks(fixtureBlocks, 'day', fixtureDate, '1');
      const presenter = filterBlocksByDateAndCourt({
        blocks: fixtureBlocks,
        viewMode: 'day',
        selectedDate: fixtureDate,
        filterCourt: '1',
      });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with no matching court', () => {
      const legacy = legacyFilterBlocks(fixtureBlocks, 'day', fixtureDate, '12');
      const presenter = filterBlocksByDateAndCourt({
        blocks: fixtureBlocks,
        viewMode: 'day',
        selectedDate: fixtureDate,
        filterCourt: '12',
      });
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with empty blocks', () => {
      const legacy = legacyFilterBlocks([], 'day', fixtureDate, 'all');
      const presenter = filterBlocksByDateAndCourt({
        blocks: [],
        viewMode: 'day',
        selectedDate: fixtureDate,
        filterCourt: 'all',
      });
      expect(presenter).toEqual(legacy);
    });

    it('results are sorted by startTime', () => {
      const result = filterBlocksByDateAndCourt({
        blocks: fixtureBlocks,
        viewMode: 'day',
        selectedDate: fixtureDate,
        filterCourt: 'all',
      });
      for (let i = 1; i < result.length; i++) {
        expect(new Date(result[i].startTime).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i - 1].startTime).getTime()
        );
      }
    });
  });

  describe('groupBlocksByDate', () => {
    it('matches legacy grouping', () => {
      const filtered = filterBlocksByDateAndCourt({
        blocks: fixtureBlocks,
        viewMode: 'week',
        selectedDate: fixtureDate,
        filterCourt: 'all',
      });
      const legacy = legacyGroupBlocksByDate(filtered);
      const presenter = groupBlocksByDate(filtered);
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with empty blocks', () => {
      const legacy = legacyGroupBlocksByDate([]);
      const presenter = groupBlocksByDate([]);
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with single-date blocks', () => {
      const singleDay = fixtureBlocks.filter((b) => b.startTime.startsWith('2025-06-18'));
      const legacy = legacyGroupBlocksByDate(singleDay);
      const presenter = groupBlocksByDate(singleDay);
      expect(presenter).toEqual(legacy);
    });
  });

  describe('sortGroupedBlocks', () => {
    it('matches legacy sort order', () => {
      const filtered = filterBlocksByDateAndCourt({
        blocks: fixtureBlocks,
        viewMode: 'week',
        selectedDate: fixtureDate,
        filterCourt: 'all',
      });
      const grouped = groupBlocksByDate(filtered);
      const legacy = legacySortGroupedBlocks(grouped);
      const presenter = sortGroupedBlocks(grouped);
      expect(presenter).toEqual(legacy);
    });

    it('matches legacy with empty grouped', () => {
      const legacy = legacySortGroupedBlocks({});
      const presenter = sortGroupedBlocks({});
      expect(presenter).toEqual(legacy);
    });
  });

  describe('getBlockStatus', () => {
    const block = {
      startTime: '2025-06-18T10:00:00',
      endTime: '2025-06-18T12:00:00',
    };

    it('matches legacy: active', () => {
      const during = new Date('2025-06-18T11:00:00');
      expect(getBlockStatus(block, during)).toBe(legacyGetBlockStatus(block, during));
      expect(getBlockStatus(block, during)).toBe('active');
    });

    it('matches legacy: past', () => {
      const after = new Date('2025-06-18T13:00:00');
      expect(getBlockStatus(block, after)).toBe(legacyGetBlockStatus(block, after));
      expect(getBlockStatus(block, after)).toBe('past');
    });

    it('matches legacy: future', () => {
      const before = new Date('2025-06-18T09:00:00');
      expect(getBlockStatus(block, before)).toBe(legacyGetBlockStatus(block, before));
      expect(getBlockStatus(block, before)).toBe('future');
    });

    it('matches legacy: exactly at start time (active)', () => {
      const atStart = new Date('2025-06-18T10:00:00');
      expect(getBlockStatus(block, atStart)).toBe(legacyGetBlockStatus(block, atStart));
    });

    it('matches legacy: exactly at end time (past)', () => {
      const atEnd = new Date('2025-06-18T12:00:00');
      expect(getBlockStatus(block, atEnd)).toBe(legacyGetBlockStatus(block, atEnd));
    });
  });

  describe('getStatusColor', () => {
    it('matches legacy for all statuses', () => {
      for (const status of ['active', 'past', 'future', 'unknown']) {
        expect(getStatusColor(status)).toBe(legacyGetStatusColor(status));
      }
    });
  });

  describe('getDateLabel', () => {
    let realDate;

    beforeEach(() => {
      // Fix "now" so isToday/isTomorrow are deterministic
      realDate = Date;
      const fixedNow = new Date(2025, 5, 18, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Today for today', () => {
      expect(getDateLabel(new Date(2025, 5, 18))).toBe('Today');
    });

    it('returns Tomorrow for tomorrow', () => {
      expect(getDateLabel(new Date(2025, 5, 19))).toBe('Tomorrow');
    });

    it('returns weekday name for dates within 7 days', () => {
      // June 20 = Friday, 2 days from June 18
      const result = getDateLabel(new Date(2025, 5, 20));
      expect(result).toBe('Friday');
    });

    it('returns formatted date for dates beyond 7 days', () => {
      const result = getDateLabel(new Date(2025, 5, 30));
      // Should be something like "Mon, Jun 30"
      expect(result).toContain('Jun');
      expect(result).toContain('30');
    });
  });
});
