/**
 * Court Assignment Result Reducer
 * Manages state after successful court assignment.
 */

export const initialCourtAssignmentResultState = {
  justAssignedCourt: null,
  assignedSessionId: null,
  hasAssignedCourt: false,
};

export function courtAssignmentResultReducer(state, action) {
  switch (action.type) {
    case 'JUST_ASSIGNED_COURT_SET':
      return { ...state, justAssignedCourt: action.value };

    case 'ASSIGNED_SESSION_ID_SET':
      return { ...state, assignedSessionId: action.value };

    case 'HAS_ASSIGNED_COURT_SET':
      return { ...state, hasAssignedCourt: action.value };

    case 'COURT_ASSIGNMENT_RESULT_RESET':
      return initialCourtAssignmentResultState;

    default:
      return state;
  }
}
