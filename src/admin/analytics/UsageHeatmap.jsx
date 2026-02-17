/**
 * UsageHeatmap Component
 *
 * Displays court usage patterns as a heatmap by day and hour.
 * Horizontal orientation: hours on x-axis, days on y-axis.
 * Accepts pre-aggregated data from the backend.
 */
import React, { useMemo } from 'react';
import { normalizeHeatmapRow } from '../../lib/normalize/index.js';

const UsageHeatmap = ({ heatmapData = [] }) => {
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Normalize at ingestion, use camelCase throughout
  const normalizedData = useMemo(() => {
    return heatmapData.map(normalizeHeatmapRow);
  }, [heatmapData]);

  // Build lookup from normalized data
  const heatmapLookup = useMemo(() => {
    const lookup = {};
    normalizedData.forEach((d) => {
      lookup[`${d.dayOfWeek}-${d.hour}`] = d.sessionCount;
    });
    return lookup;
  }, [normalizedData]);

  // Find max for color scaling
  const maxCount = useMemo(() => {
    if (normalizedData.length === 0) return 1;
    return Math.max(1, ...normalizedData.map((d) => d.sessionCount));
  }, [normalizedData]);

  const getColor = (dayIndex, hour) => {
    const count = heatmapLookup[`${dayIndex}-${hour}`] || 0;
    if (count === 0) return 'bg-gray-100';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-green-600';
    if (intensity > 0.5) return 'bg-green-500';
    if (intensity > 0.25) return 'bg-green-400';
    return 'bg-green-200';
  };

  const getCount = (dayIndex, hour) => {
    return heatmapLookup[`${dayIndex}-${hour}`] || 0;
  };

  const formatHour = (hour) => {
    if (hour === 12) return '12p';
    if (hour > 12) return `${hour - 12}p`;
    return `${hour}a`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Peak Usage Times</h3>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(15, 1fr)` }}>
          {/* Header row - hours */}
          <div></div>
          {hours.map((hour) => (
            <div key={hour} className="text-center text-xs font-medium text-gray-600 px-1">
              {formatHour(hour)}
            </div>
          ))}

          {/* Data rows - days */}
          {days.map((dayName, dayIndex) => (
            <React.Fragment key={`row-${dayIndex}`}>
              <div className="text-xs text-gray-600 pr-2 text-right whitespace-nowrap">
                {dayName}
              </div>
              {hours.map((hour) => (
                <div
                  key={`${dayIndex}-${hour}`}
                  className={`w-6 h-6 rounded ${getColor(dayIndex, hour)} transition-colors relative`}
                >
                  {getCount(dayIndex, hour) > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-800">
                      {getCount(dayIndex, hour)}
                    </div>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <span>Less Usage</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <div className="w-4 h-4 bg-green-200 rounded"></div>
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <div className="w-4 h-4 bg-green-600 rounded"></div>
        </div>
        <span>More Usage</span>
      </div>
    </div>
  );
};

export default UsageHeatmap;
