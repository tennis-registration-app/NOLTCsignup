/**
 * Alert Display Reducer
 * Extracted from App.jsx
 *
 * State:
 *   - showAlert: boolean
 *   - alertMessage: string
 *
 * Note: No timer clearing exists in current behavior.
 * Rapid calls can stack timeouts (preserved as-is).
 */

export const initialAlertDisplayState = {
  showAlert: false,
  alertMessage: '',
};

export const ALERT_DISPLAY_ACTIONS = {
  SET_MESSAGE: 'ALERT_SET_MESSAGE',
  SET_VISIBILITY: 'ALERT_SET_VISIBILITY',
  SHOW_WITH_MESSAGE: 'ALERT_SHOW_WITH_MESSAGE',
  RESET: 'ALERT_RESET',
};

export function alertDisplayReducer(state, action) {
  switch (action.type) {
    case ALERT_DISPLAY_ACTIONS.SET_MESSAGE:
      return { ...state, alertMessage: action.payload };

    case ALERT_DISPLAY_ACTIONS.SET_VISIBILITY:
      return { ...state, showAlert: action.payload };

    case ALERT_DISPLAY_ACTIONS.SHOW_WITH_MESSAGE:
      return { ...state, alertMessage: action.payload, showAlert: true };

    case ALERT_DISPLAY_ACTIONS.RESET:
      return initialAlertDisplayState;

    default:
      return state;
  }
}
