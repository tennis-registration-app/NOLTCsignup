import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../lib/logger.js';

/**
 * useMobileFlowController Hook
 * Extracted from App.jsx — WP5.8 Mobile Flow Containment
 *
 * Manages all mobile-specific state, effects, and communication.
 *
 * DEPENDENCY CHECKLIST (parameters required):
 *
 * Required inputs:
 *   - showSuccess: boolean — triggers success signal effect
 *   - justAssignedCourt: number|null — included in success message
 *   - backend: object — service layer for API calls
 *   - isMobile: boolean — API_CONFIG.IS_MOBILE
 *   - toast: function|null — Tennis?.UI?.toast for notifications
 *   - dbg: function — debug logging function
 *   - DEBUG: boolean — debug mode flag
 *
 * Internal state (owned by hook):
 *   - mobileFlow: boolean
 *   - preselectedCourt: number|null
 *   - mobileMode: string|null
 *   - mobileCountdown: number
 *   - checkingLocation: boolean
 *   - locationToken: string|null
 *   - showQRScanner: boolean
 *   - gpsFailedPrompt: boolean
 *
 * Effects (owned by hook):
 *   - Message listener (handles register, assign-from-waitlist)
 *   - Success signal + countdown (sends registration:success postMessage)
 *
 * BEHAVIOR MUST REMAIN IDENTICAL TO ORIGINAL App.jsx IMPLEMENTATION.
 * No "improvements" or "cleanups" — verbatim logic transfer.
 *
 * @param {Object} deps
 * @param {boolean} deps.showSuccess
 * @param {number|null} deps.justAssignedCourt
 * @param {Object} deps.backend
 * @param {boolean} deps.isMobile
 * @param {Function|null} deps.toast
 * @param {Function} deps.dbg
 * @param {boolean} deps.DEBUG
 */
export function useMobileFlowController({
  showSuccess,
  justAssignedCourt,
  backend,
  isMobile,
  toast,
  dbg,
  DEBUG,
}) {
  // ===== STATE (8 variables) =====
  const [mobileFlow, setMobileFlow] = useState(false);
  const [preselectedCourt, setPreselectedCourt] = useState(null);
  const [mobileMode, setMobileMode] = useState(null);
  const [mobileCountdown, setMobileCountdown] = useState(5);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [locationToken, setLocationToken] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [gpsFailedPrompt, setGpsFailedPrompt] = useState(false);

  // ===== FUNCTIONS =====

  /**
   * Get mobile geolocation or location token from QR scan.
   * Returns { latitude, longitude } or { location_token } or null if unavailable/not mobile
   * If GPS fails but we have a location token from QR scan, use that instead
   */
  const getMobileGeolocation = useCallback(async () => {
    // Only needed for mobile device type
    if (!isMobile) {
      return null;
    }

    // If we have a location token from QR scan, use that
    if (locationToken) {
      logger.debug('MobileFlow', 'Using location token instead of GPS');
      return { location_token: locationToken };
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        logger.warn('MobileFlow', 'Geolocation not available');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          logger.warn('MobileFlow', 'Geolocation error', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, [isMobile, locationToken]);

  /**
   * Send resetRegistration postMessage to parent window.
   * Used when closing overlay or navigating back in mobile flow.
   */
  const requestMobileReset = useCallback(() => {
    if (window.top !== window.self) {
      window.parent.postMessage({ type: 'resetRegistration' }, '*');
    }
  }, []);

  /**
   * Handle QR scan token - sets token, closes scanner, clears prompt, shows toast.
   * Preserves exact original behavior from App.jsx.
   */
  const onQRScanToken = useCallback(
    (token) => {
      logger.debug('MobileFlow', 'QR token scanned', token);
      setLocationToken(token);
      setShowQRScanner(false);
      setGpsFailedPrompt(false);
      toast?.('Location verified! You can now register.', { type: 'success' });
    },
    [toast]
  );

  /**
   * Handle QR scanner close without scan.
   */
  const onQRScannerClose = useCallback(() => {
    setShowQRScanner(false);
  }, []);

  /**
   * Open QR scanner.
   */
  const openQRScanner = useCallback(() => {
    setShowQRScanner(true);
  }, []);

  /**
   * Dismiss GPS failed prompt.
   */
  const dismissGpsPrompt = useCallback(() => {
    setGpsFailedPrompt(false);
  }, []);

  // ===== EFFECTS =====

  // Mobile: Listen for messages from parent window
  useEffect(() => {
    const handleMessage = async (event) => {
      const { type, courtNumber, waitlistEntryId } = event.data || {};

      if (type === 'register') {
        dbg('Registration: Received register message', { courtNumber });
        // Set mobile flow state
        if (courtNumber) {
          setPreselectedCourt(courtNumber);
        }
        setMobileFlow(true);
        if (courtNumber) {
          setPreselectedCourt(courtNumber);
        }
      }

      if (type === 'assign-from-waitlist') {
        dbg('Registration: Received assign-from-waitlist message', {
          waitlistEntryId,
          courtNumber,
        });
        // Silent assignment mode - will auto-assign when court available
        setMobileFlow(true);
        setMobileMode('silent-assign');

        // Attempt immediate assignment
        try {
          const result = await backend.commands.assignFromWaitlist({
            waitlistEntryId,
            courtNumber,
          });

          if (result.ok) {
            dbg('Registration: Silent assignment successful');
            // Success will be handled by the success effect
          } else {
            logger.error('MobileFlow', 'Waitlist assignment failed', {
              code: result.code,
              message: result.message,
            });
            toast?.(result.message || 'Could not assign court', { type: 'error' });

            // Clear silent-assign mode and close overlay on failure
            setMobileMode(null);
            window.parent.postMessage({ type: 'resetRegistration' }, '*');
          }
        } catch (error) {
          logger.error('MobileFlow', 'Error assigning from waitlist', error);
          toast?.('Error assigning court', { type: 'error' });

          // Clear silent-assign mode and close overlay on error
          setMobileMode(null);
          window.parent.postMessage({ type: 'resetRegistration' }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile: Watch for success state changes and send signal
  useEffect(() => {
    if (showSuccess && mobileFlow && window.top !== window.self) {
      dbg('Registration: Success state changed to true, sending mobile signal');
      const courtNumber = preselectedCourt || justAssignedCourt || null;
      dbg('Registration: Court number for success:', courtNumber);
      try {
        window.parent.postMessage({ type: 'registration:success', courtNumber: courtNumber }, '*');
        dbg('Registration: Direct success message sent');
      } catch (e) {
        if (DEBUG) logger.debug('MobileFlow', 'Error in direct success message', e);
      }

      // Start countdown for mobile (synced with Mobile.html 8 second dismiss)
      setMobileCountdown(8);
      const countdownInterval = setInterval(() => {
        setMobileCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [showSuccess, justAssignedCourt, mobileFlow, preselectedCourt, dbg, DEBUG]);

  // ===== RETURN =====
  return {
    // State
    mobileFlow,
    preselectedCourt,
    mobileMode,
    mobileCountdown,
    checkingLocation,
    locationToken,
    showQRScanner,
    gpsFailedPrompt,

    // Setters (exported for orchestrator deps and external use)
    setMobileFlow,
    setPreselectedCourt,
    setMobileMode,
    setCheckingLocation,
    setLocationToken,
    setShowQRScanner,
    setGpsFailedPrompt,

    // Functions
    getMobileGeolocation,
    requestMobileReset,
    onQRScanToken,
    onQRScannerClose,
    openQRScanner,
    dismissGpsPrompt,
  };
}
