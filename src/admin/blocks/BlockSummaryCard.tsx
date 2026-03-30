// @ts-check
import React from 'react';
import { formatTo12h } from '../../components/admin/SmartTimeRangePicker';

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * BlockSummaryCard - Summary of current block configuration
 */
interface RecurrenceConfig {
  pattern: string;
  daysOfWeek?: number[];
  endType?: string;
  occurrences?: number;
  endDate?: string;
}

interface BlockSummaryCardProps {
  selectedCourts: number[];
  blockReason: string;
  startTime: string;
  endTime: string;
  recurrence: RecurrenceConfig | null;
}

const BlockSummaryCard = ({ selectedCourts, blockReason, startTime, endTime, recurrence }: BlockSummaryCardProps) => (
  <div className="p-4 bg-blue-50 rounded-lg">
    <h4 className="font-medium text-blue-900 mb-3">Block Summary</h4>
    <div className="space-y-2 text-sm text-blue-800">
      <div>
        <span className="font-medium">Courts:</span>{' '}
        {selectedCourts.length > 0 ? (
          selectedCourts.sort((a, b) => a - b).join(', ')
        ) : (
          <span className="text-blue-400">—</span>
        )}
      </div>
      <div>
        <span className="font-medium">Reason:</span>{' '}
        {blockReason || <span className="text-blue-400">—</span>}
      </div>
      <div>
        <span className="font-medium">Time:</span>{' '}
        {startTime && endTime ? (
          <>
            {formatTo12h(startTime)} - {formatTo12h(endTime)}
          </>
        ) : (
          <span className="text-blue-400">—</span>
        )}
      </div>
      <div>
        <span className="font-medium">Repeats:</span>{' '}
        {recurrence ? (
          <>
            {recurrence.pattern.endsWith('ly') ? recurrence.pattern : recurrence.pattern + 'ly'}
            {(recurrence.daysOfWeek?.length ?? 0) > 0 && (
              <> on {(recurrence.daysOfWeek ?? []).map((d: number) => DAY_ABBREVS[d]).join(', ')}</>
            )}{' '}
            for{' '}
            {recurrence.endType === 'after'
              ? `${recurrence.occurrences} times`
              : `until ${recurrence.endDate}`}
          </>
        ) : (
          <span className="text-blue-400">—</span>
        )}
      </div>
    </div>
  </div>
);

export default BlockSummaryCard;
