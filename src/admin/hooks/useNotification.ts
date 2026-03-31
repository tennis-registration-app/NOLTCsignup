/**
 * @fileoverview React hook for notification state management.
 * Thin wrapper around notificationLogic.js controller.
 */

import { useState, useMemo } from 'react';
import { addTimer } from '../utils/timerRegistry';
import { createShowNotification } from './notificationLogic';

/**
 * Hook for managing notification state and display.
 *
 * @returns {{ notification: Object|null, showNotification: Function }}
 */
export function useNotification() {
  interface NotificationState { message: string; type: string; }
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Create stable showNotification function
  // useMemo ensures same function identity across renders
  const showNotification = useMemo(
    () =>
      createShowNotification({
        setNotification,
        addTimer,
        timeoutMs: 3000,
      }),
    [] // setNotification is stable, addTimer is module-level
  );

  return {
    notification,
    showNotification,
  };
}

export default useNotification;
