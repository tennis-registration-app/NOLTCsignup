/**
 * WaitTimeAnalysis Component
 *
 * Displays waitlist and wait time statistics.
 */
import React, { useMemo } from 'react';

// Helper function for formatting time
const formatTime = (hour) => {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};

const WaitTimeAnalysis = ({ waitlistData }) => {
  const stats = useMemo(() => {
    if (!waitlistData || waitlistData.length === 0) {
      return {
        avgWaitTime: 0,
        maxWaitTime: 0,
        totalGroupsServed: 0,
        peakWaitHour: 'N/A'
      };
    }

    const waitTimes = waitlistData.map(entry => entry.waitTime || 0);
    const avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    const maxWaitTime = Math.max(...waitTimes);

    // Find peak wait hour
    const hourCounts = {};
    waitlistData.forEach(entry => {
      const hour = new Date(entry.joinTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let peakHour = 0;
    let peakCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = parseInt(hour);
      }
    });

    return {
      avgWaitTime: Math.round(avgWaitTime),
      maxWaitTime,
      totalGroupsServed: waitlistData.length,
      peakWaitHour: formatTime(peakHour)
    };
  }, [waitlistData]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Wait Time Analysis</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.avgWaitTime}</p>
          <p className="text-sm text-gray-600">Avg Wait (min)</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-600">{stats.maxWaitTime}</p>
          <p className="text-sm text-gray-600">Max Wait (min)</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{stats.totalGroupsServed}</p>
          <p className="text-sm text-gray-600">Groups Served</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-purple-600">{stats.peakWaitHour}</p>
          <p className="text-sm text-gray-600">Peak Hour</p>
        </div>
      </div>
    </div>
  );
};

export default WaitTimeAnalysis;
