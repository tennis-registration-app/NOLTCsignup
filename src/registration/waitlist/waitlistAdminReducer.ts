/**
 * Waitlist Admin Reducer
 * Manages admin-only waitlist state (reordering).
 *
 * Minimal scope: only waitlistMoveFrom for now.
 */

export interface WaitlistAdminState {
  waitlistMoveFrom: number | null;
}

type WaitlistAdminAction =
  | { type: 'WAITLIST_MOVE_FROM_SET'; value: number | null };

export const initialWaitlistAdminState: WaitlistAdminState = {
  waitlistMoveFrom: null,
};

export function waitlistAdminReducer(state: WaitlistAdminState, action: WaitlistAdminAction): WaitlistAdminState {
  switch (action.type) {
    case 'WAITLIST_MOVE_FROM_SET':
      return { ...state, waitlistMoveFrom: action.value };

    default:
      return state;
  }
}
