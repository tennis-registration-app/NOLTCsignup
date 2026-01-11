/**
 * WaitlistHeatmap Component
 *
 * Displays waitlist congestion patterns as a heatmap by day and hour.
 * Horizontal orientation: hours on x-axis, days on y-axis.
 * Color scale: gray (none) -> yellow -> orange -> red (high congestion)
 */
import React, { useMemo } from 'react';

const WaitlistHeatmap = ({ heatmapData = [] }) => {
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build lookup from pre-aggregated data
  const heatmapLookup = useMemo(() => {
    const lookup = {};
    heatmapData.forEach(({ dow, hour, count, avgWait }) => {
      lookup[`${dow}-${hour}`] = { count, avgWait };
    });
    return lookup;
  }, [heatmapData]);

  // Find max for color scaling
  const maxCount = useMemo(() => {
    if (heatmapData.length === 0) return 1;
    return Math.max(1, ...heatmapData.map((d) => d.count));
  }, [heatmapData]);

  const getColor = (dayIndex, hour) => {
    const data = heatmapLookup[`${dayIndex}-${hour}`];
    if (!data || data.count === 0) return 'bg-gray-100';
    const intensity = data.count / maxCount;
    // Gray -> Yellow -> Orange -> Red (more waiting = worse)
    if (intensity > 0.75) return 'bg-red-500';
    if (intensity > 0.5) return 'bg-orange-500';
    if (intensity > 0.25) return 'bg-yellow-500';
    return 'bg-yellow-200';
  };

  const getData = (dayIndex, hour) => {
    return heatmapLookup[`${dayIndex}-${hour}`] || { count: 0, avgWait: 0 };
  };

  const formatHour = (hour) => {
    if (hour === 12) return '12p';
    if (hour > 12) return `${hour - 12}p`;
    return `${hour}a`;
  };

  const getTooltip = (dayIndex, hour) => {
    const data = getData(dayIndex, hour);
    if (data.count === 0) return `${days[dayIndex]} ${formatHour(hour)}: No waitlist`;
    return `${days[dayIndex]} ${formatHour(hour)}: ${data.count} group${data.count > 1 ? 's' : ''}, avg ${data.avgWait} min wait`;
  };

  return (
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
            <div className="text-xs text-gray-600 pr-2 text-right whitespace-nowrap">{dayName}</div>
            {hours.map((hour) => (
              <div key={`${dayIndex}-${hour}`} className="relative group">
                <div className={`w-6 h-6 rounded ${getColor(dayIndex, hour)} transition-colors`} />
                {getData(dayIndex, hour).count > 0 && (
                  <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 shadow-lg">
                    {getData(dayIndex, hour).count} group
                    {getData(dayIndex, hour).count > 1 ? 's' : ''}, avg{' '}
                    {getData(dayIndex, hour).avgWait} min
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <span>No Waitlist</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <div className="w-4 h-4 bg-yellow-200 rounded"></div>
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <div className="w-4 h-4 bg-red-500 rounded"></div>
        </div>
        <span>High Congestion</span>
      </div>
    </div>
  );
};

export default WaitlistHeatmap;
