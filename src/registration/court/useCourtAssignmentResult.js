/**
 * useCourtAssignmentResult Hook
 * Manages state after successful court assignment.
 */

import { useReducer, useCallback } from 'react';
import {
  courtAssignmentResultReducer,
  initialCourtAssignmentResultState,
} from './courtAssignmentResultReducer.js';

export function useCourtAssignmentResult() {
  const [state, dispatch] = useReducer(
    courtAssignmentResultReducer,
    initialCourtAssignmentResultState
  );

  // Setters
  const setJustAssignedCourt = useCallback((value) => {
    dispatch({ type: 'JUST_ASSIGNED_COURT_SET', value });
  }, []);

  const setAssignedSessionId = useCallback((value) => {
    dispatch({ type: 'ASSIGNED_SESSION_ID_SET', value });
  }, []);

  const setAssignedEndTime = useCallback((value) => {
    dispatch({ type: 'ASSIGNED_END_TIME_SET', value });
  }, []);

  const setHasAssignedCourt = useCallback((value) => {
    dispatch({ type: 'HAS_ASSIGNED_COURT_SET', value });
  }, []);

  // Reset
  const resetCourtAssignmentResult = useCallback(() => {
    dispatch({ type: 'COURT_ASSIGNMENT_RESULT_RESET' });
  }, []);

  return {
    // State
    justAssignedCourt: state.justAssignedCourt,
    assignedSessionId: state.assignedSessionId,
    assignedEndTime: state.assignedEndTime,
    hasAssignedCourt: state.hasAssignedCourt,

    // Setters
    setJustAssignedCourt,
    setAssignedSessionId,
    setAssignedEndTime,
    setHasAssignedCourt,

    // Reset
    resetCourtAssignmentResult,
  };
}
