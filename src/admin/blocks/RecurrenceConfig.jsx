/**
 * RecurrenceConfig Component
 *
 * Configure recurring block patterns (daily, weekly, monthly).
 */
import React, { useState, useEffect } from 'react';

const RecurrenceConfig = ({ recurrence, onRecurrenceChange }) => {
  const [pattern, setPattern] = useState(recurrence?.pattern || 'daily');
  const [frequency, setFrequency] = useState(recurrence?.frequency || 1);
  const [endType, setEndType] = useState(recurrence?.endType || 'after');
  const [occurrences, setOccurrences] = useState(recurrence?.occurrences || 7);
  const [endDate, setEndDate] = useState(recurrence?.endDate || '');

  useEffect(() => {
    onRecurrenceChange({
      pattern,
      frequency,
      endType,
      occurrences,
      endDate
    });
  }, [pattern, frequency, endType, occurrences, endDate]);

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repeat Pattern
          </label>
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full p-2 border rounded-lg"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Every
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="30"
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
              className="w-20 p-2 border rounded-lg"
            />
            <span className="text-sm text-gray-600">
              {pattern === 'daily' ? 'day(s)' : pattern === 'weekly' ? 'week(s)' : 'month(s)'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          End
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="after"
              checked={endType === 'after'}
              onChange={(e) => setEndType(e.target.value)}
              className="text-blue-600"
            />
            <span className="text-sm">After</span>
            <input
              type="number"
              min="1"
              max="365"
              value={occurrences}
              onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
              disabled={endType !== 'after'}
              className="w-20 p-1 border rounded text-sm"
            />
            <span className="text-sm">occurrences</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="date"
              checked={endType === 'date'}
              onChange={(e) => setEndType(e.target.value)}
              className="text-blue-600"
            />
            <span className="text-sm">On date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={endType !== 'date'}
              className="p-1 border rounded text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default RecurrenceConfig;
