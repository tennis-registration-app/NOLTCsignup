import {
  streakReducer,
  initialStreakState,
} from '../../../../src/registration/streak/streakReducer';

describe('streakReducer', () => {
  // Initial state
  test('returns initial state for unknown action', () => {
    const result = streakReducer(initialStreakState, { type: 'UNKNOWN' });
    expect(result).toEqual(initialStreakState);
  });

  test('initial state has correct defaults', () => {
    expect(initialStreakState.registrantStreak).toBe(0);
    expect(initialStreakState.showStreakModal).toBe(false);
    expect(initialStreakState.streakAcknowledged).toBe(false);
  });

  // SET actions
  test('REGISTRANT_STREAK_SET updates registrantStreak', () => {
    const result = streakReducer(initialStreakState, {
      type: 'REGISTRANT_STREAK_SET',
      value: 5,
    });
    expect(result.registrantStreak).toBe(5);
  });

  test('REGISTRANT_STREAK_SET can set to zero', () => {
    const state = { ...initialStreakState, registrantStreak: 7 };
    const result = streakReducer(state, {
      type: 'REGISTRANT_STREAK_SET',
      value: 0,
    });
    expect(result.registrantStreak).toBe(0);
  });

  test('SHOW_STREAK_MODAL_SET updates showStreakModal to true', () => {
    const result = streakReducer(initialStreakState, {
      type: 'SHOW_STREAK_MODAL_SET',
      value: true,
    });
    expect(result.showStreakModal).toBe(true);
  });

  test('SHOW_STREAK_MODAL_SET updates showStreakModal to false', () => {
    const state = { ...initialStreakState, showStreakModal: true };
    const result = streakReducer(state, {
      type: 'SHOW_STREAK_MODAL_SET',
      value: false,
    });
    expect(result.showStreakModal).toBe(false);
  });

  test('STREAK_ACKNOWLEDGED_SET updates streakAcknowledged to true', () => {
    const result = streakReducer(initialStreakState, {
      type: 'STREAK_ACKNOWLEDGED_SET',
      value: true,
    });
    expect(result.streakAcknowledged).toBe(true);
  });

  test('STREAK_ACKNOWLEDGED_SET updates streakAcknowledged to false', () => {
    const state = { ...initialStreakState, streakAcknowledged: true };
    const result = streakReducer(state, {
      type: 'STREAK_ACKNOWLEDGED_SET',
      value: false,
    });
    expect(result.streakAcknowledged).toBe(false);
  });

  // Reset
  test('STREAK_RESET restores all three to initial values', () => {
    const state = {
      registrantStreak: 7,
      showStreakModal: true,
      streakAcknowledged: true,
    };
    const result = streakReducer(state, { type: 'STREAK_RESET' });

    expect(result.registrantStreak).toBe(0);
    expect(result.showStreakModal).toBe(false);
    expect(result.streakAcknowledged).toBe(false);
  });
});
