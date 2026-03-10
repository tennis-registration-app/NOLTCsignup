/**
 * Guest Counter Reducer
 * Extracted from App.jsx
 *
 * State:
 *   - guestCounter: number (starts at 1)
 *
 * Used to generate unique negative IDs for guest players.
 * Note: Intentionally NOT reset on form reset — ensures unique IDs across sessions.
 */

export interface GuestCounterState {
  guestCounter: number;
}

export const GUEST_COUNTER_ACTIONS = {
  INCREMENT: 'GUEST_COUNTER_INCREMENT',
  SET: 'GUEST_COUNTER_SET',
  RESET: 'GUEST_COUNTER_RESET',
} as const;

type GuestCounterAction =
  | { type: typeof GUEST_COUNTER_ACTIONS.INCREMENT }
  | { type: typeof GUEST_COUNTER_ACTIONS.SET; payload: number }
  | { type: typeof GUEST_COUNTER_ACTIONS.RESET };

export const initialGuestCounterState: GuestCounterState = {
  guestCounter: 1,
};

export function guestCounterReducer(state: GuestCounterState, action: GuestCounterAction): GuestCounterState {
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
