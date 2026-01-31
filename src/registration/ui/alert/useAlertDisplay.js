import { useReducer, useCallback } from 'react';
import {
  alertDisplayReducer,
  initialAlertDisplayState,
  ALERT_DISPLAY_ACTIONS,
} from './alertDisplayReducer.js';

/**
 * useAlertDisplay Hook
 * Extracted from App.jsx — WP5.6 R6a-1
 *
 * Provides alert display state and the showAlertMessage helper.
 *
 * Note: No timer clearing — rapid calls can stack timeouts.
 * This preserves the original App.jsx behavior exactly.
 *
 * @param {{ alertDurationMs?: number }} options
 * @returns {{
 *   showAlert: boolean,
 *   alertMessage: string,
 *   setShowAlert: (visible: boolean) => void,
 *   setAlertMessage: (message: string) => void,
 *   showAlertMessage: (message: string) => void,
 *   resetAlertDisplay: () => void,
 * }}
 */
export function useAlertDisplay({ alertDurationMs = 3000 } = {}) {
  const [state, dispatch] = useReducer(alertDisplayReducer, initialAlertDisplayState);

  const setShowAlert = useCallback((visible) => {
    dispatch({ type: ALERT_DISPLAY_ACTIONS.SET_VISIBILITY, payload: visible });
  }, []);

  const setAlertMessage = useCallback((message) => {
    dispatch({ type: ALERT_DISPLAY_ACTIONS.SET_MESSAGE, payload: message });
  }, []);

  /**
   * Show alert with message and auto-hide after alertDurationMs
   *
   * Note: Does NOT clear previous timeouts — matches original behavior.
   * Rapid calls will stack timeouts (last one to fire wins visually).
   */
  const showAlertMessage = useCallback(
    (message) => {
      dispatch({ type: ALERT_DISPLAY_ACTIONS.SHOW_WITH_MESSAGE, payload: message });
      setTimeout(() => {
        dispatch({ type: ALERT_DISPLAY_ACTIONS.SET_VISIBILITY, payload: false });
      }, alertDurationMs);
    },
    [alertDurationMs]
  );

  const resetAlertDisplay = useCallback(() => {
    dispatch({ type: ALERT_DISPLAY_ACTIONS.RESET });
  }, []);

  return {
    showAlert: state.showAlert,
    alertMessage: state.alertMessage,
    setShowAlert,
    setAlertMessage,
    showAlertMessage,
    resetAlertDisplay,
  };
}
