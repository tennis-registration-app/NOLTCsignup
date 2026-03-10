/**
 * Streak Reducer
 * Manages streak warning modal state.
 *
 * NOTE: handleStreakAcknowledge stays in App.jsx (calls assignCourtToGroup).
 */

export interface StreakState {
  registrantStreak: number;
  showStreakModal: boolean;
  streakAcknowledged: boolean;
}

type StreakAction =
  | { type: 'REGISTRANT_STREAK_SET'; value: number }
  | { type: 'SHOW_STREAK_MODAL_SET'; value: boolean }
  | { type: 'STREAK_ACKNOWLEDGED_SET'; value: boolean }
  | { type: 'STREAK_RESET' };

export const initialStreakState: StreakState = {
  registrantStreak: 0,
  showStreakModal: false,
  streakAcknowledged: false,
};

export function streakReducer(state: StreakState, action: StreakAction): StreakState {
  switch (action.type) {
    case 'REGISTRANT_STREAK_SET':
      return { ...state, registrantStreak: action.value };

    case 'SHOW_STREAK_MODAL_SET':
      return { ...state, showStreakModal: action.value };

    case 'STREAK_ACKNOWLEDGED_SET':
      return { ...state, streakAcknowledged: action.value };

    case 'STREAK_RESET':
      return {
        ...state,
        registrantStreak: 0,
        showStreakModal: false,
        streakAcknowledged: false,
      };

    default:
      return state;
  }
}
