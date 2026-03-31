/**
 * useWaitlistAdmin Hook
 * Orchestrates admin waitlist state + existing op from adminOperations.js
 *
 * Exposes setter-style function to match AdminScreen prop interface.
 */

import { useReducer, useCallback } from 'react';
import { waitlistAdminReducer, initialWaitlistAdminState } from './waitlistAdminReducer';
import { handleReorderWaitlistOp } from '../handlers/adminOperations.js';

export function useWaitlistAdmin({ getCourtData, showAlertMessage, backend }: { getCourtData: () => { waitlist: { id?: string; group?: { id?: string } }[] }; showAlertMessage: (msg: string) => void; backend: import('../../types/appTypes').TennisBackendShape }) {
  const [state, dispatch] = useReducer(waitlistAdminReducer, initialWaitlistAdminState);

  // Bridge setter for handleReorderWaitlistOp and AdminScreen compatibility
  // Called with: number (start move) or null (cancel/reset)
  const setWaitlistMoveFrom = useCallback((value: number | null) => {
    dispatch({ type: 'WAITLIST_MOVE_FROM_SET', value });
  }, []);

  // Reorder handler - calls existing op with bridge setter
  const handleReorderWaitlist = useCallback(
    (fromIndex: number, toIndex: number) => {
      return handleReorderWaitlistOp(
        { getCourtData, showAlertMessage, setWaitlistMoveFrom, backend },
        fromIndex,
        toIndex
      );
    },
    [getCourtData, showAlertMessage, setWaitlistMoveFrom, backend]
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
