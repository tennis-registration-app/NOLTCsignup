/**
 * UsageHeatmap Component
 *
 * Displays court usage patterns as a heatmap by day and hour.
 * Accepts pre-aggregated data from the backend.
 */
import React, { useMemo } from 'react';

const UsageHeatmap = ({ heatmapData = [] }) => {
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build lookup from pre-aggregated data (supports both old and new API formats)
  const heatmapLookup = useMemo(() => {
    const lookup = {};
    heatmapData.forEach((d) => {
      const dayOfWeek = d.dow ?? d.day_of_week;
      const count = d.count ?? d.session_count;
      lookup[`${dayOfWeek}-${d.hour}`] = count;
    });
    return lookup;
  }, [heatmapData]);

  // Find max for color scaling
  const maxCount = useMemo(() => {
    if (heatmapData.length === 0) return 1;
    return Math.max(1, ...heatmapData.map((d) => d.count ?? d.session_count));
  }, [heatmapData]);

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
    if (hour === 12) return '12pm';
    if (hour > 12) return `${hour - 12}pm`;
    return `${hour}am`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Peak Usage Times</h3>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(7, 1fr)` }}>
          {/* Header row */}
          <div></div>
          {days.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 px-2">
              {day}
            </div>
          ))}

          {/* Data rows */}
          {hours.map((hour) => (
            <React.Fragment key={`row-${hour}`}>
              <div className="text-xs text-gray-600 pr-2 text-right whitespace-nowrap">
                {formatHour(hour)}
              </div>
              {days.map((_, dayIndex) => (
                <div
                  key={`${dayIndex}-${hour}`}
                  className={`w-8 h-6 rounded ${getColor(dayIndex, hour)} transition-colors relative`}
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
