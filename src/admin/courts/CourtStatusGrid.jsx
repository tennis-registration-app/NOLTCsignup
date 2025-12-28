/**
 * CourtStatusGrid Component
 *
 * Displays a grid of all courts with their current status.
 * Handles wet courts, blocks, games, and player movements.
 */
import React, { useState, useEffect } from 'react';
import { Edit2, X, RefreshCw, Droplets } from '../components';
import { EditGameModal } from '../components';
import { EditBlockModal } from '../blocks';

// Get dependencies from window
const TENNIS_CONFIG = window.APP_UTILS?.TENNIS_CONFIG || {
  STORAGE: { UPDATE_EVENT: 'tennisDataUpdate' },
};

// Get dataStore reference
const getDataStore = () => window.Tennis?.DataStore || window.DataStore;

// Timer registry for cleanup
const _timers = [];
const addTimer = (id) => {
  _timers.push(id);
  return id;
};

const CourtStatusGrid = ({
  courts,
  courtBlocks,
  selectedDate,
  onClearCourt,
  onMoveCourt,
  currentTime,
  onEditBlock,
  onEditGame,
  onEmergencyWetCourt,
  onClearAllCourts,
  wetCourtsActive,
  handleEmergencyWetCourt,
  deactivateWetCourts,
  wetCourts,
  onClearWetCourt,
  onClearAllWetCourts,
}) => {
  const [movingFrom, setMovingFrom] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [showActions, setShowActions] = useState(null);
  const [editingGame, setEditingGame] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [localWetCourts, setLocalWetCourts] = useState(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const dataStore = getDataStore();

  React.useEffect(() => {
    const onUpdate = () => setRefreshTick((t) => t + 1);
    // Listen on both document and window for compatibility
    document.addEventListener('DATA_UPDATED', onUpdate);
    document.addEventListener('tennisDataUpdate', onUpdate);
    window.addEventListener('DATA_UPDATED', onUpdate);
    window.addEventListener('tennisDataUpdate', onUpdate);
    return () => {
      document.removeEventListener('DATA_UPDATED', onUpdate);
      document.removeEventListener('tennisDataUpdate', onUpdate);
      window.removeEventListener('DATA_UPDATED', onUpdate);
      window.removeEventListener('tennisDataUpdate', onUpdate);
    };
  }, []);

  // Load wet court status on mount and poll for updates
  useEffect(() => {
    const checkWetCourts = async () => {
      const blocks = (await dataStore?.get('courtBlocks')) || [];
      const wetCourtNumbers = new Set(
        blocks
          .filter((block) => block.isWetCourt && new Date(block.endTime) > currentTime)
          .map((block) => block.courtNumber)
      );
      setLocalWetCourts(wetCourtNumbers);
    };

    // Only use local polling if wetCourts prop is not provided
    if (!wetCourts && dataStore) {
      checkWetCourts();
      const interval = addTimer(setInterval(checkWetCourts, 1000));
      return () => {
        try {
          clearInterval(interval);
        } catch {}
      };
    }
  }, [currentTime, refreshKey, wetCourts, dataStore]);

  const getCourtStatus = (court, courtNumber) => {
    // Use prop wetCourts if available, otherwise use local state
    const activeWetCourts = wetCourts || localWetCourts;

    // Check if court is wet first
    if (activeWetCourts.has(courtNumber)) {
      return {
        status: 'wet',
        info: {
          reason: 'WET COURT',
          type: 'wet',
        },
      };
    }

    // Then check for blocks on the selected date
    const activeBlock = courtBlocks.find((block) => {
      if (block.courtNumber !== courtNumber || block.isWetCourt) return false;
      const blockStart = new Date(block.startTime);
      const blockEnd = new Date(block.endTime);

      // Filter by selected date - show blocks that occur on the selected date
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);

      // Check if block overlaps with selected date
      const blockOverlapsSelectedDate =
        blockStart < selectedDateEnd && blockEnd > selectedDateStart;
      if (!blockOverlapsSelectedDate) return false;

      // For today, show only currently active blocks
      // For other dates, show all blocks for that date
      if (selectedDate.toDateString() === new Date().toDateString()) {
        return currentTime >= blockStart && currentTime < blockEnd;
      } else {
        return true; // Show all blocks for non-today dates
      }
    });

    if (activeBlock) {
      return {
        status: 'blocked',
        info: {
          id: activeBlock.id,
          reason: activeBlock.reason,
          startTime: activeBlock.startTime,
          endTime: activeBlock.endTime,
          type: 'block',
          courtNumber: courtNumber,
        },
      };
    }

    // Check if court has players
    if (court && court.players && court.players.length > 0) {
      const endTime = new Date(court.endTime);
      const isOvertime = currentTime > endTime;

      return {
        status: isOvertime ? 'overtime' : 'occupied',
        info: {
          players: court.players,
          startTime: court.startTime,
          endTime: court.endTime,
          duration: court.duration,
          type: 'game',
          courtNumber: courtNumber,
        },
      };
    }

    // Check for current session (Domain format: court.session.group.players)
    const sessionPlayers = court?.session?.group?.players;
    if (sessionPlayers && sessionPlayers.length > 0) {
      const endTime = new Date(court.session.scheduledEndAt);
      const isOvertime = currentTime > endTime;

      return {
        status: isOvertime ? 'overtime' : 'occupied',
        info: {
          players: sessionPlayers,
          startTime: court.session.startedAt,
          endTime: court.session.scheduledEndAt,
          duration: court.session.duration,
          type: 'game',
          courtNumber: courtNumber,
        },
      };
    }

    return { status: 'available', info: null };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 border-green-300';
      case 'occupied':
        return 'bg-blue-100 border-blue-300';
      case 'overtime':
        return 'bg-gray-100 border-gray-300';
      case 'blocked':
        return 'bg-amber-50 border-amber-300';
      case 'wet':
        return 'bg-gray-200 border-gray-400';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const handleWetCourtToggle = async (courtNum) => {
    // If parent provided a callback, use it
    if (onClearWetCourt) {
      onClearWetCourt(courtNum);
      return;
    }

    // Otherwise use local handling
    if (!dataStore) return;

    try {
      const blocks = (await dataStore.get('courtBlocks')) || [];
      const activeWetCourts = wetCourts || localWetCourts;

      if (activeWetCourts.has(courtNum)) {
        // Remove wet court block
        const updatedBlocks = blocks.filter(
          (block) => !(block.isWetCourt && block.courtNumber === courtNum)
        );
        await dataStore.set('courtBlocks', updatedBlocks, { immediate: true });
        window.dispatchEvent(new Event(TENNIS_CONFIG.STORAGE.UPDATE_EVENT));
      } else {
        // Add wet court block
        const wetBlock = {
          id: `wet-court-${courtNum}-${Date.now()}`,
          courtNumber: courtNum,
          reason: 'WET COURT',
          startTime: new Date().toISOString(),
          endTime: new Date(new Date().setHours(22, 0, 0, 0)).toISOString(),
          isEvent: false,
          isWetCourt: true,
          createdAt: new Date().toISOString(),
        };
        blocks.push(wetBlock);
        await dataStore.set('courtBlocks', blocks, { immediate: true });
      }

      window.dispatchEvent(new Event(TENNIS_CONFIG.STORAGE.UPDATE_EVENT));
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error toggling wet court:', error);
    }
  };

  const formatTimeRemaining = (endTime) => {
    const end = new Date(endTime);
    const diff = end - currentTime;
    const minutes = Math.floor(diff / 60000);

    if (minutes < -60) return `${Math.abs(Math.floor(minutes / 60))}h over`;
    if (minutes < 0) return `${Math.abs(minutes)}m over`;
    if (minutes < 60) return `${minutes}m left`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
  };

  const getPlayerNames = (players) => {
    if (!players || players.length === 0) return 'No players';
    return players
      .map((p) => {
        const name = p.name || p.playerName || 'Unknown';
        return name.split(' ').pop();
      })
      .join(' & ');
  };

  const handleClearCourt = async (courtNum) => {
    if (!dataStore) return;

    // Only clear ACTIVE blocks, preserve historical ones
    const currentTimeNow = new Date();
    const existingBlocks = (await dataStore.get('courtBlocks')) || [];

    const updatedBlocks = existingBlocks.map((block) => {
      if (block.courtNumber === courtNum) {
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);

        // Only end blocks that are currently active
        if (blockStart <= currentTimeNow && blockEnd > currentTimeNow) {
          return {
            ...block,
            endTime: currentTimeNow.toISOString(),
            actualEndTime: currentTimeNow.toISOString(),
            endReason: 'admin_cleared',
          };
        }
      }
      return block;
    });

    await dataStore.set('courtBlocks', updatedBlocks, { immediate: true });

    // Invalidate cache to ensure fresh data on next read
    if (dataStore.cache) {
      dataStore.cache.delete('courtBlocks');
    }

    // Dispatch events on both window and document for compatibility
    window.dispatchEvent(new Event(TENNIS_CONFIG.STORAGE.UPDATE_EVENT));
    window.dispatchEvent(new Event('DATA_UPDATED'));
    document.dispatchEvent(new Event('tennisDataUpdate'));

    // Force local refresh
    setRefreshTick((t) => t + 1);
    setRefreshKey((k) => k + 1);

    // Call parent's clear handler which triggers loadData
    onClearCourt(courtNum);
    setShowActions(null);
  };

  const handleEditClick = (courtNum, info) => {
    if (info.type === 'block') {
      const block = courtBlocks.find((b) => b.id === info.id);
      if (block) {
        setEditingBlock({ ...block, courtNumber: courtNum });
      }
    } else if (info.type === 'game') {
      setEditingGame({ ...info, courtNumber: courtNum });
    }
    setShowActions(null);
  };

  const handleSaveBlock = async (updatedBlock) => {
    if (!dataStore) return;

    try {
      const blocks = (await dataStore.get('courtBlocks')) || [];
      const updatedBlocks = blocks.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block
      );
      await dataStore.set('courtBlocks', updatedBlocks);
      setEditingBlock(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving block:', error);
    }
  };

  const handleMoveCourt = async (from, to) => {
    try {
      const res = await onMoveCourt(from, to);
      if (res?.success) {
        setMovingFrom(null);
      }
    } catch (e) {
      window.Tennis?.UI?.toast?.('Unexpected error moving court', { type: 'error' });
    }
  };

  const initiateMove = (courtNum) => {
    setMovingFrom(courtNum);
    setShowActions(null);
  };

  const handleSaveGame = async (updatedGame) => {
    try {
      const S = window.Tennis?.Storage;
      const data = S?.readDataClone ? S.readDataClone() : structuredClone(S.readDataSafe());

      const courtIndex = updatedGame.courtNumber - 1;
      // Update session using Domain format
      if (data.courts && data.courts[courtIndex] && data.courts[courtIndex].session) {
        data.courts[courtIndex].session = {
          ...data.courts[courtIndex].session,
          group: { players: updatedGame.players },
          startedAt: updatedGame.startTime,
          scheduledEndAt: updatedGame.endTime,
          duration: updatedGame.duration,
        };

        const DS = window.Tennis?.DataStore || window.DataStore;
        if (DS?.set) {
          await DS.set(S.STORAGE.DATA, data);
          window.Tennis?.UI?.toast?.('Game updated successfully', { type: 'success' });
        } else {
          S.writeJSON(S.STORAGE.DATA, data);
          window.dispatchEvent(new Event('DATA_UPDATED'));
          window.dispatchEvent(new Event('tennisDataUpdate'));
        }
      }

      setEditingGame(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving game:', error);
      window.Tennis?.UI?.toast?.('Failed to save game', { type: 'error' });
    }
  };

  const handleAllCourtsDry = async () => {
    if (onClearAllWetCourts) {
      onClearAllWetCourts();
      return;
    }

    if (!dataStore) return;

    try {
      const existingBlocks = (await dataStore.get('courtBlocks')) || [];
      const updatedBlocks = existingBlocks.filter((block) => !block.isWetCourt);
      await dataStore.set('courtBlocks', updatedBlocks, { immediate: true });
      window.dispatchEvent(new Event(TENNIS_CONFIG.STORAGE.UPDATE_EVENT));
      console.log('✅ All courts marked as dry');
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error removing all wet court blocks:', error);
    }
  };

  // Get data for grid rendering - use courts prop from TennisBackend API
  // Create a lookup map by court number for efficient access
  const courtsByNumber = {};
  (courts || []).forEach((c) => {
    courtsByNumber[c.number] = c;
  });

  const now = new Date();
  const blocks = courtBlocks || [];
  const wetSet = new Set(
    (blocks || [])
      .filter(
        (b) =>
          b?.isWetCourt &&
          new Date(b.startTime ?? b.start) <= now &&
          now < new Date(b.endTime ?? b.end)
      )
      .map((b) => b.courtNumber)
  );

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Court Status</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onClearAllCourts}
              className="px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-xs font-medium"
            >
              Clear All Courts
            </button>
            <div className="text-sm text-gray-500">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }, (_, index) => {
            const courtNum = index + 1;
            const court = courtsByNumber[courtNum] || null;
            const { status, info } = getCourtStatus(court, courtNum);
            const isMoving = movingFrom === courtNum;
            const canReceiveMove = movingFrom && movingFrom !== courtNum && status === 'available';

            return (
              <div
                key={courtNum}
                className={`p-3 rounded-lg border-2 ${getStatusColor(status)} ${
                  isMoving ? 'ring-2 ring-blue-500' : ''
                } ${canReceiveMove ? 'cursor-pointer hover:bg-green-200' : ''}
                ${status === 'wet' ? 'cursor-pointer hover:bg-gray-300' : ''}
                min-h-[120px] h-[120px] flex flex-col justify-between relative`}
                onClick={
                  canReceiveMove
                    ? () => {
                        handleMoveCourt(Number(movingFrom), Number(courtNum));
                      }
                    : status === 'wet'
                      ? () => {
                          handleWetCourtToggle(courtNum);
                        }
                      : undefined
                }
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg">Court {courtNum}</h4>
                    {status !== 'available' && status !== 'wet' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActions(showActions === courtNum ? null : courtNum);
                          setMovingFrom(null);
                        }}
                        className="p-1 hover:bg-white/50 rounded"
                      >
                        <span style={{ fontSize: '18px' }}>☰</span>
                      </button>
                    )}
                  </div>

                  {(status === 'occupied' || status === 'overtime') && info && (
                    <div
                      className={`text-xs font-medium ${
                        status === 'overtime' ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {formatTimeRemaining(info.endTime)}
                    </div>
                  )}

                  {info && (
                    <div className="mt-1">
                      {status === 'wet' && (
                        <>
                          <p className="font-medium text-sm">💧 WET COURT</p>
                          <p className="text-xs text-gray-600">Click to mark dry</p>
                        </>
                      )}
                      {status === 'blocked' && (
                        <>
                          <p className="font-medium text-sm truncate">{info.reason}</p>
                          <p className="text-xs text-gray-600">
                            Until{' '}
                            {new Date(info.endTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      )}
                      {(status === 'occupied' || status === 'overtime') && (
                        <>
                          <p className="font-medium text-sm truncate">
                            {getPlayerNames(info.players)}
                          </p>
                          <p className="text-xs text-gray-600">
                            Since{' '}
                            {new Date(info.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {canReceiveMove && (
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium text-green-700">Click to move here</p>
                    </div>
                  )}
                </div>

                {showActions === courtNum && status !== 'available' && status !== 'wet' && (
                  <div className="absolute top-12 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {status !== 'blocked' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateMove(courtNum);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <RefreshCw size={14} />
                          Move Players
                        </div>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(courtNum, info);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Edit2 size={14} />
                        Edit {info.type === 'block' ? 'Block' : 'Game'}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearCourt(courtNum);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                    >
                      <div className="flex items-center gap-2">
                        <X size={14} />
                        Clear Court
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={wetCourtsActive ? deactivateWetCourts : handleEmergencyWetCourt}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${
              wetCourtsActive
                ? 'bg-gray-600 text-white border-blue-400 ring-1 ring-blue-400 shadow-md'
                : 'bg-blue-50 hover:bg-blue-100 text-gray-700 border-blue-300 hover:border-blue-400'
            }`}
          >
            <Droplets size={20} />
            WET COURTS
            {wetCourts && wetCourts.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {wetCourts.size}
              </span>
            )}
          </button>

          {wetCourts && wetCourts.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                💧 Click wet courts as they dry to resume normal operations
              </span>
              <button
                onClick={handleAllCourtsDry}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
              >
                All Courts Dry
              </button>
            </div>
          )}
        </div>
      </div>

      {editingGame && (
        <EditGameModal
          game={editingGame}
          onSave={handleSaveGame}
          onClose={() => setEditingGame(null)}
        />
      )}

      {editingBlock && (
        <EditBlockModal
          block={editingBlock}
          onSave={handleSaveBlock}
          onClose={() => setEditingBlock(null)}
          onEditInBlockManager={() => {
            if (onEditBlock) {
              onEditBlock(editingBlock);
            }
            setEditingBlock(null);
          }}
        />
      )}
    </>
  );
};

export default CourtStatusGrid;
