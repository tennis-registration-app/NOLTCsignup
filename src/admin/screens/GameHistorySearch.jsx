/**
 * GameHistorySearch Component
 *
 * Search interface for historical game records.
 * Uses the TennisBackend pattern via backend.admin.getSessionHistory().
 */
import React, { useState } from 'react';
import { FileText } from '../components';
import { normalizeGameSession } from '../../lib/normalize/adminAnalytics.js';

// Map database endReason to display-friendly values
// Keys are database values (snake_case literals preserved for mapping)
const END_REASON_MAP = {
  cleared: 'Cleared',
  observed_cleared: 'Observed-Cleared',
  admin_override: 'Admin-Cleared',
  overtime_takeover: 'Bumped',
  auto_cleared: 'Auto-Cleared',
  // Legacy values (for historical data before migration)
  completed: 'Auto-Cleared',
  cleared_early: 'Cleared',
};

const mapEndReason = (dbReason) => {
  return END_REASON_MAP[dbReason] || dbReason || 'Cleared';
};

const GameHistorySearch = ({ backend }) => {
  const [searchFilters, setSearchFilters] = useState({
    courtNumber: '',
    playerName: '',
    startDate: '',
    endDate: '',
    clearReason: '',
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      // Call the backend API via TennisBackend pattern
      const response = await backend.admin.getSessionHistory({
        courtNumber: searchFilters.courtNumber || undefined,
        memberName: searchFilters.playerName || undefined,
        dateStart: searchFilters.startDate || undefined,
        dateEnd: searchFilters.endDate || undefined,
        limit: 100,
      });

      if (response.ok && response.sessions) {
        // Normalize at ingestion, use camelCase
        let results = response.sessions.map((session) => {
          const normalized = normalizeGameSession(session);
          return {
            id: normalized.id,
            courtNumber: normalized.courtNumber,
            startTime: normalized.startedAt,
            endTime: normalized.endedAt,
            players: (normalized.participants || []).map((p) => ({
              name: p.name || 'Unknown',
              type: p.type,
            })),
            clearReason: mapEndReason(normalized.endReason),
          };
        });

        // Client-side filter by clearReason if specified
        if (searchFilters.clearReason) {
          results = results.filter((r) => r.clearReason === searchFilters.clearReason);
        }

        setSearchResults(results);
      } else {
        setError(response.error || 'Failed to fetch history');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('[GameHistory] Search error:', err);
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearFilters = () => {
    setSearchFilters({
      courtNumber: '',
      playerName: '',
      startDate: '',
      endDate: '',
      clearReason: '',
    });
    setSearchResults([]);
    setHasSearched(false);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Game History Search</h3>

      {/* Search Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Court Number</label>
          <select
            value={searchFilters.courtNumber}
            onChange={(e) => setSearchFilters((prev) => ({ ...prev, courtNumber: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Courts</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Court {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Player Name</label>
          <input
            type="text"
            placeholder="Search by player name..."
            value={searchFilters.playerName}
            onChange={(e) => setSearchFilters((prev) => ({ ...prev, playerName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            value={searchFilters.startDate}
            onChange={(e) => setSearchFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            value={searchFilters.endDate}
            onChange={(e) => setSearchFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Clear Reason</label>
          <select
            value={searchFilters.clearReason}
            onChange={(e) => setSearchFilters((prev) => ({ ...prev, clearReason: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="Cleared">Cleared</option>
            <option value="Observed-Cleared">Observed-Cleared</option>
            <option value="Admin-Cleared">Admin-Cleared</option>
            <option value="Auto-Cleared">Auto-Cleared</option>
            <option value="Bumped">Bumped</option>
          </select>
        </div>
      </div>

      {/* Search Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSearching ? 'Searching...' : 'Search Games'}
        </button>
        <button
          onClick={handleClearFilters}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Clear Filters
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          Error: {error}
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className="border-t pt-6">
          <h4 className="text-md font-semibold text-gray-800 mb-4">
            Search Results ({searchResults.length} games found)
          </h4>

          {searchResults.length === 0 && !error ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p>No games found matching your criteria.</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Court
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Players
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clear Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((game, idx) => (
                    <tr key={game.id || idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Court {game.courtNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(game.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(game.startTime)} - {formatTime(game.endTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1">
                          {game.players.map((player, pidx) => (
                            <div key={pidx} className="text-sm">
                              {player.name || player}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          const duration = Math.round(
                            (new Date(game.endTime) - new Date(game.startTime)) / (1000 * 60)
                          );
                          return `${duration} min`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            game.clearReason === 'Auto-Cleared'
                              ? 'bg-red-100 text-red-800'
                              : game.clearReason === 'Bumped'
                                ? 'bg-yellow-100 text-yellow-800'
                                : game.clearReason === 'Observed-Cleared'
                                  ? 'bg-orange-100 text-orange-800'
                                  : game.clearReason === 'Cleared'
                                    ? 'bg-green-100 text-green-800'
                                    : game.clearReason === 'Admin-Cleared'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {game.clearReason || 'Cleared'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default GameHistorySearch;
