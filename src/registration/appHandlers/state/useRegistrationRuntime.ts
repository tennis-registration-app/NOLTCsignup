import { useEffect, useRef } from 'react';
import type { TennisBackendShape } from '../../../types/appTypes';
import { normalizeSettings } from '../../../lib/normalize/index';
import { logger } from '../../../lib/logger';

/**
 * useRegistrationRuntime
 * Extracted from useRegistrationAppState
 *
 * Owns runtime effects: timer cleanups, CSS optimizations, time interval.
 * Verbatim extraction, no logic changes.
 */
interface UseRegistrationRuntimeDeps {
  setCurrentTime: (time: Date) => void;
  setBallPriceCents: (cents: number) => void;
  setBlockWarningMinutes: (minutes: number) => void;
  availableCourts: number[];
  backend: TennisBackendShape;
}

export function useRegistrationRuntime({
  // Setters needed by effects
  setCurrentTime,
  setBallPriceCents,
  setBlockWarningMinutes,
  // State reads needed by effects
  availableCourts,
  // Services
  backend,
}: UseRegistrationRuntimeDeps) {
  // ===== REFS =====
  const successResetTimerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const changeCourtTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ===== EFFECTS =====

  // VERBATIM COPY: Debug availableCourts (line 663)
  useEffect(() => {
    logger.debug('RegistrationRuntime', 'availableCourts state changed', availableCourts);
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

  // Fetch ball price + block-warning minutes from API on mount.
  // Normalize settings at boundary.
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await backend.admin.getSettings();
        if (!result.ok) {
          logger.warn('RegistrationRuntime', 'getSettings returned ok:false', {
            code: (result as { code?: string }).code,
            message: (result as { message?: string }).message,
          });
          return;
        }
        const settings = normalizeSettings(result.settings);
        if (settings?.ballPriceCents) {
          setBallPriceCents(settings.ballPriceCents as number);
        }
        if (settings?.blockWarningMinutes) {
          const blockWarnMin = parseInt(settings.blockWarningMinutes as string, 10);
          if (blockWarnMin > 0) {
            setBlockWarningMinutes(blockWarnMin);
          }
        }
      } catch (error) {
        logger.error('RegistrationRuntime', 'Failed to load settings from API', error);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: fetch settings once on init
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
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup change-court countdown interval on unmount
  // (fire-and-forget timer started by directAssignment branch; kiosk may run for weeks)
  useEffect(() => {
    return () => {
      if (changeCourtTimerRef.current) {
        clearInterval(changeCourtTimerRef.current);
        changeCourtTimerRef.current = null;
      }
    };
  }, []);

  return {
    // Refs (needed by handlers)
    successResetTimerRef,
    typingTimeoutRef,
    changeCourtTimerRef,
  };
}
