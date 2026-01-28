/**
 * Waitlist Admin Reducer
 * Manages admin-only waitlist state (reordering).
 *
 * Minimal scope: only waitlistMoveFrom for now.
 */

export const initialWaitlistAdminState = {
  waitlistMoveFrom: null,
};

export function waitlistAdminReducer(state, action) {
  switch (action.type) {
    case 'WAITLIST_MOVE_FROM_SET':
      return { ...state, waitlistMoveFrom: action.value };

    default:
      return state;
  }
}
