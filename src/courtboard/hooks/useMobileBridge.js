import { useState, useEffect } from 'react';
import { logger } from '../../lib/logger.js';
import { getRefreshBoard } from '../../platform/windowBridge.js';

/**
 * Listens for postMessage events from MobileBridge and
 * maintains mobile-specific state (registeredCourt, waitlistEntryId).
 */
export function useMobileBridge() {
  const [mobileState, setMobileState] = useState(() => ({
    registeredCourt: sessionStorage.getItem('mobile-registered-court'),
    waitlistEntryId: sessionStorage.getItem('mobile-waitlist-entry-id'),
  }));

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'mobile:state-updated') {
        logger.debug('CourtDisplay', 'Mobile state updated', event.data.payload);
        setMobileState(event.data.payload);
      } else if (event.data?.type === 'refresh-board') {
        logger.debug('CourtDisplay', 'Refresh board requested');
        // The mobileState update from MobileBridge.broadcastState() will trigger
        // the waitlist-available useEffect, but we can also manually trigger a refresh
        const refreshBoard = getRefreshBoard();
        if (refreshBoard) {
          refreshBoard();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return mobileState;
}
