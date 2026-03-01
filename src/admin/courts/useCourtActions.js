/**
 * Hook encapsulating all CourtStatusGrid actions:
 * dataStore reads/writes, event dispatching, backend calls,
 * and the local UI state that only those actions touch.
 */
import { useState, useEffect } from 'react';
import { logger } from '../../lib/logger.js';
import { toast } from '../../shared/utils/toast.js';
import { getDataStore as _getDataStore } from '../../lib/TennisCourtDataStore.js';
import { getDeviceId } from '../utils/getDeviceId.js';
import { TENNIS_CONFIG } from '../../lib/config.js';
import { useOptimisticWetToggle } from './useOptimisticWetToggle.js';

// Get dataStore reference
const getDataStore = () => _getDataStore();

/** Fire all data-changed events so every listener refreshes. */
function notifyDataChanged() {
  window.dispatchEvent(new Event(TENNIS_CONFIG.STORAGE.UPDATE_EVENT));
  window.dispatchEvent(new Event('DATA_UPDATED'));
  window.dispatchEvent(new Event('tennisDataUpdate'));
  document.dispatchEvent(new Event('tennisDataUpdate'));
}

/**
 * @param {Object} params
 * @param {Object} params.statusActions - { clearCourt, moveCourt }
 * @param {Object} params.wetCourtsActions - { clearCourt, clearAllCourts }
 * @param {Object} params.services - { backend }
 * @param {Array} params.courts - court objects from statusModel
 * @param {Array} params.courtBlocks - block objects from statusModel
 * @param {Set} params.wetCourts - wet court numbers from wetCourtsModel
 */
export function useCourtActions({
  statusActions,
  wetCourtsActions,
  services,
  courts,
  courtBlocks,
  wetCourts,
}) {
  const { clearCourt: onClearCourt, moveCourt: onMoveCourt } = statusActions;
  const {
    activateEmergency: onActivateWet,
    deactivateAll: onDeactivateWet,
    clearCourt: onClearWetCourt,
    clearAllCourts: onClearAllWetCourts,
  } = wetCourtsActions;
  const { backend } = services;

  const [movingFrom, setMovingFrom] = useState(null);
  const [moveInFlight, setMoveInFlight] = useState(false); // prevents double-click during move API call
  const [clearInFlight, setClearInFlight] = useState(false); // prevents double-click during clear API call
  const [optimisticCourts, setOptimisticCourts] = useState(null); // local override while operation is in-flight
  const [showActions, setShowActions] = useState(null);
  const [editingGame, setEditingGame] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [, setRefreshTick] = useState(0); // Getter unused, setter used
  const [savingGame, setSavingGame] = useState(false);

  // Shared optimistic wet toggle — single implementation used by both
  // CourtStatusGrid (here) and CompleteBlockManagerEnhanced
  const {
    optimisticWetCourts,
    wetToggleInFlight,
    handleWetCourtToggle,
    setAllDryOptimistic,
    setAllWetOptimistic,
    rollbackOptimistic: rollbackWetOptimistic,
    setBulkInFlight: setWetBulkInFlight,
  } = useOptimisticWetToggle({ wetCourts, clearCourt: onClearWetCourt });

  const dataStore = getDataStore();

  useEffect(() => {
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

  const handleClearCourt = async (courtNum) => {
    if (clearInFlight) return; // prevent double-click
    if (!dataStore) return;

    // Only clear ACTIVE blocks, preserve historical ones
    const currentTimeNow = new Date();
    const existingBlocks = [...(courtBlocks || [])];

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
            endReason: 'admin_override', // API enum value (snake_case is database convention)
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

    notifyDataChanged();

    // Force local refresh
    setRefreshTick((t) => t + 1);

    // Build optimistic empty court: strip session/block from target
    const SESSION_KEYS = [
      'session',
      'players',
      'startTime',
      'endTime',
      'duration',
      'sessionId',
      'block',
    ];
    const sourceCourts = courts || [];
    const updated = sourceCourts.map((c) => {
      if (c.number === courtNum) {
        const rest = {};
        for (const key of Object.keys(c)) {
          if (!SESSION_KEYS.includes(key)) rest[key] = c[key];
        }
        return rest;
      }
      return c;
    });
    setOptimisticCourts(updated);

    // Clear UI state immediately — court already looks empty
    setShowActions(null);
    setClearInFlight(true);

    try {
      const res = await onClearCourt(courtNum);
      if (!res?.success) {
        // Rollback: discard optimistic state so real data shows
        setOptimisticCourts(null);
        toast(res?.error || 'Clear failed', { type: 'error' });
      }
    } catch {
      setOptimisticCourts(null);
      toast('Unexpected error clearing court', { type: 'error' });
    } finally {
      setClearInFlight(false);
      // Clear optimistic override — next poll/refresh will have the real data
      setOptimisticCourts(null);
    }
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

  const handleMoveCourt = async (from, to) => {
    if (moveInFlight || clearInFlight) return; // prevent double-click or concurrent operations

    // Build optimistic courts: swap session from source → target
    const sourceCourts = courts || [];
    const fromCourt = sourceCourts.find((c) => c.number === Number(from));
    const toCourt = sourceCourts.find((c) => c.number === Number(to));

    if (fromCourt && toCourt) {
      const SESSION_KEYS = ['session', 'players', 'startTime', 'endTime', 'duration', 'sessionId'];
      const updated = sourceCourts.map((c) => {
        if (c.number === Number(from)) {
          // Source becomes empty: strip session/players
          const rest = {};
          for (const key of Object.keys(c)) {
            if (!SESSION_KEYS.includes(key)) rest[key] = c[key];
          }
          return rest;
        }
        if (c.number === Number(to)) {
          // Target gets source's session data
          return {
            ...c,
            session: fromCourt.session,
            players: fromCourt.players,
            startTime: fromCourt.startTime,
            endTime: fromCourt.endTime,
            duration: fromCourt.duration,
            sessionId: fromCourt.sessionId,
          };
        }
        return c;
      });
      setOptimisticCourts(updated);
    }

    // Clear move mode immediately — UI already shows the result
    setMovingFrom(null);
    setMoveInFlight(true);

    try {
      const res = await onMoveCourt(from, to);
      if (!res?.success) {
        // Rollback: discard optimistic state so real data shows
        setOptimisticCourts(null);
        toast(res?.error || 'Move failed', { type: 'error' });
      }
    } catch {
      setOptimisticCourts(null);
      toast('Unexpected error moving court', { type: 'error' });
    } finally {
      setMoveInFlight(false);
      // Clear optimistic override — next poll/refresh will have the real data
      setOptimisticCourts(null);
    }
  };

  const initiateMove = (courtNum) => {
    setMovingFrom(courtNum);
    setShowActions(null);
  };

  const handleSaveGame = async (updatedGame) => {
    if (!backend?.admin?.updateSession) {
      logger.error('CourtStatusGrid', 'Backend updateSession not available');
      toast('Backend not available', { type: 'error' });
      return;
    }

    setSavingGame(true);
    try {
      const deviceId = getDeviceId();

      const result = await backend.admin.updateSession({
        sessionId: updatedGame.sessionId,
        participants: updatedGame.participants,
        scheduledEndAt: updatedGame.scheduledEndAt,
        deviceId,
      });

      if (result.ok) {
        toast('Game updated successfully', { type: 'success' });
        setEditingGame(null);
        notifyDataChanged();
      } else {
        throw new Error(result.message || 'Failed to update game');
      }
    } catch (error) {
      logger.error('CourtStatusGrid', 'Error saving game', error);
      toast(error.message || 'Failed to save game', { type: 'error' });
    } finally {
      setSavingGame(false);
    }
  };

  const handleActivateWet = async () => {
    if (wetToggleInFlight) return; // prevent double-click
    if (!onActivateWet) return;

    setAllWetOptimistic();
    setWetBulkInFlight(true);

    try {
      const res = await onActivateWet();
      if (!res?.success) {
        rollbackWetOptimistic();
        toast(res?.error || 'Failed to activate wet courts', { type: 'error' });
      }
    } catch {
      rollbackWetOptimistic();
      toast('Unexpected error activating wet courts', { type: 'error' });
    } finally {
      setWetBulkInFlight(false);
    }
  };

  const handleDeactivateWet = async () => {
    if (wetToggleInFlight) return; // prevent double-click
    if (!onDeactivateWet) return;

    setAllDryOptimistic();
    setWetBulkInFlight(true);

    try {
      const res = await onDeactivateWet();
      if (!res?.success) {
        rollbackWetOptimistic();
        toast(res?.error || 'Failed to deactivate wet courts', { type: 'error' });
      }
    } catch {
      rollbackWetOptimistic();
      toast('Unexpected error deactivating wet courts', { type: 'error' });
    } finally {
      setWetBulkInFlight(false);
    }
  };

  const handleAllCourtsDry = async () => {
    if (wetToggleInFlight) return; // prevent double-click

    if (onClearAllWetCourts) {
      setAllDryOptimistic();
      setWetBulkInFlight(true);

      try {
        const res = await onClearAllWetCourts();
        if (!res?.success) {
          rollbackWetOptimistic();
          toast(res?.error || 'Failed to clear wet courts', { type: 'error' });
        }
      } catch {
        rollbackWetOptimistic();
        toast('Unexpected error clearing wet courts', { type: 'error' });
      } finally {
        setWetBulkInFlight(false);
      }
      return;
    }

    if (!dataStore) return;

    try {
      const existingBlocks = [...(courtBlocks || [])];
      const updatedBlocks = existingBlocks.filter((block) => !block.isWetCourt);
      await dataStore.set('courtBlocks', updatedBlocks, { immediate: true });
      notifyDataChanged();
      logger.debug('CourtStatusGrid', 'All courts marked as dry');
    } catch (error) {
      logger.error('CourtStatusGrid', 'Error removing all wet court blocks', error);
    }
  };

  const cancelMove = () => {
    setMovingFrom(null);
  };

  const toggleActions = (courtNum) => {
    setShowActions(showActions === courtNum ? null : courtNum);
    cancelMove();
  };

  const closeEditingGame = () => setEditingGame(null);

  const closeEditingBlock = () => setEditingBlock(null);

  const handleBlockSaved = () => {
    setEditingBlock(null);
  };

  return {
    // State
    movingFrom,
    clearInFlight,
    wetToggleInFlight,
    optimisticCourts,
    optimisticWetCourts,
    showActions,
    editingGame,
    editingBlock,
    savingGame,
    // Handlers
    handleActivateWet,
    handleDeactivateWet,
    handleWetCourtToggle,
    handleClearCourt,
    handleSaveGame,
    handleAllCourtsDry,
    handleEditClick,
    handleMoveCourt,
    initiateMove,
    cancelMove,
    toggleActions,
    closeEditingGame,
    closeEditingBlock,
    handleBlockSaved,
  };
}
