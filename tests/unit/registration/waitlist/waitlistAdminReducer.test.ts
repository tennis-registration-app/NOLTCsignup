import {
  waitlistAdminReducer,
  initialWaitlistAdminState,
} from '../../../../src/registration/waitlist/waitlistAdminReducer';

describe('waitlistAdminReducer', () => {
  test('returns initial state for unknown action', () => {
    const result = waitlistAdminReducer(initialWaitlistAdminState, { type: 'UNKNOWN' });
    expect(result).toEqual(initialWaitlistAdminState);
  });

  test('initial state has waitlistMoveFrom as null', () => {
    expect(initialWaitlistAdminState.waitlistMoveFrom).toBeNull();
  });

  test('WAITLIST_MOVE_FROM_SET updates waitlistMoveFrom to number', () => {
    const result = waitlistAdminReducer(initialWaitlistAdminState, {
      type: 'WAITLIST_MOVE_FROM_SET',
      value: 3,
    });
    expect(result.waitlistMoveFrom).toBe(3);
  });

  test('WAITLIST_MOVE_FROM_SET can set to null (reset/cancel)', () => {
    const state = { waitlistMoveFrom: 5 };
    const result = waitlistAdminReducer(state, {
      type: 'WAITLIST_MOVE_FROM_SET',
      value: null,
    });
    expect(result.waitlistMoveFrom).toBeNull();
  });

  test('WAITLIST_MOVE_FROM_SET can set to zero', () => {
    const result = waitlistAdminReducer(initialWaitlistAdminState, {
      type: 'WAITLIST_MOVE_FROM_SET',
      value: 0,
    });
    expect(result.waitlistMoveFrom).toBe(0);
  });
});
