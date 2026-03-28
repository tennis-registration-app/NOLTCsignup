interface RecurrenceConfig {
  pattern: string;
  frequency: number;
  endType: string;
  occurrences?: number;
  endDate?: string;
  daysOfWeek?: number[];
}

/**
 * Expands the recurrence config into an array of date entries.
 * Mechanical extraction from CompleteBlockManagerEnhanced.
 * No side effects. Do not reorder logic.
 */
export function expandRecurrenceDates(selectedDate: Date, recurrence: RecurrenceConfig | null): Array<{ date: Date }> {
  const blocks: Array<{ date: Date }> = [];

  if (!recurrence) {
    blocks.push({ date: selectedDate });
  } else if (
    recurrence.pattern === 'weekly' &&
    recurrence.daysOfWeek &&
    recurrence.daysOfWeek.length > 0
  ) {
    // Weekly with specific days: walk day-by-day within each week span
    const days = recurrence.daysOfWeek;
    let currentDate = new Date(selectedDate);
    let occurrenceCount = 0;
    const endDate = recurrence.endType === 'date' ? new Date(recurrence.endDate!) : null;
    let safety = 0;

    while (safety < 365 * 2) {
      safety++;
      if (days.includes(currentDate.getDay())) {
        blocks.push({ date: new Date(currentDate) });
        occurrenceCount++;
        if (recurrence.endType === 'after' && occurrenceCount >= recurrence.occurrences!) break;
        if (endDate && currentDate > endDate) break;
      }
      // Advance: if today is the last selected day of the week, skip ahead by (frequency - 1) weeks
      const dayOfWeek = currentDate.getDay();
      const maxSelectedDay = Math.max(...days);
      if (dayOfWeek >= maxSelectedDay) {
        // Jump to start of next cycle: skip (frequency - 1) * 7 days, then advance to next day
        currentDate.setDate(currentDate.getDate() + (recurrence.frequency - 1) * 7 + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  } else {
    let currentDate = new Date(selectedDate);
    let occurrenceCount = 0;

    while (true) {
      blocks.push({ date: new Date(currentDate) });
      occurrenceCount++;

      if (recurrence.endType === 'after' && occurrenceCount >= recurrence.occurrences!) {
        break;
      }
      if (recurrence.endType === 'date' && currentDate > new Date(recurrence.endDate!)) {
        break;
      }

      if (recurrence.pattern === 'daily') {
        currentDate.setDate(currentDate.getDate() + recurrence.frequency);
      } else if (recurrence.pattern === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7 * recurrence.frequency);
      } else if (recurrence.pattern === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + recurrence.frequency);
      }

      if (occurrenceCount > 365) break;
    }
  }

  return blocks;
}
