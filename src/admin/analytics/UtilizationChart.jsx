/**
 * UtilizationChart Component
 *
 * Displays overall court utilization statistics.
 */
import React, { useMemo } from 'react';

// Access global config
const TENNIS_CONFIG = window.TENNIS_CONFIG || { COURTS: { TOTAL_COUNT: 12 } };

const UtilizationChart = ({ analyticsData, dateRange }) => {
  const stats = useMemo(() => {
    const totalHours = TENNIS_CONFIG.COURTS.TOTAL_COUNT * 15.5; // 6:30 AM to 10 PM
    const daysInRange = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)) || 1;
    const totalAvailableHours = totalHours * daysInRange;

    let totalUsedMinutes = 0;
    analyticsData.forEach(entry => {
      const duration = entry.duration || 90; // Default 90 minutes if not specified
      totalUsedMinutes += duration;
    });

    const totalUsedHours = totalUsedMinutes / 60;
    const utilizationPercent = (totalUsedHours / totalAvailableHours) * 100;

    return {
      totalAvailableHours,
      totalUsedHours: totalUsedHours.toFixed(1),
      utilizationPercent: utilizationPercent.toFixed(1),
      avgHoursPerDay: (totalUsedHours / daysInRange).toFixed(1)
    };
  }, [analyticsData, dateRange]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Court Utilization</h3>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Overall Utilization</span>
          <span>{stats.utilizationPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full"
            style={{ width: `${Math.min(stats.utilizationPercent, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Total Hours Used</p>
          <p className="text-2xl font-semibold">{stats.totalUsedHours}</p>
        </div>
        <div>
          <p className="text-gray-600">Avg Hours/Day</p>
          <p className="text-2xl font-semibold">{stats.avgHoursPerDay}</p>
        </div>
      </div>
    </div>
  );
};

export default UtilizationChart;
