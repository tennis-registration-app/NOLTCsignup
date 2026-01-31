/**
 * useWetCourts Hook
 * Orchestrates wet-courts state (reducer) + backend ops + side effects.
 *
 * Side effects (Events.emitDom, onRefresh) fire ONLY on backend success.
 *
 * Error handling:
 * - On backend failure: dispatches WET_OP_FAILED, no emitDom/onRefresh
 * - On missing courtId: dispatches WET_OP_FAILED, no backend call
 */

import { useReducer, useCallback } from 'react';
import { wetCourtsReducer, initialWetCourtsState } from './wetCourtsReducer.js';
import {
  activateWetCourtsOp,
  clearAllWetCourtsOp,
  clearWetCourtOp,
} from '../handlers/wetCourtOperations.js';

/**
 * @param {Object} deps - External dependencies
 * @param {Object} deps.backend - Backend API
 * @param {Function} deps.getDeviceId - Device ID getter
 * @param {Array} deps.courts - Courts array (for ID lookup)
 * @param {Object} deps.Events - Events module for emitDom
 * @param {Function} deps.onRefresh - Callback to trigger refresh
 */
export function useWetCourts({ backend, getDeviceId, courts, Events, onRefresh }) {
  const [state, dispatch] = useReducer(wetCourtsReducer, initialWetCourtsState);

  /**
   * Activate wet mode (mark all courts wet)
   * Backend: activateWetCourtsOp
   * State: WET_OP_STARTED -> WET_ACTIVATED -> WET_OP_SUCCEEDED
   */
  const activateWet = useCallback(async () => {
    dispatch({ type: 'WET_OP_STARTED', op: 'activate' });

    try {
      const result = await activateWetCourtsOp({ backend, getDeviceId });

      if (result.ok) {
        // Match legacy exactly: result.courtNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        const courtNumbers = result.courtNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        dispatch({ type: 'WET_ACTIVATED', courtNumbers });
        dispatch({ type: 'WET_OP_SUCCEEDED' });

        // Side effects at end of success block (single location)
        // Match legacy: Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: Array.from(allCourts) })
        Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: Array.from(courtNumbers) });
        onRefresh();
      } else {
        dispatch({
          type: 'WET_OP_FAILED',
          error: result.message || 'Failed to activate wet courts',
        });
      }
    } catch (error) {
      dispatch({ type: 'WET_OP_FAILED', error: error.message });
    }
  }, [backend, getDeviceId, Events, onRefresh]);

  /**
   * Deactivate wet mode (clear all + toggle mode off)
   * Backend: clearAllWetCourtsOp
   * State: WET_OP_STARTED -> WET_DEACTIVATED -> WET_OP_SUCCEEDED
   *
   * NOTE: Uses same backend op as clearAllWet, but dispatches WET_DEACTIVATED
   * (which clears isActive, wetCourtNumbers, AND suspendedBlocks)
   */
  const deactivateWet = useCallback(async () => {
    dispatch({ type: 'WET_OP_STARTED', op: 'deactivate' });

    try {
      const result = await clearAllWetCourtsOp({ backend, getDeviceId });

      if (result.ok) {
        dispatch({ type: 'WET_DEACTIVATED' });
        dispatch({ type: 'WET_OP_SUCCEEDED' });

        // Side effects at end of success block
        // Match legacy: Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: [] })
        Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: [] });
        onRefresh();
      } else {
        dispatch({
          type: 'WET_OP_FAILED',
          error: result.message || 'Failed to deactivate wet courts',
        });
      }
    } catch (error) {
      dispatch({ type: 'WET_OP_FAILED', error: error.message });
    }
  }, [backend, getDeviceId, Events, onRefresh]);

  /**
   * Clear a single wet court
   * Backend: clearWetCourtOp
   * State: WET_OP_STARTED -> WET_COURT_CLEARED -> (WET_DEACTIVATED if empty) -> WET_OP_SUCCEEDED
   *
   * CRITICAL RULES:
   * 1. Validate court lookup BEFORE backend call
   * 2. Compute emptiness BEFORE dispatch (avoid stale state)
   * 3. Auto-deactivate is STATE-ONLY (no second backend call)
   * 4. Use Number() coercion for court lookup
   */
  const clearWetCourt = useCallback(
    async (courtNumber) => {
      // Validate court lookup with type coercion
      const court = courts?.find((c) => Number(c.number) === Number(courtNumber));
      if (!court?.id) {
        dispatch({
          type: 'WET_OP_FAILED',
          error: `Court ${courtNumber} not found`,
        });
        return; // No backend call, no emitDom, no onRefresh
      }

      // Compute emptiness BEFORE dispatch (using pre-dispatch snapshot)
      const willBeEmpty =
        state.wetCourtNumbers.length === 1 && state.wetCourtNumbers.includes(Number(courtNumber));

      dispatch({ type: 'WET_OP_STARTED', op: 'clearOne' });

      try {
        // Match clearWetCourtOp W2 signature: clearWetCourtOp({ backend, getDeviceId, courtId })
        const result = await clearWetCourtOp({ backend, getDeviceId, courtId: court.id });

        if (result.ok) {
          // Remove from list
          dispatch({ type: 'WET_COURT_CLEARED', courtNumber: Number(courtNumber) });

          // Auto-deactivate if now empty (STATE-ONLY, no backend call)
          if (willBeEmpty) {
            dispatch({ type: 'WET_DEACTIVATED' });
          }

          dispatch({ type: 'WET_OP_SUCCEEDED' });

          // Side effects at end of success block
          // Match legacy: Array.from(newWetCourts) where newWetCourts is Set with courtNumber deleted
          const newWetCourts = state.wetCourtNumbers.filter((n) => n !== Number(courtNumber));
          Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: Array.from(newWetCourts) });
          onRefresh();
        } else {
          dispatch({
            type: 'WET_OP_FAILED',
            error: result.message || 'Failed to clear wet court',
          });
        }
      } catch (error) {
        dispatch({ type: 'WET_OP_FAILED', error: error.message });
      }
    },
    [backend, getDeviceId, courts, Events, onRefresh, state.wetCourtNumbers]
  );

  /**
   * Clear all wet courts (but keep mode active)
   * Backend: clearAllWetCourtsOp
   * State: WET_OP_STARTED -> WET_COURTS_CLEARED_ALL -> WET_OP_SUCCEEDED
   *
   * NOTE: Does NOT change isActive (that's WET_DEACTIVATED)
   */
  const clearAllWet = useCallback(async () => {
    dispatch({ type: 'WET_OP_STARTED', op: 'clearAll' });

    try {
      const result = await clearAllWetCourtsOp({ backend, getDeviceId });

      if (result.ok) {
        dispatch({ type: 'WET_COURTS_CLEARED_ALL' });
        dispatch({ type: 'WET_OP_SUCCEEDED' });

        // Side effects at end of success block
        Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: [] });
        onRefresh();
      } else {
        dispatch({
          type: 'WET_OP_FAILED',
          error: result.message || 'Failed to clear all wet courts',
        });
      }
    } catch (error) {
      dispatch({ type: 'WET_OP_FAILED', error: error.message });
    }
  }, [backend, getDeviceId, Events, onRefresh]);

  return {
    // State (spread all reducer state)
    ...state,
    // Derived values (computed, not stored)
    wetCount: state.wetCourtNumbers.length,
    isEmpty: state.wetCourtNumbers.length === 0,
    // API methods
    activateWet,
    deactivateWet,
    clearWetCourt,
    clearAllWet,
  };
}
