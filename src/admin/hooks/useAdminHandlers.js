/**
 * useAdminHandlers
 *
 * Extracted from AdminPanelV2 in App.jsx — the 8 useCallback wrappers
 * around handler operation modules. Bodies are verbatim; dependency
 * arrays match the original closures.
 */
import { useCallback } from 'react';
import { removeFromWaitlistOp, moveInWaitlistOp } from '../handlers/waitlistOperations';
import { clearCourtOp, moveCourtOp, clearAllCourtsOp } from '../handlers/courtOperations';
import { applyBlocksOp } from '../handlers/applyBlocksOperation';

/**
 * @param {Object} deps
 * @param {Object} deps.backend - TennisBackend singleton
 * @param {Object} deps.dataStore - TennisCourtDataStore singleton
 * @param {Object} deps.TENNIS_CONFIG - Tennis configuration constants
 * @param {Array} deps.courts - Current court data
 * @param {Array} deps.waitingGroups - Current waitlist entries
 * @param {Function} deps.showNotification - Notification display function
 * @param {Function} deps.confirm - Confirmation dialog function
 * @param {Function} deps.setBlockToEdit - Setter for block being edited
 * @param {Function} deps.setActiveTab - Setter for active tab
 * @param {Function} deps.setBlockingView - Setter for blocking view mode
 * @param {Function} deps.reloadSettings - Reload admin settings
 * @param {Function} deps.bumpRefreshTrigger - Increment board refresh trigger
 */
export function useAdminHandlers({
  backend,
  dataStore,
  TENNIS_CONFIG,
  courts,
  waitingGroups,
  showNotification,
  confirm,
  setBlockToEdit,
  setActiveTab,
  setBlockingView,
  reloadSettings,
  bumpRefreshTrigger,
}) {
  const handleEditBlockFromStatus = useCallback(
    (block) => {
      setBlockToEdit(block);
      setActiveTab('blocking');
      setBlockingView('create');
    },
    [setBlockToEdit, setActiveTab, setBlockingView]
  );

  // Court operations - delegated to handler module (useCallback for identity stability)
  const clearCourt = useCallback(
    (courtNumber) =>
      clearCourtOp({ courts, backend, showNotification, TENNIS_CONFIG }, courtNumber),
    [courts, backend, showNotification, TENNIS_CONFIG]
  );

  const moveCourt = useCallback((from, to) => moveCourtOp({ backend }, from, to), [backend]);

  const clearAllCourts = useCallback(
    () =>
      clearAllCourtsOp({ courts, backend, dataStore, showNotification, confirm, TENNIS_CONFIG }),
    [courts, backend, dataStore, showNotification, confirm, TENNIS_CONFIG]
  );

  // Waitlist operations - delegated to handler module (useCallback for identity stability)
  const removeFromWaitlist = useCallback(
    (index) =>
      removeFromWaitlistOp({ waitingGroups, backend, showNotification, TENNIS_CONFIG }, index),
    [waitingGroups, backend, showNotification, TENNIS_CONFIG]
  );

  const moveInWaitlist = useCallback(
    (from, to) => moveInWaitlistOp({ waitingGroups, backend, showNotification }, from, to),
    [waitingGroups, backend, showNotification]
  );

  // Block apply closure (captures React state for handler module)
  const applyBlocks = useCallback(
    (blocks) => applyBlocksOp({ courts, backend, showNotification, TENNIS_CONFIG }, blocks),
    [courts, backend, showNotification, TENNIS_CONFIG]
  );

  // Refresh data closure (settings + board refresh combined)
  const refreshData = useCallback(() => {
    reloadSettings();
    bumpRefreshTrigger();
  }, [reloadSettings, bumpRefreshTrigger]);

  return {
    handleEditBlockFromStatus,
    clearCourt,
    moveCourt,
    clearAllCourts,
    removeFromWaitlist,
    moveInWaitlist,
    applyBlocks,
    refreshData,
  };
}
