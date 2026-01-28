/**
 * Admin Price Feedback Reducer
 * Extracted from App.jsx — WP5.6 R6a-2
 *
 * State:
 *   - showPriceSuccess: boolean
 *   - priceError: string
 *
 * Note: Success has a 3000ms auto-hide timeout (no timer clearing).
 * This preserves the original App.jsx behavior exactly.
 */

export const initialAdminPriceFeedbackState = {
  showPriceSuccess: false,
  priceError: '',
};

export const ADMIN_PRICE_FEEDBACK_ACTIONS = {
  SET_SUCCESS: 'ADMIN_PRICE_SUCCESS_SET',
  SET_ERROR: 'ADMIN_PRICE_ERROR_SET',
  SHOW_SUCCESS: 'ADMIN_PRICE_SHOW_SUCCESS',
  RESET: 'ADMIN_PRICE_FEEDBACK_RESET',
};

export function adminPriceFeedbackReducer(state, action) {
  switch (action.type) {
    case ADMIN_PRICE_FEEDBACK_ACTIONS.SET_SUCCESS:
      return { ...state, showPriceSuccess: action.payload };

    case ADMIN_PRICE_FEEDBACK_ACTIONS.SET_ERROR:
      return { ...state, priceError: action.payload };

    case ADMIN_PRICE_FEEDBACK_ACTIONS.SHOW_SUCCESS:
      // Sets success true and clears error — matches original pattern
      return { ...state, showPriceSuccess: true, priceError: '' };

    case ADMIN_PRICE_FEEDBACK_ACTIONS.RESET:
      return initialAdminPriceFeedbackState;

    default:
      return state;
  }
}
