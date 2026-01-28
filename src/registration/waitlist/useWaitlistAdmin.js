/**
 * useWaitlistAdmin Hook
 * Orchestrates admin waitlist state + existing op from adminOperations.js
 *
 * Exposes setter-style function to match AdminScreen prop interface.
 */

import { useReducer, useCallback } from 'react';
import { waitlistAdminReducer, initialWaitlistAdminState } from './waitlistAdminReducer.js';
import { handleReorderWaitlistOp } from '../handlers/adminOperations.js';

export function useWaitlistAdmin({ getCourtData, showAlertMessage }) {
  const [state, dispatch] = useReducer(waitlistAdminReducer, initialWaitlistAdminState);

  // Bridge setter for handleReorderWaitlistOp and AdminScreen compatibility
  // Called with: number (start move) or null (cancel/reset)
  const setWaitlistMoveFrom = useCallback((value) => {
    dispatch({ type: 'WAITLIST_MOVE_FROM_SET', value });
  }, []);

  // Reorder handler - calls existing op with bridge setter
  const handleReorderWaitlist = useCallback(
    (fromIndex, toIndex) => {
      return handleReorderWaitlistOp(
        { getCourtData, showAlertMessage, setWaitlistMoveFrom },
        fromIndex,
        toIndex
      );
    },
    [getCourtData, showAlertMessage, setWaitlistMoveFrom]
  );

  return {
    // State
    waitlistMoveFrom: state.waitlistMoveFrom,

    // Setter (for AdminScreen props - called with number or null)
    setWaitlistMoveFrom,

    // Handler
    onReorderWaitlist: handleReorderWaitlist,
  };
}
