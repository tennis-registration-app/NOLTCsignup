import { useState, useCallback } from 'react';
import { TENNIS_CONFIG } from '@lib';
import { logger } from '../../../lib/logger.js';

/**
 * useRegistrationUiState
 * Extracted from useRegistrationAppState
 *
 * Owns all UI state declarations (useState) for the registration flow.
 * Verbatim extraction, no logic changes.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.CONSTANTS - App constants (defined in main hook)
 */
export function useRegistrationUiState({ CONSTANTS: _CONSTANTS }) {
  // ===== NAVIGATION STATE =====
  const [currentScreen, _setCurrentScreen] = useState('home');

  // VERBATIM COPY: setCurrentScreen wrapper from lines ~151-156
  const setCurrentScreen = useCallback(
    (screen, source = 'unknown') => {
      logger.info('NAV', `${currentScreen} → ${screen} (from: ${source})`);
      logger.debug('NAV', 'Stack trace');
      _setCurrentScreen(screen);
    },
    [currentScreen]
  );

  // ===== CORE DATA STATE =====
  const [data, setData] = useState(() => ({
    courts: Array(TENNIS_CONFIG.COURTS.TOTAL_COUNT).fill(null),
    waitlist: [],
    blocks: [],
    upcomingBlocks: null,
    recentlyCleared: [],
  }));

  // ===== COURT/AVAILABILITY STATE =====
  const [availableCourts, setAvailableCourts] = useState([]);
  const [operatingHours, setOperatingHours] = useState(null);

  // ===== SUCCESS STATE =====
  const [showSuccess, setShowSuccess] = useState(false);

  // ===== UI FLAGS =====
  const [, setLastActivity] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [, setIsUserTyping] = useState(false);

  // ===== ADMIN STATE =====
  const [courtToMove, setCourtToMove] = useState(null);
  const [ballPriceInput, setBallPriceInput] = useState('');
  const [ballPriceCents, setBallPriceCents] = useState(TENNIS_CONFIG.PRICING.TENNIS_BALLS * 100);

  return {
    // State values (shell-owned only — workflow fields moved to WorkflowProvider)
    data,
    currentScreen,
    availableCourts,
    operatingHours,
    showSuccess,
    currentTime,
    courtToMove,
    ballPriceInput,
    ballPriceCents,

    // Setters (shell-owned only)
    setData,
    setCurrentScreen,
    setAvailableCourts,
    setOperatingHours,
    setShowSuccess,
    setLastActivity,
    setCurrentTime,
    setCourtToMove,
    setBallPriceInput,
    setBallPriceCents,
    setIsUserTyping,
  };
}
