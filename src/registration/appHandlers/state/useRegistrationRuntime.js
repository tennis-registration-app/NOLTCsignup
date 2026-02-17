import { useEffect, useRef } from 'react';
import { normalizeSettings } from '../../../lib/normalize/index.js';

/**
 * useRegistrationRuntime
 * Extracted from useRegistrationAppState
 *
 * Owns runtime effects: timer cleanups, CSS optimizations, time interval.
 * Verbatim extraction, no logic changes.
 */
export function useRegistrationRuntime({
  // Setters needed by effects
  setCurrentTime,
  setBallPriceCents,
  setBlockWarningMinutes,
  // State reads needed by effects
  availableCourts,
  // Services
  backend,
}) {
  // ===== REFS =====
  const successResetTimerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ===== EFFECTS =====

  // VERBATIM COPY: Debug availableCourts (line 663)
  useEffect(() => {
    console.log('🔄 availableCourts state changed:', availableCourts);
  }, [availableCourts]);

  // VERBATIM COPY: Cleanup success reset timer on unmount (line 668)
  useEffect(() => {
    return () => {
      if (successResetTimerRef.current) {
        clearTimeout(successResetTimerRef.current);
        successResetTimerRef.current = null;
      }
    };
  }, []);

  // VERBATIM COPY: Fetch ball price from API on mount (line 678)
  // Normalize settings at boundary
  useEffect(() => {
    const fetchBallPrice = async () => {
      try {
        const result = await backend.admin.getSettings();
        if (result.ok) {
          const settings = normalizeSettings(result.settings);
          if (settings?.ballPriceCents) {
            setBallPriceCents(settings.ballPriceCents);
          }
          if (settings?.blockWarningMinutes) {
            const blockWarnMin = parseInt(settings.blockWarningMinutes, 10);
            if (blockWarnMin > 0) {
              setBlockWarningMinutes(blockWarnMin);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load ball price from API:', error);
      }
    };
    fetchBallPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: fetch ball price once on init
  }, []);

  // VERBATIM COPY: CSS Performance Optimizations (line 750)
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .animate-pulse {
        will-change: opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      .animate-spin {
        will-change: transform;
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      .transform {
        transition: transform 200ms ease-out;
        will-change: transform;
      }
      .transition-all {
        transition: none !important;
      }
      .court-transition {
        transition: background-color 200ms ease-out,
                    border-color 200ms ease-out,
                    box-shadow 200ms ease-out;
      }
      .button-transition {
        transition: background-color 150ms ease-out,
                    transform 150ms ease-out;
        transform: translateZ(0);
      }
      .button-transition:hover {
        will-change: transform;
      }
      .backdrop-blur {
        transform: translateZ(0);
        will-change: backdrop-filter;
      }
      @media (prefers-reduced-motion: reduce) {
        .animate-pulse {
          animation: none;
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // VERBATIM COPY: Update current time every second (line 825)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [setCurrentTime]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    const timeoutId = typingTimeoutRef.current;
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return {
    // Refs (needed by handlers)
    successResetTimerRef,
    typingTimeoutRef,
  };
}
