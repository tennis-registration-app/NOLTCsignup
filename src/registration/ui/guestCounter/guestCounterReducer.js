/**
 * Guest Counter Reducer
 * Extracted from App.jsx — WP5.6 R6a-3
 *
 * State:
 *   - guestCounter: number (starts at 1)
 *
 * Used to generate unique negative IDs for guest players.
 * Note: Intentionally NOT reset on form reset — ensures unique IDs across sessions.
 */

export const initialGuestCounterState = {
  guestCounter: 1,
};

export const GUEST_COUNTER_ACTIONS = {
  INCREMENT: 'GUEST_COUNTER_INCREMENT',
  SET: 'GUEST_COUNTER_SET',
  RESET: 'GUEST_COUNTER_RESET',
};

export function guestCounterReducer(state, action) {
  switch (action.type) {
    case GUEST_COUNTER_ACTIONS.INCREMENT:
      return { ...state, guestCounter: state.guestCounter + 1 };

    case GUEST_COUNTER_ACTIONS.SET:
      return { ...state, guestCounter: action.payload };

    case GUEST_COUNTER_ACTIONS.RESET:
      return initialGuestCounterState;

    default:
      return state;
  }
}
