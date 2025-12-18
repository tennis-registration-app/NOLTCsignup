/**
 * UsageHeatmap Component
 *
 * Displays court usage patterns as a heatmap by day and hour.
 */
import React, { useMemo } from 'react';

// Helper function for formatting hours
const formatHour = (hour) => {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour > 12) return `${hour - 12}pm`;
  return `${hour}am`;
};

const UsageHeatmap = ({ analyticsData }) => {
  const heatmapData = useMemo(() => {
    const heatmap = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize heatmap
    for (let day = 0; day < 7; day++) {
      heatmap[day] = {};
      for (let hour = 7; hour <= 21; hour++) {
        heatmap[day][hour] = 0;
      }
    }

    // Populate with data
    analyticsData.forEach(entry => {
      const date = new Date(entry.startTime);
      const day = date.getDay();
      const hour = date.getHours();
      if (hour >= 7 && hour <= 21) {
        heatmap[day][hour] = (heatmap[day][hour] || 0) + 1;
      }
    });

    // Find max for color scaling
    let maxUsage = 0;
    Object.values(heatmap).forEach(dayData => {
      Object.values(dayData).forEach(count => {
        if (count > maxUsage) maxUsage = count;
      });
    });

    return { heatmap, maxUsage, days };
  }, [analyticsData]);

  const getHeatColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = count / heatmapData.maxUsage;
    if (intensity < 0.2) return 'bg-green-200';
    if (intensity < 0.4) return 'bg-green-300';
    if (intensity < 0.6) return 'bg-green-400';
    if (intensity < 0.8) return 'bg-green-500';
    return 'bg-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Peak Usage Times</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour headers */}
          <div className="flex mb-2">
            <div className="w-16"></div>
            {[...Array(15)].map((_, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-600">
                {formatHour(i + 7)}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {heatmapData.days.map((day, dayIndex) => (
            <div key={day} className="flex mb-1">
              <div className="w-16 text-sm font-medium text-gray-700 flex items-center">
                {day}
              </div>
              {[...Array(15)].map((_, hourIndex) => {
                const hour = hourIndex + 7;
                const count = heatmapData.heatmap[dayIndex][hour] || 0;
                return (
                  <div
                    key={hour}
                    className={`flex-1 h-8 mx-0.5 rounded ${getHeatColor(count)} relative group`}
                  >
                    {count > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-800">
                        {count}
                      </div>
                    )}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                      {count} sessions
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <span>Less Usage</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <div className="w-4 h-4 bg-green-200 rounded"></div>
          <div className="w-4 h-4 bg-green-300 rounded"></div>
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
