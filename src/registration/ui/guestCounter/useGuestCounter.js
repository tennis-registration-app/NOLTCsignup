import { useReducer, useCallback } from 'react';
import {
  guestCounterReducer,
  initialGuestCounterState,
  GUEST_COUNTER_ACTIONS,
} from './guestCounterReducer.js';

/**
 * useGuestCounter Hook
 * Extracted from App.jsx
 *
 * Provides guest counter state for generating unique negative guest IDs.
 *
 * Note: Intentionally NOT reset on form reset — ensures unique IDs across sessions.
 *
 * @returns {{
 *   guestCounter: number,
 *   incrementGuestCounter: () => void,
 *   setGuestCounter: (value: number) => void,
 * }}
 */
export function useGuestCounter() {
  const [state, dispatch] = useReducer(guestCounterReducer, initialGuestCounterState);

  const incrementGuestCounter = useCallback(() => {
    dispatch({ type: GUEST_COUNTER_ACTIONS.INCREMENT });
  }, []);

  const setGuestCounter = useCallback((value) => {
    dispatch({ type: GUEST_COUNTER_ACTIONS.SET, payload: value });
  }, []);

  return {
    guestCounter: state.guestCounter,
    incrementGuestCounter,
    setGuestCounter,
  };
}
