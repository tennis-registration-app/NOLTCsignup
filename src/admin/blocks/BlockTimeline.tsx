/**
 * BlockTimeline Component
 *
 * Displays timeline of scheduled blocks with day/week view.
 * Fetches block data from API via TennisBackend.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { CalendarDays } from '../components';
import { useAdminConfirm } from '../context/ConfirmContext';
import { logger } from '../../lib/logger';
import {
  filterBlocksByDateAndCourt,
  groupBlocksByDate,
  sortGroupedBlocks,
  getBlockStatus,
  getDateLabel,
} from '../presenters/blockTimelinePresenter';
import BlockTimelineToolbar from './BlockTimelineToolbar';
import BlockTimelineCard, { TimelineBlock } from './BlockTimelineCard';

interface BlockTimelineBackend {
  admin: {
    getBlocks: (params: {fromDate: string; toDate: string}) => Promise<{
      ok: boolean;
      blocks: Array<{id: string; courtId?: string; courtNumber: number; startsAt: string; endsAt: string; blockType: string; title?: string; isRecurring?: boolean; recurrenceRule?: string; recurrenceGroupId?: string | null}>;
      message?: string;
    }>;
  };
}

interface BlockTimelineProps {
  courts?: object[];
  currentTime: Date;
  onEditBlock: (block: import('./BlockTimelineCard').TimelineBlock) => void;
  onRemoveBlock: (id: string) => void;
  onRemoveBlockGroup: (groupId: string, futureOnly: boolean) => void;
  onDuplicateBlock: (block: import('./BlockTimelineCard').TimelineBlock) => void;
  refreshTrigger?: number;
  backend: BlockTimelineBackend | null;
}

const BlockTimeline = ({
  courts: _courts,
  currentTime,
  onEditBlock,
  onRemoveBlock,
  onRemoveBlockGroup,
  onDuplicateBlock,
  refreshTrigger,
  backend,
}: BlockTimelineProps) => {
  const confirm = useAdminConfirm();
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCourt, setFilterCourt] = useState('all');

  // API-sourced block state
  const [blocks, setBlocks] = useState<TimelineBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            recurrenceGroupId: b.recurrenceGroupId || null,
            // Detect wet court blocks
            isWetCourt: b.blockType === 'wet' || b.title?.toLowerCase().includes('wet'),
          }));
          setBlocks(transformedBlocks);
        } else {
          logger.error('BlockTimeline', 'API error', result.message);
          setError(result.message || 'Failed to fetch blocks');
        }
      } catch (err) {
        logger.error('BlockTimeline', 'Fetch error', err);
        setError('Failed to fetch blocks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocks();
  }, [backend, viewMode, selectedDate, refreshTrigger]);

  const filteredBlocks = useMemo(
    () => filterBlocksByDateAndCourt({ blocks, viewMode, selectedDate, filterCourt }),
    [blocks, viewMode, selectedDate, filterCourt]
  );

  const groupedBlocks = groupBlocksByDate(filteredBlocks);
  const sortedGroups = sortGroupedBlocks(groupedBlocks);

  const navigateDate = (direction: number) => {
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
      <BlockTimelineToolbar
        viewMode={viewMode}
        selectedDate={selectedDate}
        filterCourt={filterCourt}
        onViewModeChange={setViewMode}
        onPrev={() => navigateDate(-1)}
        onNext={() => navigateDate(1)}
        onToday={() => setSelectedDate(new Date())}
        onFilterCourtChange={setFilterCourt}
      />

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
                    {group.date.toDateString() === new Date().toDateString() && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {
                          group.blocks.filter((b) => getBlockStatus(b, currentTime) === 'active')
                            .length
                        }{' '}
                        active
                      </span>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {group.blocks.map((block) => (
                  <BlockTimelineCard
                    key={block.id}
                    block={block}
                    status={getBlockStatus(block, currentTime)}
                    onEdit={onEditBlock}
                    onDuplicate={onDuplicateBlock}
                    onRemove={async (b) => {
                      if (b.recurrenceGroupId) {
                        // Series block: offer choices via sequential confirms
                        if (
                          await confirm(
                            `This block is part of a recurring series.\n\nDelete ALL blocks in this series?`
                          )
                        ) {
                          onRemoveBlockGroup(b.recurrenceGroupId, false);
                          return;
                        }
                        if (await confirm(`Delete only FUTURE blocks in this series?`)) {
                          onRemoveBlockGroup(b.recurrenceGroupId, true);
                          return;
                        }
                        if (
                          await confirm(`Delete just this single block on Court ${b.courtNumber}?`)
                        ) {
                          onRemoveBlock(b.id);
                        }
                      } else {
                        if (await confirm(`Remove block on Court ${b.courtNumber}?`)) {
                          onRemoveBlock(b.id);
                        }
                      }
                    }}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {filteredBlocks.filter((b) => getBlockStatus(b, currentTime) === 'future').length}
            </p>
            <p className="text-sm text-gray-600">Upcoming Blocks</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {filteredBlocks.filter((b) => getBlockStatus(b, currentTime) === 'active').length}
            </p>
            <p className="text-sm text-gray-600">Active Now</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">
              {filteredBlocks.filter((b) => getBlockStatus(b, currentTime) === 'past').length}
            </p>
            <p className="text-sm text-gray-600">Past Blocks</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockTimeline;
