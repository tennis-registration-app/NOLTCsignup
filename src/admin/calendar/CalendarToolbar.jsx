import React from 'react';
import { ChevronLeft, ChevronRight } from '../components';

export default function CalendarToolbar({
  headerText,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
}) {
  return (
    <div className="flex items-center justify-between mb-2 px-4">
      {/* Day/Week/Month buttons on the left */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onViewModeChange('day')}
          className={`px-3 py-1 rounded text-sm ${
            viewMode === 'day' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => onViewModeChange('week')}
          className={`px-3 py-1 rounded text-sm ${
            viewMode === 'week' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => onViewModeChange('month')}
          className={`px-3 py-1 rounded text-sm ${
            viewMode === 'month' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Month
        </button>
      </div>

      {/* Navigation arrows and Today button in center */}
      <div className="flex items-center gap-3">
        <button onClick={onPrev} className="p-2 hover:bg-gray-100 rounded">
          <ChevronLeft size={32} />
        </button>

        <button
          onClick={onToday}
          className="px-4 py-1.5 bg-blue-100 hover:bg-blue-300 text-gray-800 border border-blue-300 hover:border-blue-400 rounded text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          Today
        </button>
        <button onClick={onNext} className="p-2 hover:bg-gray-100 rounded">
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Date display on the right */}
      <h2 className="text-lg font-semibold w-64 text-right">{headerText}</h2>
    </div>
  );
}
