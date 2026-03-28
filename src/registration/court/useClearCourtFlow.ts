/**
 * useClearCourtFlow Hook
 * Manages state for the Clear Court wizard.
 */

import { useReducer, useCallback } from 'react';
import { clearCourtFlowReducer, initialClearCourtFlowState } from './clearCourtFlowReducer';

export function useClearCourtFlow() {
  const [state, dispatch] = useReducer(clearCourtFlowReducer, initialClearCourtFlowState);

  // Setters (passed to ClearCourtScreen)
  const setSelectedCourtToClear = useCallback((value) => {
    dispatch({ type: 'SELECTED_COURT_TO_CLEAR_SET', value });
  }, []);

  const setClearCourtStep = useCallback((value) => {
    dispatch({ type: 'CLEAR_COURT_STEP_SET', value });
  }, []);

  // Decrement helper (for handleGroupGoBack)
  const decrementClearCourtStep = useCallback(() => {
    dispatch({ type: 'CLEAR_COURT_STEP_DECREMENT' });
  }, []);

  // Reset
  const resetClearCourtFlow = useCallback(() => {
    dispatch({ type: 'CLEAR_COURT_FLOW_RESET' });
  }, []);

  return {
    // State
    selectedCourtToClear: state.selectedCourtToClear,
    clearCourtStep: state.clearCourtStep,

    // Setters (for ClearCourtScreen props)
    setSelectedCourtToClear,
    setClearCourtStep,

    // Helpers
    decrementClearCourtStep,

    // Reset
    resetClearCourtFlow,
  };
}
