import { describe, it, expect } from 'vitest';
import {
  guestCounterReducer,
  initialGuestCounterState,
  GUEST_COUNTER_ACTIONS,
} from '../../../../../src/registration/ui/guestCounter/guestCounterReducer.js';

describe('guestCounterReducer', () => {
  describe('initial state', () => {
    it('has guestCounter starting at 1', () => {
      expect(initialGuestCounterState).toEqual({
        guestCounter: 1,
      });
    });
  });

  describe('INCREMENT', () => {
    it('increments guestCounter by 1', () => {
      const state = { guestCounter: 1 };
      const result = guestCounterReducer(state, {
        type: GUEST_COUNTER_ACTIONS.INCREMENT,
      });
      expect(result).toEqual({ guestCounter: 2 });
    });

    it('increments from any value', () => {
      const state = { guestCounter: 5 };
      const result = guestCounterReducer(state, {
        type: GUEST_COUNTER_ACTIONS.INCREMENT,
      });
      expect(result).toEqual({ guestCounter: 6 });
    });
  });

  describe('SET', () => {
    it('sets guestCounter to specific value', () => {
      const state = { guestCounter: 1 };
      const result = guestCounterReducer(state, {
        type: GUEST_COUNTER_ACTIONS.SET,
        payload: 10,
      });
      expect(result).toEqual({ guestCounter: 10 });
    });
  });

  describe('RESET', () => {
    it('returns to initial state', () => {
      const state = { guestCounter: 15 };
      const result = guestCounterReducer(state, {
        type: GUEST_COUNTER_ACTIONS.RESET,
      });
      expect(result).toEqual(initialGuestCounterState);
    });
  });

  describe('unknown action', () => {
    it('returns current state unchanged', () => {
      const state = { guestCounter: 7 };
      const result = guestCounterReducer(state, { type: 'UNKNOWN' });
      expect(result).toEqual(state);
    });
  });
});
