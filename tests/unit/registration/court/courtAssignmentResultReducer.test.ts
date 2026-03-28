import {
  courtAssignmentResultReducer,
  initialCourtAssignmentResultState,
} from '../../../../src/registration/court/courtAssignmentResultReducer';

describe('courtAssignmentResultReducer', () => {
  test('returns initial state for unknown action', () => {
    const result = courtAssignmentResultReducer(initialCourtAssignmentResultState, {
      type: 'UNKNOWN',
    });
    expect(result).toEqual(initialCourtAssignmentResultState);
  });

  test('initial state has correct defaults', () => {
    expect(initialCourtAssignmentResultState.justAssignedCourt).toBeNull();
    expect(initialCourtAssignmentResultState.assignedSessionId).toBeNull();
    expect(initialCourtAssignmentResultState.hasAssignedCourt).toBe(false);
  });

  test('JUST_ASSIGNED_COURT_SET updates justAssignedCourt', () => {
    const result = courtAssignmentResultReducer(initialCourtAssignmentResultState, {
      type: 'JUST_ASSIGNED_COURT_SET',
      value: 5,
    });
    expect(result.justAssignedCourt).toBe(5);
  });

  test('JUST_ASSIGNED_COURT_SET can set to null', () => {
    const state = { ...initialCourtAssignmentResultState, justAssignedCourt: 5 };
    const result = courtAssignmentResultReducer(state, {
      type: 'JUST_ASSIGNED_COURT_SET',
      value: null,
    });
    expect(result.justAssignedCourt).toBeNull();
  });

  test('ASSIGNED_SESSION_ID_SET updates assignedSessionId', () => {
    const result = courtAssignmentResultReducer(initialCourtAssignmentResultState, {
      type: 'ASSIGNED_SESSION_ID_SET',
      value: 'session-123',
    });
    expect(result.assignedSessionId).toBe('session-123');
  });

  test('ASSIGNED_SESSION_ID_SET can set to null', () => {
    const state = { ...initialCourtAssignmentResultState, assignedSessionId: 'session-123' };
    const result = courtAssignmentResultReducer(state, {
      type: 'ASSIGNED_SESSION_ID_SET',
      value: null,
    });
    expect(result.assignedSessionId).toBeNull();
  });

  test('HAS_ASSIGNED_COURT_SET updates hasAssignedCourt to true', () => {
    const result = courtAssignmentResultReducer(initialCourtAssignmentResultState, {
      type: 'HAS_ASSIGNED_COURT_SET',
      value: true,
    });
    expect(result.hasAssignedCourt).toBe(true);
  });

  test('HAS_ASSIGNED_COURT_SET updates hasAssignedCourt to false', () => {
    const state = { ...initialCourtAssignmentResultState, hasAssignedCourt: true };
    const result = courtAssignmentResultReducer(state, {
      type: 'HAS_ASSIGNED_COURT_SET',
      value: false,
    });
    expect(result.hasAssignedCourt).toBe(false);
  });

  test('COURT_ASSIGNMENT_RESULT_RESET returns initial state', () => {
    const state = {
      justAssignedCourt: 7,
      assignedSessionId: 'session-456',
      hasAssignedCourt: true,
    };
    const result = courtAssignmentResultReducer(state, {
      type: 'COURT_ASSIGNMENT_RESULT_RESET',
    });

    expect(result).toEqual(initialCourtAssignmentResultState);
    expect(result.justAssignedCourt).toBeNull();
    expect(result.assignedSessionId).toBeNull();
    expect(result.hasAssignedCourt).toBe(false);
  });
});
