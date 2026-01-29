import { useState, useRef, useEffect, useCallback } from 'react';
import { TENNIS_CONFIG } from '@lib';

/**
 * useSessionTimeout Hook
 * Extracted from App.jsx — WP5.7 Timeout System Containment
 *
 * Manages the inactivity timeout system for the group management screen.
 * Shows a warning before timeout, then triggers the exit sequence.
 *
 * DEPENDENCY CHECKLIST (parameters required):
 *
 * Required inputs:
 *   - currentScreen: string — which screen is active (timers only run on 'group')
 *   - setLastActivity: (timestamp: number) => void — records activity timestamp
 *   - showAlertMessage: (message: string) => void — displays timeout alert
 *   - onTimeout: () => void — called when session times out (applyInactivityTimeoutExitSequence)
 *
 * Internal state (owned by hook):
 *   - showTimeoutWarning: boolean
 *   - timeoutTimerRef: ref
 *   - warningTimerRef: ref
 *
 * Output:
 *   - showTimeoutWarning: boolean — for UI rendering
 *
 * Behavior (preserved exactly from App.jsx):
 *   - Timers only active when currentScreen === 'group'
 *   - Warning appears after SESSION_WARNING_MS
 *   - Timeout fires after SESSION_TIMEOUT_MS
 *   - Activity (click/touchstart/keypress) resets timers
 *   - Timers cleared on screen change or unmount
 *
 * @param {Object} deps
 * @param {string} deps.currentScreen
 * @param {Function} deps.setLastActivity
 * @param {Function} deps.showAlertMessage
 * @param {Function} deps.onTimeout
 * @returns {{ showTimeoutWarning: boolean }}
 */
export function useSessionTimeout({ currentScreen, setLastActivity, showAlertMessage, onTimeout }) {
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const timeoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  // Activity handler — resets timers and warning state
  // Not exposed; used internally and by event listeners
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowTimeoutWarning(false);

    // Clear and restart timers when there's activity
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    if (currentScreen === 'group') {
      // Set warning timer
      warningTimerRef.current = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, TENNIS_CONFIG.TIMING.SESSION_WARNING_MS);

      // Set timeout timer
      timeoutTimerRef.current = setTimeout(() => {
        showAlertMessage('Session timed out due to inactivity');
        onTimeout();
      }, TENNIS_CONFIG.TIMING.SESSION_TIMEOUT_MS);
    }
  }, [currentScreen, setLastActivity, showAlertMessage, onTimeout]);

  // Setup timeout for group management screen
  useEffect(() => {
    if (currentScreen === 'group') {
      // Initial setup of timers when entering group screen
      updateActivity();

      // Add activity listeners
      const handleActivity = () => updateActivity();
      window.addEventListener('click', handleActivity);
      window.addEventListener('touchstart', handleActivity);
      window.addEventListener('keypress', handleActivity);

      return () => {
        // Cleanup
        if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
        window.removeEventListener('keypress', handleActivity);
      };
    } else {
      // Clear timers when leaving group screen
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match original: only depend on currentScreen
  }, [currentScreen]);

  return { showTimeoutWarning };
}
