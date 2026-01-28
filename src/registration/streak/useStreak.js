/**
 * useStreak Hook
 * Manages streak warning state.
 *
 * NOTE: handleStreakAcknowledge is NOT in this hook (stays in App.jsx).
 * The handler calls assignCourtToGroup which is a major orchestrator.
 */

import { useReducer, useCallback } from 'react';
import { streakReducer, initialStreakState } from './streakReducer.js';

export function useStreak() {
  const [state, dispatch] = useReducer(streakReducer, initialStreakState);

  // Setters (same signatures as useState setters)
  const setRegistrantStreak = useCallback((value) => {
    dispatch({ type: 'REGISTRANT_STREAK_SET', value });
  }, []);

  const setShowStreakModal = useCallback((value) => {
    dispatch({ type: 'SHOW_STREAK_MODAL_SET', value });
  }, []);

  const setStreakAcknowledged = useCallback((value) => {
    dispatch({ type: 'STREAK_ACKNOWLEDGED_SET', value });
  }, []);

  // Reset (for resetForm and applyInactivityTimeoutExitSequence)
  const resetStreak = useCallback(() => {
    dispatch({ type: 'STREAK_RESET' });
  }, []);

  return {
    // State
    registrantStreak: state.registrantStreak,
    showStreakModal: state.showStreakModal,
    streakAcknowledged: state.streakAcknowledged,

    // Setters
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,

    // Reset
    resetStreak,
  };
}
