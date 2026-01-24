/**
 * Expands the recurrence config into an array of date entries.
 * Mechanical extraction from CompleteBlockManagerEnhanced.
 * No side effects. Do not reorder logic.
 *
 * @param {Date} selectedDate - The starting date
 * @param {Object|null} recurrence - Recurrence config with pattern, frequency, endType, etc.
 * @returns {Array<{date: Date}>} Array of date objects
 */
export function expandRecurrenceDates(selectedDate, recurrence) {
  const blocks = [];

  if (!recurrence) {
    blocks.push({ date: selectedDate });
  } else {
    let currentDate = new Date(selectedDate);
    let occurrenceCount = 0;

    while (true) {
      blocks.push({ date: new Date(currentDate) });
      occurrenceCount++;

      if (recurrence.endType === 'after' && occurrenceCount >= recurrence.occurrences) {
        break;
      }
      if (recurrence.endType === 'date' && currentDate > new Date(recurrence.endDate)) {
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
