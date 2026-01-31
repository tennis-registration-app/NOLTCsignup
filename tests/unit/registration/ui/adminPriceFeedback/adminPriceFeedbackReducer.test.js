import { describe, it, expect } from 'vitest';
import {
  adminPriceFeedbackReducer,
  initialAdminPriceFeedbackState,
  ADMIN_PRICE_FEEDBACK_ACTIONS,
} from '../../../../../src/registration/ui/adminPriceFeedback/adminPriceFeedbackReducer.js';

describe('adminPriceFeedbackReducer', () => {
  describe('initial state', () => {
    it('has showPriceSuccess false and empty priceError', () => {
      expect(initialAdminPriceFeedbackState).toEqual({
        showPriceSuccess: false,
        priceError: '',
      });
    });
  });

  describe('SET_SUCCESS', () => {
    it('sets showPriceSuccess to true', () => {
      const state = { showPriceSuccess: false, priceError: '' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_SUCCESS,
        payload: true,
      });
      expect(result).toEqual({ showPriceSuccess: true, priceError: '' });
    });

    it('sets showPriceSuccess to false', () => {
      const state = { showPriceSuccess: true, priceError: '' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_SUCCESS,
        payload: false,
      });
      expect(result).toEqual({ showPriceSuccess: false, priceError: '' });
    });

    it('preserves priceError when changing success', () => {
      const state = { showPriceSuccess: false, priceError: 'some error' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_SUCCESS,
        payload: true,
      });
      expect(result).toEqual({ showPriceSuccess: true, priceError: 'some error' });
    });
  });

  describe('SET_ERROR', () => {
    it('sets priceError message', () => {
      const state = { showPriceSuccess: false, priceError: '' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_ERROR,
        payload: 'Invalid price',
      });
      expect(result).toEqual({ showPriceSuccess: false, priceError: 'Invalid price' });
    });

    it('clears priceError with empty string', () => {
      const state = { showPriceSuccess: true, priceError: 'old error' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_ERROR,
        payload: '',
      });
      expect(result).toEqual({ showPriceSuccess: true, priceError: '' });
    });

    it('preserves showPriceSuccess when changing error', () => {
      const state = { showPriceSuccess: true, priceError: '' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.SET_ERROR,
        payload: 'new error',
      });
      expect(result).toEqual({ showPriceSuccess: true, priceError: 'new error' });
    });
  });

  describe('SHOW_SUCCESS', () => {
    it('sets success true and clears error in one action', () => {
      const state = { showPriceSuccess: false, priceError: 'some error' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.SHOW_SUCCESS,
      });
      expect(result).toEqual({ showPriceSuccess: true, priceError: '' });
    });
  });

  describe('RESET', () => {
    it('returns to initial state', () => {
      const state = { showPriceSuccess: true, priceError: 'error' };
      const result = adminPriceFeedbackReducer(state, {
        type: ADMIN_PRICE_FEEDBACK_ACTIONS.RESET,
      });
      expect(result).toEqual(initialAdminPriceFeedbackState);
    });
  });

  describe('unknown action', () => {
    it('returns current state unchanged', () => {
      const state = { showPriceSuccess: true, priceError: 'test' };
      const result = adminPriceFeedbackReducer(state, { type: 'UNKNOWN' });
      expect(result).toBe(state);
    });
  });
});
