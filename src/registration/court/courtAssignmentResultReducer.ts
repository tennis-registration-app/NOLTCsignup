/**
 * Court Assignment Result Reducer
 * Manages state after successful court assignment.
 */

export interface CourtAssignmentResultState {
  justAssignedCourt: number | null;
  assignedSessionId: string | null;
  assignedEndTime: string | null;
  hasAssignedCourt: boolean;
}

type CourtAssignmentResultAction =
  | { type: 'JUST_ASSIGNED_COURT_SET'; value: number | null }
  | { type: 'ASSIGNED_SESSION_ID_SET'; value: string | null }
  | { type: 'ASSIGNED_END_TIME_SET'; value: string | null }
  | { type: 'HAS_ASSIGNED_COURT_SET'; value: boolean }
  | { type: 'COURT_ASSIGNMENT_RESULT_RESET' };

export const initialCourtAssignmentResultState: CourtAssignmentResultState = {
  justAssignedCourt: null,
  assignedSessionId: null,
  assignedEndTime: null,
  hasAssignedCourt: false,
};

export function courtAssignmentResultReducer(state: CourtAssignmentResultState, action: CourtAssignmentResultAction): CourtAssignmentResultState {
  switch (action.type) {
    case 'JUST_ASSIGNED_COURT_SET':
      return { ...state, justAssignedCourt: action.value };

    case 'ASSIGNED_SESSION_ID_SET':
      return { ...state, assignedSessionId: action.value };

    case 'ASSIGNED_END_TIME_SET':
      return { ...state, assignedEndTime: action.value };

    case 'HAS_ASSIGNED_COURT_SET':
      return { ...state, hasAssignedCourt: action.value };

    case 'COURT_ASSIGNMENT_RESULT_RESET':
      return initialCourtAssignmentResultState;

    default:
      return state;
  }
}
