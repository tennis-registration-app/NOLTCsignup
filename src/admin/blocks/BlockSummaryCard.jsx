// @ts-check
import React from 'react';

/**
 * BlockSummaryCard - Summary of current block configuration
 */
const BlockSummaryCard = ({
  selectedCourts,
  blockReason,
  startTime,
  endTime,
  recurrence,
  isEvent,
  eventType,
}) => (
  <div className="p-4 bg-blue-50 rounded-lg">
    <h4 className="font-medium text-blue-900 mb-3">Block Summary</h4>
    <div className="space-y-2 text-sm text-blue-800">
      {selectedCourts.length > 0 && (
        <div>
          <span className="font-medium">Courts:</span>{' '}
          {selectedCourts.sort((a, b) => a - b).join(', ')}
        </div>
      )}
      {blockReason && (
        <div>
          <span className="font-medium">Reason:</span> {blockReason}
        </div>
      )}
      {startTime && endTime && (
        <div>
          <span className="font-medium">Time:</span> {startTime === 'now' ? 'Now' : startTime} -{' '}
          {endTime}
        </div>
      )}
      {recurrence && (
        <div>
          <span className="font-medium">Repeats:</span> {recurrence.pattern}ly for{' '}
          {recurrence.endType === 'after'
            ? `${recurrence.occurrences} times`
            : `until ${recurrence.endDate}`}
        </div>
      )}
      {isEvent && (
        <div>
          <span className="font-medium">Event Calendar:</span> Yes ({eventType})
        </div>
      )}
    </div>
  </div>
);

export default BlockSummaryCard;
