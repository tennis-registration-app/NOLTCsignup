import type { TimelineBlock } from '../blocks/BlockTimelineCard';

/**
 * Pure presenter for BlockTimeline.
 * Each function corresponds to an existing useMemo or inline computation.
 * Returns identical shapes to what the component previously computed inline.
 */

/**
 * Filter blocks by date range (day/week view) and court, then sort by startTime.
 *
 * Extracted from BlockTimeline useMemo (lines 106-160).
 */
interface FilterParams { blocks: TimelineBlock[]; viewMode: string; selectedDate: Date; filterCourt: string | number; }
export function filterBlocksByDateAndCourt({ blocks, viewMode, selectedDate, filterCourt }: FilterParams): TimelineBlock[] {
  let filtered = [...blocks];

  // Filter by date range based on view mode
  // Show blocks that overlap with the selected date range (past, present, or future)
  filtered = filtered.filter((block) => {
    const blockStart = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);

    if (viewMode === 'day') {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Block overlaps with day if:
      // - starts during the day, OR
      // - ends during the day, OR
      // - spans the entire day
      return (
        (blockStart >= dayStart && blockStart <= dayEnd) ||
        (blockEnd >= dayStart && blockEnd <= dayEnd) ||
        (blockStart <= dayStart && blockEnd >= dayEnd)
      );
    } else {
      // Week view
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Block overlaps with week if:
      // - starts during the week, OR
      // - ends during the week, OR
      // - spans the entire week
      return (
        (blockStart >= weekStart && blockStart <= weekEnd) ||
        (blockEnd >= weekStart && blockEnd <= weekEnd) ||
        (blockStart <= weekStart && blockEnd >= weekEnd)
      );
    }
  });

  // Filter by court if specific court selected
  if (filterCourt !== 'all') {
    filtered = filtered.filter((block) => block.courtNumber === parseInt(String(filterCourt)));
  }

  // Sort by start time
  filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return filtered;
}

/**
 * Group blocks by date string, returning an object keyed by dateString.
 *
 * Extracted from BlockTimeline inline reduce (lines 184-197).
 */
export function groupBlocksByDate(blocks: TimelineBlock[]) {
  const groups: Record<string, {date: Date; blocks: TimelineBlock[]}> = {};
  for (var block of blocks) {
    var blockDate = new Date(block.startTime);
    var dateKey = blockDate.toDateString();
    if (!groups[dateKey]) { groups[dateKey] = { date: blockDate, blocks: [] }; }
    groups[dateKey].blocks.push(block);
  }
  return groups;
}

/**
 * Sort grouped blocks by date ascending.
 *
 * Extracted from BlockTimeline inline sort (lines 199-201).
 */
export function sortGroupedBlocks(grouped: Record<string, {date: Date; blocks: TimelineBlock[]}>) {
  return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get block status based on current time.
 *
 * Extracted from BlockTimeline getBlockStatus (lines 162-169).
 */
export function getBlockStatus(block: TimelineBlock, currentTime: Date): string {
  const start = new Date(block.startTime);
  const end = new Date(block.endTime);

  if (currentTime >= start && currentTime < end) return 'active';
  if (currentTime >= end) return 'past';
  return 'future';
}

/**
 * Get CSS color classes for block status.
 *
 * Extracted from BlockTimeline getStatusColor (lines 171-182).
 */
export function getStatusColor(status: string): string {
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

/**
 * Get human-readable date label.
 *
 * Extracted from BlockTimeline getDateLabel + isToday + isTomorrow (lines 203-226).
 */
export function getDateLabel(date: Date): string {
  if (date.toDateString() === new Date().toDateString()) return 'Today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
