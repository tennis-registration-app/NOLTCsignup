import { describe, it, expect } from 'vitest';
import {
  alertDisplayReducer,
  initialAlertDisplayState,
  ALERT_DISPLAY_ACTIONS,
} from '../../../../../src/registration/ui/alert/alertDisplayReducer.js';

describe('alertDisplayReducer', () => {
  describe('initial state', () => {
    it('has showAlert false and empty alertMessage', () => {
      expect(initialAlertDisplayState).toEqual({
        showAlert: false,
        alertMessage: '',
      });
    });
  });

  describe('SET_MESSAGE', () => {
    it('sets alertMessage without changing showAlert', () => {
      const state = { showAlert: false, alertMessage: '' };
      const result = alertDisplayReducer(state, {
        type: ALERT_DISPLAY_ACTIONS.SET_MESSAGE,
        payload: 'Test message',
      });
      expect(result).toEqual({ showAlert: false, alertMessage: 'Test message' });
    });

    it('preserves showAlert when already true', () => {
      const state = { showAlert: true, alertMessage: 'old' };
      const result = alertDisplayReducer(state, {
        type: ALERT_DISPLAY_ACTIONS.SET_MESSAGE,
        payload: 'new',
      });
      expect(result).toEqual({ showAlert: true, alertMessage: 'new' });
    });
  });

  describe('SET_VISIBILITY', () => {
    it('sets showAlert to true', () => {
      const state = { showAlert: false, alertMessage: 'msg' };
      const result = alertDisplayReducer(state, {
        type: ALERT_DISPLAY_ACTIONS.SET_VISIBILITY,
        payload: true,
      });
      expect(result).toEqual({ showAlert: true, alertMessage: 'msg' });
    });

    it('sets showAlert to false', () => {
      const state = { showAlert: true, alertMessage: 'msg' };
      const result = alertDisplayReducer(state, {
        type: ALERT_DISPLAY_ACTIONS.SET_VISIBILITY,
        payload: false,
      });
      expect(result).toEqual({ showAlert: false, alertMessage: 'msg' });
    });
  });

  describe('SHOW_WITH_MESSAGE', () => {
    it('sets message and shows alert in one action', () => {
      const state = { showAlert: false, alertMessage: '' };
      const result = alertDisplayReducer(state, {
        type: ALERT_DISPLAY_ACTIONS.SHOW_WITH_MESSAGE,
        payload: 'Alert!',
      });
      expect(result).toEqual({ showAlert: true, alertMessage: 'Alert!' });
    });
  });

  describe('RESET', () => {
    it('returns to initial state', () => {
      const state = { showAlert: true, alertMessage: 'something' };
      const result = alertDisplayReducer(state, {
        type: ALERT_DISPLAY_ACTIONS.RESET,
      });
      expect(result).toEqual(initialAlertDisplayState);
    });
  });

  describe('unknown action', () => {
    it('returns current state unchanged', () => {
      const state = { showAlert: true, alertMessage: 'test' };
      const result = alertDisplayReducer(state, { type: 'UNKNOWN' });
      expect(result).toBe(state);
    });
  });
});
