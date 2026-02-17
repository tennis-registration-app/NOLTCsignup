/**
 * BlockTimeline Component
 *
 * Displays timeline of scheduled blocks with day/week view.
 * Fetches block data from API via TennisBackend.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Edit2, Copy, Trash2 } from '../components';
import { useAdminConfirm } from '../context/ConfirmContext.jsx';

const BlockTimeline = ({
  courts: _courts,
  currentTime,
  onEditBlock,
  onRemoveBlock,
  onDuplicateBlock,
  refreshTrigger,
  backend,
}) => {
  const confirm = useAdminConfirm();
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCourt, setFilterCourt] = useState('all');

  // API-sourced block state
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch blocks from API when date range or view changes
  useEffect(() => {
    const fetchBlocks = async () => {
      if (!backend) {
        console.warn('[BlockTimeline] No backend provided, cannot fetch blocks');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Calculate date range based on viewMode
        // For day view: fetch current day + buffer for navigation
        // For week view: fetch current week + buffer
        // We fetch a broader range to allow smooth navigation without re-fetching
        let fromDate, toDate;

        if (viewMode === 'day') {
          // Fetch 7 days before and 30 days after selected date
          fromDate = new Date(selectedDate);
          fromDate.setDate(fromDate.getDate() - 7);
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date(selectedDate);
          toDate.setDate(toDate.getDate() + 30);
          toDate.setHours(23, 59, 59, 999);
        } else {
          // Week view: fetch 2 weeks before and 8 weeks after
          fromDate = new Date(selectedDate);
          fromDate.setDate(fromDate.getDate() - 14);
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date(selectedDate);
          toDate.setDate(toDate.getDate() + 56);
          toDate.setHours(23, 59, 59, 999);
        }

        const result = await backend.admin.getBlocks({
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
        });

        if (result.ok) {
          // Transform API response to component's expected shape
          const transformedBlocks = result.blocks.map((b) => ({
            id: b.id,
            courtId: b.courtId,
            courtNumber: b.courtNumber,
            startTime: b.startsAt,
            endTime: b.endsAt,
            reason: b.blockType,
            title: b.title,
            isRecurring: b.isRecurring,
            recurrenceRule: b.recurrenceRule,
            // Detect wet court blocks
            isWetCourt: b.blockType === 'wet' || b.title?.toLowerCase().includes('wet'),
          }));
          setBlocks(transformedBlocks);
        } else {
          console.error('[BlockTimeline] API error:', result.message);
          setError(result.message || 'Failed to fetch blocks');
        }
      } catch (err) {
        console.log('[BlockTimeline] Fetch error:', err);
        setError('Failed to fetch blocks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocks();
  }, [backend, viewMode, selectedDate, refreshTrigger]);

  const filteredBlocks = useMemo(() => {
    let filtered = [...blocks];

    // Filter by date range based on view mode
    // Show blocks that overlap with the selected date range (past, present, or future)
    filtered = filtered.filter((block) => {
      const blockStart = new Date(block.startTime);
      const blockEnd = new Date(block.endTime);

      if (viewMode === 'day') {
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Block overlaps with day if:
        // - starts during the day, OR
        // - ends during the day, OR
        // - spans the entire day
        return (
          (blockStart >= dayStart && blockStart <= dayEnd) ||
          (blockEnd >= dayStart && blockEnd <= dayEnd) ||
          (blockStart <= dayStart && blockEnd >= dayEnd)
        );
      } else {
        // Week view
        const weekStart = new Date(selectedDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Block overlaps with week if:
        // - starts during the week, OR
        // - ends during the week, OR
        // - spans the entire week
        return (
          (blockStart >= weekStart && blockStart <= weekEnd) ||
          (blockEnd >= weekStart && blockEnd <= weekEnd) ||
          (blockStart <= weekStart && blockEnd >= weekEnd)
        );
      }
    });

    // Filter by court if specific court selected
    if (filterCourt !== 'all') {
      filtered = filtered.filter((block) => block.courtNumber === parseInt(filterCourt));
    }

    // Sort by start time
    filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return filtered;
  }, [blocks, viewMode, selectedDate, filterCourt]);

  const getBlockStatus = (block) => {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);

    if (currentTime >= start && currentTime < end) return 'active';
    if (currentTime >= end) return 'past';
    return 'future';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'past':
        return 'bg-gray-50 border-gray-300 text-gray-600';
      case 'future':
        return 'bg-blue-50 border-blue-300 text-blue-900';
      default:
        return '';
    }
  };

  const groupedBlocks = filteredBlocks.reduce((groups, block) => {
    const blockDate = new Date(block.startTime);
    const dateKey = blockDate.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: blockDate,
        blocks: [],
      };
    }

    groups[dateKey].blocks.push(block);
    return groups;
  }, {});

  const sortedGroups = Object.values(groupedBlocks).sort((a, b) => a.date - b.date);

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isTomorrow = (date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';

    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const navigateDate = (direction) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);

      if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + direction * 7);
      } else {
        newDate.setDate(newDate.getDate() + direction);
      }

      return newDate;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded ${viewMode === 'day' ? 'bg-white shadow-sm' : ''}`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded ${viewMode === 'week' ? 'bg-white shadow-sm' : ''}`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Today
            </button>
            <button onClick={() => navigateDate(1)} className="p-1 hover:bg-gray-100 rounded">
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
            onChange={(e) => setFilterCourt(e.target.value)}
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

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
          <p>Loading blocks...</p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg">
          <p className="font-medium">Error loading blocks</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Block list */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {sortedGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No blocks scheduled for this {viewMode}
            </div>
          ) : (
            sortedGroups.map((group) => (
              <div key={group.date.toDateString()} className="space-y-2">
                <div className="flex items-center gap-3 sticky top-0 bg-gray-50 py-2 z-10">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-700">{getDateLabel(group.date)}</h3>
                    {isToday(group.date) && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {group.blocks.filter((b) => getBlockStatus(b) === 'active').length} active
                      </span>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {group.blocks.map((block) => {
                  const status = getBlockStatus(block);
                  const isEditable = status !== 'past';

                  return (
                    <div
                      key={block.id}
                      className={`p-4 rounded-lg border-2 ${getStatusColor(status)} transition-all`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-lg">Court {block.courtNumber}</span>
                            <span className="px-2 py-1 bg-white/70 rounded text-sm font-medium">
                              {block.title || block.reason}
                            </span>
                            {status === 'active' && (
                              <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium animate-pulse">
                                ACTIVE NOW
                              </span>
                            )}
                            {block.isRecurring && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                Recurring
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock size={14} />
                            <span>
                              {new Date(block.startTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {' - '}
                              {new Date(block.endTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditable && (
                            <>
                              <button
                                onClick={() => onEditBlock(block)}
                                className="p-2 hover:bg-white/50 rounded transition-colors"
                                title="Edit block"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => onDuplicateBlock(block)}
                                className="p-2 hover:bg-white/50 rounded transition-colors"
                                title="Duplicate block"
                              >
                                <Copy size={16} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={async () => {
                              if (await confirm(`Remove block on Court ${block.courtNumber}?`)) {
                                onRemoveBlock(block.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove block"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {filteredBlocks.filter((b) => getBlockStatus(b) === 'future').length}
            </p>
            <p className="text-sm text-gray-600">Upcoming Blocks</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {filteredBlocks.filter((b) => getBlockStatus(b) === 'active').length}
            </p>
            <p className="text-sm text-gray-600">Active Now</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">
              {filteredBlocks.filter((b) => getBlockStatus(b) === 'past').length}
            </p>
            <p className="text-sm text-gray-600">Past Blocks</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockTimeline;
