import { useReducer, useCallback } from 'react';
import {
  adminPriceFeedbackReducer,
  initialAdminPriceFeedbackState,
  ADMIN_PRICE_FEEDBACK_ACTIONS,
} from './adminPriceFeedbackReducer.js';

/**
 * useAdminPriceFeedback Hook
 * Extracted from App.jsx
 *
 * Provides admin price feedback state (success/error display).
 *
 * Note: Success auto-hides after 3000ms with no timer clearing.
 * Rapid calls can stack timeouts (preserved as-is from original).
 *
 * @returns {{
 *   showPriceSuccess: boolean,
 *   priceError: string,
 *   setShowPriceSuccess: (visible: boolean) => void,
 *   setPriceError: (error: string) => void,
 *   showPriceSuccessWithClear: () => void,
 *   resetAdminPriceFeedback: () => void,
 * }}
 */
export function useAdminPriceFeedback() {
  const [state, dispatch] = useReducer(adminPriceFeedbackReducer, initialAdminPriceFeedbackState);

  const setShowPriceSuccess = useCallback((visible) => {
    dispatch({ type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_SUCCESS, payload: visible });
  }, []);

  const setPriceError = useCallback((error) => {
    dispatch({ type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_ERROR, payload: error });
  }, []);

  /**
   * Show success and clear error, then auto-hide after 3000ms.
   * Matches original pattern from handlePriceUpdate:
   *   setShowPriceSuccess(true);
   *   setPriceError('');
   *   setTimeout(() => setShowPriceSuccess(false), 3000);
   *
   * Note: Does NOT clear previous timeouts — matches original behavior.
   */
  const showPriceSuccessWithClear = useCallback(() => {
    dispatch({ type: ADMIN_PRICE_FEEDBACK_ACTIONS.SHOW_SUCCESS });
    setTimeout(() => {
      dispatch({ type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_SUCCESS, payload: false });
    }, 3000);
  }, []);

  const resetAdminPriceFeedback = useCallback(() => {
    dispatch({ type: ADMIN_PRICE_FEEDBACK_ACTIONS.RESET });
  }, []);

  return {
    showPriceSuccess: state.showPriceSuccess,
    priceError: state.priceError,
    setShowPriceSuccess,
    setPriceError,
    showPriceSuccessWithClear,
    resetAdminPriceFeedback,
  };
}
