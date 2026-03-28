import {
  clearCourtFlowReducer,
  initialClearCourtFlowState,
} from '../../../../src/registration/court/clearCourtFlowReducer';

describe('clearCourtFlowReducer', () => {
  test('returns initial state for unknown action', () => {
    const result = clearCourtFlowReducer(initialClearCourtFlowState, {
      type: 'UNKNOWN',
    });
    expect(result).toEqual(initialClearCourtFlowState);
  });

  test('initial state has correct defaults', () => {
    expect(initialClearCourtFlowState.selectedCourtToClear).toBeNull();
    expect(initialClearCourtFlowState.clearCourtStep).toBe(1);
  });

  test('SELECTED_COURT_TO_CLEAR_SET updates selectedCourtToClear', () => {
    const result = clearCourtFlowReducer(initialClearCourtFlowState, {
      type: 'SELECTED_COURT_TO_CLEAR_SET',
      value: 5,
    });
    expect(result.selectedCourtToClear).toBe(5);
  });

  test('CLEAR_COURT_STEP_SET updates clearCourtStep', () => {
    const result = clearCourtFlowReducer(initialClearCourtFlowState, {
      type: 'CLEAR_COURT_STEP_SET',
      value: 3,
    });
    expect(result.clearCourtStep).toBe(3);
  });

  test('CLEAR_COURT_STEP_DECREMENT decreases clearCourtStep by 1', () => {
    const state = { ...initialClearCourtFlowState, clearCourtStep: 3 };
    const result = clearCourtFlowReducer(state, {
      type: 'CLEAR_COURT_STEP_DECREMENT',
    });
    expect(result.clearCourtStep).toBe(2);
  });

  test('CLEAR_COURT_STEP_DECREMENT from step 1 goes to 0', () => {
    const state = { ...initialClearCourtFlowState, clearCourtStep: 1 };
    const result = clearCourtFlowReducer(state, {
      type: 'CLEAR_COURT_STEP_DECREMENT',
    });
    expect(result.clearCourtStep).toBe(0);
  });

  test('CLEAR_COURT_FLOW_RESET returns initial state', () => {
    const state = {
      selectedCourtToClear: 7,
      clearCourtStep: 4,
    };
    const result = clearCourtFlowReducer(state, {
      type: 'CLEAR_COURT_FLOW_RESET',
    });
    expect(result).toEqual(initialClearCourtFlowState);
  });
});
