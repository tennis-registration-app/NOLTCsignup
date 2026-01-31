/**
 * WetCourts Reducer Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { wetCourtsReducer, initialWetCourtsState } from '../../../../src/admin/wetCourts/wetCourtsReducer.js';

describe('wetCourtsReducer', () => {
  describe('initialWetCourtsState', () => {
    it('should have correct initial values', () => {
      expect(initialWetCourtsState).toEqual({
        isActive: false,
        wetCourtNumbers: [],
        suspendedBlocks: [],
        isBusy: false,
        busyOp: null,
        error: null,
      });
    });
  });

  describe('WET_OP_STARTED', () => {
    it('should set isBusy, busyOp, and clear error', () => {
      const state = {
        ...initialWetCourtsState,
        error: 'previous error',
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_OP_STARTED',
        op: 'activate',
      });

      expect(result.isBusy).toBe(true);
      expect(result.busyOp).toBe('activate');
      expect(result.error).toBe(null);
    });

    it('should work with different op types', () => {
      const ops = ['activate', 'deactivate', 'clearOne', 'clearAll'];

      for (const op of ops) {
        const result = wetCourtsReducer(initialWetCourtsState, {
          type: 'WET_OP_STARTED',
          op,
        });
        expect(result.busyOp).toBe(op);
      }
    });
  });

  describe('WET_OP_SUCCEEDED', () => {
    it('should clear isBusy, busyOp, and error', () => {
      const state = {
        ...initialWetCourtsState,
        isBusy: true,
        busyOp: 'activate',
        error: 'some error',
      };

      const result = wetCourtsReducer(state, { type: 'WET_OP_SUCCEEDED' });

      expect(result.isBusy).toBe(false);
      expect(result.busyOp).toBe(null);
      expect(result.error).toBe(null);
    });

    it('should preserve other state', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2, 3],
        isBusy: true,
        busyOp: 'clearOne',
      };

      const result = wetCourtsReducer(state, { type: 'WET_OP_SUCCEEDED' });

      expect(result.isActive).toBe(true);
      expect(result.wetCourtNumbers).toEqual([1, 2, 3]);
    });
  });

  describe('WET_OP_FAILED', () => {
    it('should clear isBusy, busyOp and set error', () => {
      const state = {
        ...initialWetCourtsState,
        isBusy: true,
        busyOp: 'deactivate',
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_OP_FAILED',
        error: 'API timeout',
      });

      expect(result.isBusy).toBe(false);
      expect(result.busyOp).toBe(null);
      expect(result.error).toBe('API timeout');
    });

    it('should preserve other state', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [5, 6],
        isBusy: true,
        busyOp: 'activate',
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_OP_FAILED',
        error: 'Network error',
      });

      expect(result.isActive).toBe(true);
      expect(result.wetCourtNumbers).toEqual([5, 6]);
    });
  });

  describe('WET_ACTIVATED', () => {
    it('should set isActive and wetCourtNumbers (normalized)', () => {
      const result = wetCourtsReducer(initialWetCourtsState, {
        type: 'WET_ACTIVATED',
        courtNumbers: [3, 1, 2, 1], // duplicates and unsorted
      });

      expect(result.isActive).toBe(true);
      expect(result.wetCourtNumbers).toEqual([1, 2, 3]); // sorted, unique
    });

    it('should set suspendedBlocks when provided', () => {
      const suspendedBlocks = [{ id: 'block-1' }, { id: 'block-2' }];

      const result = wetCourtsReducer(initialWetCourtsState, {
        type: 'WET_ACTIVATED',
        courtNumbers: [1, 2],
        suspendedBlocks,
      });

      expect(result.suspendedBlocks).toEqual(suspendedBlocks);
    });

    it('should preserve existing suspendedBlocks when not provided', () => {
      const state = {
        ...initialWetCourtsState,
        suspendedBlocks: [{ id: 'existing' }],
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_ACTIVATED',
        courtNumbers: [1, 2, 3],
      });

      expect(result.suspendedBlocks).toEqual([{ id: 'existing' }]);
    });

    it('should handle empty courtNumbers', () => {
      const result = wetCourtsReducer(initialWetCourtsState, {
        type: 'WET_ACTIVATED',
        courtNumbers: [],
      });

      expect(result.isActive).toBe(true);
      expect(result.wetCourtNumbers).toEqual([]);
    });

    it('should handle missing courtNumbers', () => {
      const result = wetCourtsReducer(initialWetCourtsState, {
        type: 'WET_ACTIVATED',
      });

      expect(result.isActive).toBe(true);
      expect(result.wetCourtNumbers).toEqual([]);
    });
  });

  describe('WET_DEACTIVATED', () => {
    it('should reset isActive, wetCourtNumbers, and suspendedBlocks', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2, 3, 4, 5],
        suspendedBlocks: [{ id: 'block-1' }],
        isBusy: false,
        error: 'some error',
      };

      const result = wetCourtsReducer(state, { type: 'WET_DEACTIVATED' });

      expect(result.isActive).toBe(false);
      expect(result.wetCourtNumbers).toEqual([]);
      expect(result.suspendedBlocks).toEqual([]);
    });

    it('should preserve isBusy and error state', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        isBusy: true,
        busyOp: 'deactivate',
        error: 'should persist',
      };

      const result = wetCourtsReducer(state, { type: 'WET_DEACTIVATED' });

      expect(result.isBusy).toBe(true);
      expect(result.busyOp).toBe('deactivate');
      expect(result.error).toBe('should persist');
    });
  });

  describe('WET_COURT_CLEARED', () => {
    it('should remove single court and normalize', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2, 3, 4, 5],
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_COURT_CLEARED',
        courtNumber: 3,
      });

      expect(result.wetCourtNumbers).toEqual([1, 2, 4, 5]);
    });

    it('should NOT change isActive', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2],
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_COURT_CLEARED',
        courtNumber: 1,
      });

      expect(result.isActive).toBe(true);
      expect(result.wetCourtNumbers).toEqual([2]);
    });

    it('should NOT change isActive even when last court cleared', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [5],
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_COURT_CLEARED',
        courtNumber: 5,
      });

      expect(result.isActive).toBe(true);
      expect(result.wetCourtNumbers).toEqual([]);
    });

    it('should handle clearing non-existent court gracefully', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2, 3],
      };

      const result = wetCourtsReducer(state, {
        type: 'WET_COURT_CLEARED',
        courtNumber: 99,
      });

      expect(result.wetCourtNumbers).toEqual([1, 2, 3]);
    });
  });

  describe('WET_COURTS_CLEARED_ALL', () => {
    it('should empty wetCourtNumbers', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      };

      const result = wetCourtsReducer(state, { type: 'WET_COURTS_CLEARED_ALL' });

      expect(result.wetCourtNumbers).toEqual([]);
    });

    it('should NOT change isActive', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2, 3],
      };

      const result = wetCourtsReducer(state, { type: 'WET_COURTS_CLEARED_ALL' });

      expect(result.isActive).toBe(true);
    });

    it('should preserve suspendedBlocks', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2],
        suspendedBlocks: [{ id: 'block-1' }],
      };

      const result = wetCourtsReducer(state, { type: 'WET_COURTS_CLEARED_ALL' });

      expect(result.suspendedBlocks).toEqual([{ id: 'block-1' }]);
    });
  });

  describe('Unknown action', () => {
    it('should return state unchanged for unknown action type', () => {
      const state = {
        ...initialWetCourtsState,
        isActive: true,
        wetCourtNumbers: [1, 2, 3],
      };

      const result = wetCourtsReducer(state, { type: 'UNKNOWN_ACTION' });

      expect(result).toBe(state); // Same reference
    });
  });

  describe('normalizeCourtNumbers (via actions)', () => {
    it('should sort court numbers ascending', () => {
      const result = wetCourtsReducer(initialWetCourtsState, {
        type: 'WET_ACTIVATED',
        courtNumbers: [12, 1, 5, 3],
      });

      expect(result.wetCourtNumbers).toEqual([1, 3, 5, 12]);
    });

    it('should remove duplicates', () => {
      const result = wetCourtsReducer(initialWetCourtsState, {
        type: 'WET_ACTIVATED',
        courtNumbers: [1, 1, 2, 2, 3, 3],
      });

      expect(result.wetCourtNumbers).toEqual([1, 2, 3]);
    });

    it('should handle all 12 courts', () => {
      const result = wetCourtsReducer(initialWetCourtsState, {
        type: 'WET_ACTIVATED',
        courtNumbers: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      });

      expect(result.wetCourtNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });
});
