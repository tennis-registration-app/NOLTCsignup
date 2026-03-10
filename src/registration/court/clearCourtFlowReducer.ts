/**
 * Clear Court Flow Reducer
 * Manages state for the Clear Court wizard.
 */

export interface ClearCourtFlowState {
  selectedCourtToClear: number | null;
  clearCourtStep: number;
}

type ClearCourtFlowAction =
  | { type: 'SELECTED_COURT_TO_CLEAR_SET'; value: number | null }
  | { type: 'CLEAR_COURT_STEP_SET'; value: number }
  | { type: 'CLEAR_COURT_STEP_DECREMENT' }
  | { type: 'CLEAR_COURT_FLOW_RESET' };

export const initialClearCourtFlowState: ClearCourtFlowState = {
  selectedCourtToClear: null,
  clearCourtStep: 1,
};

export function clearCourtFlowReducer(state: ClearCourtFlowState, action: ClearCourtFlowAction): ClearCourtFlowState {
  switch (action.type) {
    case 'SELECTED_COURT_TO_CLEAR_SET':
      return { ...state, selectedCourtToClear: action.value };

    case 'CLEAR_COURT_STEP_SET':
      return { ...state, clearCourtStep: action.value };

    case 'CLEAR_COURT_STEP_DECREMENT':
      return { ...state, clearCourtStep: state.clearCourtStep - 1 };

    case 'CLEAR_COURT_FLOW_RESET':
      return initialClearCourtFlowState;

    default:
      return state;
  }
}
