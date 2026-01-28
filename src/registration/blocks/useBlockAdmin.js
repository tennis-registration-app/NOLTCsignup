/**
 * useBlockAdmin Hook
 * Orchestrates block admin state + existing ops from adminOperations.js
 *
 * Exposes setter-style functions to match AdminScreen prop interface.
 *
 * IMPORTANT: No refresh calls - legacy doesn't have them.
 * IMPORTANT: blockingInProgress is set true and never reset (legacy behavior).
 */

import { useReducer, useCallback } from 'react';
import { blockAdminReducer, initialBlockAdminState } from './blockAdminReducer.js';
import { handleBlockCreateOp, handleCancelBlockOp } from '../handlers/adminOperations.js';

export function useBlockAdmin({ backend, showAlertMessage, getCourtData }) {
  const [state, dispatch] = useReducer(blockAdminReducer, initialBlockAdminState);

  // Setter-style functions (match AdminScreen props)
  const setShowBlockModal = useCallback((value) => {
    dispatch({ type: value ? 'BLOCK_MODAL_OPENED' : 'BLOCK_MODAL_CLOSED' });
  }, []);

  const setSelectedCourtsToBlock = useCallback((courts) => {
    dispatch({ type: 'BLOCK_COURTS_SELECTED', courts });
  }, []);

  const setBlockMessage = useCallback((message) => {
    dispatch({ type: 'BLOCK_MESSAGE_SET', message });
  }, []);

  const setBlockStartTime = useCallback((startTime) => {
    dispatch({ type: 'BLOCK_START_TIME_SET', startTime });
  }, []);

  const setBlockEndTime = useCallback((endTime) => {
    dispatch({ type: 'BLOCK_END_TIME_SET', endTime });
  }, []);

  const setBlockWarningMinutes = useCallback((warningMinutes) => {
    dispatch({ type: 'BLOCK_WARNING_MINUTES_SET', warningMinutes });
  }, []);

  // Bridge setter for handleBlockCreateOp compatibility
  // Direct boolean assignment - preserves exact legacy semantics
  const setBlockingInProgress = useCallback((value) => {
    dispatch({ type: 'BLOCK_IN_PROGRESS_SET', value });
  }, []);

  // Block creation - calls existing op with bridge setter
  // NOTE: No refresh call (legacy doesn't have one)
  const handleBlockCreate = useCallback(() => {
    return handleBlockCreateOp({
      backend,
      getCourtData,
      showAlertMessage,
      setBlockingInProgress,
      selectedCourtsToBlock: state.selectedCourtsToBlock,
      blockMessage: state.blockMessage,
      blockStartTime: state.blockStartTime,
      blockEndTime: state.blockEndTime,
    });
  }, [
    backend,
    getCourtData,
    showAlertMessage,
    setBlockingInProgress,
    state.selectedCourtsToBlock,
    state.blockMessage,
    state.blockStartTime,
    state.blockEndTime,
  ]);

  // Block cancellation - calls existing op
  // NOTE: No refresh call (legacy doesn't have one)
  const handleCancelBlock = useCallback(
    (blockId, courtNum) => {
      return handleCancelBlockOp({ backend, showAlertMessage }, blockId, courtNum);
    },
    [backend, showAlertMessage]
  );

  return {
    // State values (for AdminScreen props)
    showBlockModal: state.showBlockModal,
    blockingInProgress: state.blockingInProgress,
    selectedCourtsToBlock: state.selectedCourtsToBlock,
    blockMessage: state.blockMessage,
    blockStartTime: state.blockStartTime,
    blockEndTime: state.blockEndTime,
    blockWarningMinutes: state.blockWarningMinutes,

    // Setters (for AdminScreen props)
    setShowBlockModal,
    setSelectedCourtsToBlock,
    setBlockMessage,
    setBlockStartTime,
    setBlockEndTime,
    setBlockWarningMinutes,
    setBlockingInProgress,

    // Handlers (for AdminScreen props)
    onBlockCreate: handleBlockCreate,
    onCancelBlock: handleCancelBlock,
  };
}
