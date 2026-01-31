/**
 * WetCourts Reducer
 * Pure state transitions for wet-courts subsystem.
 * NO side effects (no backend, no Events, no onRefresh).
 */

// Initial state
export const initialWetCourtsState = {
  isActive: false,
  wetCourtNumbers: [], // Always sorted array of unique integers
  suspendedBlocks: [], // Snapshot at activation, cleared on deactivate
  isBusy: false,
  busyOp: null, // 'activate' | 'deactivate' | 'clearOne' | 'clearAll'
  error: null,
};

/**
 * Normalize court numbers: unique + sorted ascending
 * @param {number[]} courtNumbers
 * @returns {number[]}
 */
function normalizeCourtNumbers(courtNumbers) {
  return [...new Set(courtNumbers)].sort((a, b) => a - b);
}

/**
 * WetCourts Reducer
 * @param {typeof initialWetCourtsState} state
 * @param {Object} action
 * @returns {typeof initialWetCourtsState}
 */
export function wetCourtsReducer(state, action) {
  switch (action.type) {
    case 'WET_OP_STARTED':
      // Sets isBusy, busyOp, clears error
      return {
        ...state,
        isBusy: true,
        busyOp: action.op, // 'activate' | 'deactivate' | 'clearOne' | 'clearAll'
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
