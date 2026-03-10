/**
 * WetCourts Reducer
 * Pure state transitions for wet-courts subsystem.
 * NO side effects (no backend, no Events, no onRefresh).
 */

type BusyOp = 'activate' | 'deactivate' | 'clearOne' | 'clearAll';

export interface WetCourtsState {
  isActive: boolean;
  wetCourtNumbers: number[];
  suspendedBlocks: unknown[];
  isBusy: boolean;
  busyOp: BusyOp | null;
  error: string | null;
}

type WetCourtsAction =
  | { type: 'WET_OP_STARTED'; op: BusyOp }
  | { type: 'WET_OP_SUCCEEDED' }
  | { type: 'WET_OP_FAILED'; error: string }
  | { type: 'WET_ACTIVATED'; courtNumbers?: number[]; suspendedBlocks?: unknown[] }
  | { type: 'WET_DEACTIVATED' }
  | { type: 'WET_COURT_CLEARED'; courtNumber: number }
  | { type: 'WET_COURTS_CLEARED_ALL' };

/**
 * Normalize court numbers: unique + sorted ascending
 */
function normalizeCourtNumbers(courtNumbers: number[]): number[] {
  return [...new Set(courtNumbers)].sort((a, b) => a - b);
}

export const initialWetCourtsState: WetCourtsState = {
  isActive: false,
  wetCourtNumbers: [],
  suspendedBlocks: [],
  isBusy: false,
  busyOp: null,
  error: null,
};

export function wetCourtsReducer(state: WetCourtsState, action: WetCourtsAction): WetCourtsState {
  switch (action.type) {
    case 'WET_OP_STARTED':
      // Sets isBusy, busyOp, clears error
      return {
        ...state,
        isBusy: true,
        busyOp: action.op,
        error: null,
      };

    case 'WET_OP_SUCCEEDED':
      // Clears isBusy, busyOp, error
      return {
        ...state,
        isBusy: false,
        busyOp: null,
        error: null,
      };

    case 'WET_OP_FAILED':
      // Clears isBusy, busyOp, sets error
      return {
        ...state,
        isBusy: false,
        busyOp: null,
        error: action.error,
      };

    case 'WET_ACTIVATED':
      // Sets isActive, wetCourtNumbers (normalized), optionally suspendedBlocks
      return {
        ...state,
        isActive: true,
        wetCourtNumbers: normalizeCourtNumbers(action.courtNumbers || []),
        suspendedBlocks: action.suspendedBlocks || state.suspendedBlocks,
      };

    case 'WET_DEACTIVATED':
      // Clears everything - full reset
      return {
        ...state,
        isActive: false,
        wetCourtNumbers: [],
        suspendedBlocks: [],
      };

    case 'WET_COURT_CLEARED':
      // Removes single court, normalizes, does NOT change isActive
      return {
        ...state,
        wetCourtNumbers: normalizeCourtNumbers(
          state.wetCourtNumbers.filter((n) => n !== action.courtNumber)
        ),
      };

    case 'WET_COURTS_CLEARED_ALL':
      // Empties list, does NOT change isActive
      return {
        ...state,
        wetCourtNumbers: [],
      };

    default:
      return state;
  }
}
