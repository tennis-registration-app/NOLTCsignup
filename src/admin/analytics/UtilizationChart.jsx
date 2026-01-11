/**
 * UtilizationChart Component
 *
 * Displays overall court utilization statistics from API summary data.
 */
import React from 'react';

const UtilizationChart = ({ summary, loading }) => {
  // Default values when no data
  const stats = {
    courtHoursUsed: summary?.courtHoursUsed ?? 0,
    courtHoursScheduled: summary?.courtHoursScheduled ?? 0,
    utilizationPct: summary?.utilizationPct ?? 0,
    avgCourtHoursPerDay: summary?.avgCourtHoursPerDay ?? 0,
    sessions: summary?.sessions ?? 0,
    previous: summary?.previous ?? { courtHoursUsed: 0, utilizationPct: 0 },
  };

  // Calculate change from previous period
  const utilizationChange = stats.utilizationPct - (stats.previous?.utilizationPct || 0);
  const showChange = stats.previous?.utilizationPct > 0;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Court Utilization</h3>

      {loading && !summary ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Utilization</span>
              <span className="flex items-center gap-2">
                {stats.utilizationPct.toFixed(1)}%
                {showChange && (
                  <span
                    className={`text-xs ${utilizationChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {utilizationChange >= 0 ? '↑' : '↓'}
                    {Math.abs(utilizationChange).toFixed(1)}%
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(stats.utilizationPct, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Court Hours Used</p>
              <p className="text-2xl font-semibold">{stats.courtHoursUsed.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-gray-600">Avg Hours/Day</p>
              <p className="text-2xl font-semibold">{stats.avgCourtHoursPerDay.toFixed(1)}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <p>Total Sessions</p>
              <p className="font-medium text-gray-700">{stats.sessions}</p>
            </div>
            <div>
              <p>Available Hours</p>
              <p className="font-medium text-gray-700">{stats.courtHoursScheduled.toFixed(1)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UtilizationChart;
