/**
 * WaitTimeAnalysis Component
 *
 * Displays waitlist entries with wait times as a scrollable list.
 */
import React, { useMemo } from 'react';

const WaitTimeAnalysis = ({ waitlistData = [], loading }) => {
  // Calculate summary stats
  const stats = useMemo(() => {
    if (waitlistData.length === 0) return null;
    const totalMinutes = waitlistData.reduce((sum, w) => sum + w.minutesWaited, 0);
    const avgWait = Math.round(totalMinutes / waitlistData.length);
    const maxWait = Math.max(...waitlistData.map((w) => w.minutesWaited));
    return { avgWait, maxWait, count: waitlistData.length };
  }, [waitlistData]);

  // Format time for display (convert UTC to Central)
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format player names (join with commas)
  const formatPlayers = (names) => {
    if (!names || names.length === 0) return 'Unknown';
    return names.join(', ');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Wait Time Analysis</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Wait Time Analysis</h3>

      {/* Summary row */}
      {stats && (
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <span className="text-gray-500">Groups:</span>{' '}
            <span className="font-semibold">{stats.count}</span>
          </div>
          <div>
            <span className="text-gray-500">Avg Wait:</span>{' '}
            <span className="font-semibold">{stats.avgWait} min</span>
          </div>
          <div>
            <span className="text-gray-500">Max Wait:</span>{' '}
            <span className="font-semibold">{stats.maxWait} min</span>
          </div>
        </div>
      )}

      {/* Scrollable list */}
      {waitlistData.length === 0 ? (
        <p className="text-gray-500 text-sm">No waitlist entries in this period</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b sticky top-0 bg-white">
              <tr>
                <th className="pb-2 font-medium">Players</th>
                <th className="pb-2 font-medium">Joined</th>
                <th className="pb-2 font-medium text-right">Wait</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {waitlistData.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-2">{formatPlayers(entry.playerNames)}</td>
                  <td className="py-2 text-gray-600">{formatTime(entry.joinedAt)}</td>
                  <td className="py-2 text-right font-medium">
                    <span
                      className={entry.minutesWaited > 30 ? 'text-orange-600' : 'text-green-600'}
                    >
                      {entry.minutesWaited} min
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WaitTimeAnalysis;
