import React from 'react';
import { ChevronLeft, ChevronRight } from '../components';

export default function BlockTimelineToolbar({
  viewMode,
  selectedDate,
  filterCourt,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  onFilterCourtChange,
}) {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('day')}
            className={`px-3 py-1 rounded ${viewMode === 'day' ? 'bg-white shadow-sm' : ''}`}
          >
            Day
          </button>
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-3 py-1 rounded ${viewMode === 'week' ? 'bg-white shadow-sm' : ''}`}
          >
            Week
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Today
          </button>
          <button onClick={onNext} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="font-medium">
          {viewMode === 'day'
            ? selectedDate.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : `Week of ${selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={filterCourt}
          onChange={(e) => onFilterCourtChange(e.target.value)}
          className="px-3 py-1 border rounded-lg text-sm"
        >
          <option value="all">All Courts</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              Court {i + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
