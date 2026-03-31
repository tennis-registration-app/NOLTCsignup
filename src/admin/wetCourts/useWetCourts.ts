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

import { useReducer, useCallback, useEffect } from 'react';
import { wetCourtsReducer, initialWetCourtsState } from './wetCourtsReducer';
import {
  activateWetCourtsOp,
  clearAllWetCourtsOp,
  clearWetCourtOp,
} from '../handlers/wetCourtOperations';
import type { TennisBackendShape, CommandResponse } from '../../types/appTypes';

interface Court {
  id?: string;
  number?: number | string;
}

interface EventsModule {
  emitDom: (event: string, data: unknown) => void;
}

interface WetCourtsDeps {
  backend: TennisBackendShape;
  getDeviceId: () => string;
  courts?: Court[];
  Events: EventsModule;
  onRefresh: () => void;
  applyBoardResponse?: (result: CommandResponse & { board?: unknown }) => void;
}

/**
 * @param {Object} deps - External dependencies
 * @param {Object} deps.backend - Backend API
 * @param {Function} deps.getDeviceId - Device ID getter
 * @param {Array} deps.courts - Courts array (for ID lookup)
 * @param {Object} deps.Events - Events module for emitDom
 * @param {Function} deps.onRefresh - Callback to trigger refresh (fallback when no board in response)
 * @param {Function} [deps.applyBoardResponse] - Apply board-in-response data (avoids async refetch)
 */
export function useWetCourts({
  backend,
  getDeviceId,
  courts,
  Events,
  onRefresh,
  applyBoardResponse,
}: WetCourtsDeps) {
  const [state, dispatch] = useReducer(wetCourtsReducer, initialWetCourtsState);

  // Auto-deactivate when all wet courts have been cleared by any method.
  // This covers: individual clears from Court Status, "All Courts Dry" from
  // either screen, or any other path that empties wetCourtNumbers without
  // explicitly dispatching WET_DEACTIVATED.
  useEffect(() => {
    if (state.isActive && state.wetCourtNumbers.length === 0 && !state.isBusy) {
      dispatch({ type: 'WET_DEACTIVATED' });
    }
  }, [state.isActive, state.wetCourtNumbers.length, state.isBusy]);

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
        Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: Array.from(courtNumbers) });
        // Board-in-response: apply synchronously if backend returned board state, else fall back to async refresh
        if (result.board && applyBoardResponse) {
          applyBoardResponse(result);
        } else {
          onRefresh();
        }
        return { success: true };
      } else {
        dispatch({
          type: 'WET_OP_FAILED',
          error: result.message || 'Failed to activate wet courts',
        });
        return { success: false, error: result.message || 'Failed to activate wet courts' };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'WET_OP_FAILED', error: msg });
      return { success: false, error: msg };
    }
  }, [backend, getDeviceId, Events, onRefresh, applyBoardResponse]);

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
        Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: [] });
        // Board-in-response: apply synchronously if backend returned board state, else fall back to async refresh
        if (result.board && applyBoardResponse) {
          applyBoardResponse(result);
        } else {
          onRefresh();
        }
        return { success: true };
      } else {
        dispatch({
          type: 'WET_OP_FAILED',
          error: result.message || 'Failed to deactivate wet courts',
        });
        return { success: false, error: result.message || 'Failed to deactivate wet courts' };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'WET_OP_FAILED', error: msg });
      return { success: false, error: msg };
    }
  }, [backend, getDeviceId, Events, onRefresh, applyBoardResponse]);

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
    async (courtNumber: number) => {
      // Validate court lookup with type coercion
      const court = courts?.find((c: Court) => Number(c.number) === Number(courtNumber));
      if (!court?.id) {
        dispatch({
          type: 'WET_OP_FAILED',
          error: `Court ${courtNumber} not found`,
        });
        return { success: false, error: `Court ${courtNumber} not found` };
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
          const newWetCourts = state.wetCourtNumbers.filter((n) => n !== Number(courtNumber));
          Events.emitDom('tennisDataUpdate', { key: 'wetCourts', data: Array.from(newWetCourts) });
          // Board-in-response: apply synchronously if backend returned board state, else fall back to async refresh
          if (result.board && applyBoardResponse) {
            applyBoardResponse(result);
          } else {
            onRefresh();
          }
          return { success: true };
        } else {
          dispatch({
            type: 'WET_OP_FAILED',
            error: result.message || 'Failed to clear wet court',
          });
          return { success: false, error: result.message };
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'WET_OP_FAILED', error: msg });
        return { success: false, error: msg };
      }
    },
    [backend, getDeviceId, courts, Events, onRefresh, applyBoardResponse, state.wetCourtNumbers]
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
        // Board-in-response: apply synchronously if backend returned board state, else fall back to async refresh
        if (result.board && applyBoardResponse) {
          applyBoardResponse(result);
        } else {
          onRefresh();
        }
        return { success: true };
      } else {
        dispatch({
          type: 'WET_OP_FAILED',
          error: result.message || 'Failed to clear all wet courts',
        });
        return { success: false, error: result.message };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'WET_OP_FAILED', error: msg });
      return { success: false, error: msg };
    }
  }, [backend, getDeviceId, Events, onRefresh, applyBoardResponse]);

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
