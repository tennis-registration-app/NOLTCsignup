import { useState, useCallback } from 'react';
import { TENNIS_CONFIG } from '@lib';

/**
 * useRegistrationUiState
 * Extracted from useRegistrationAppState — WP5.9.6.1
 *
 * Owns all UI state declarations (useState) for the registration flow.
 * Verbatim extraction, no logic changes.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.CONSTANTS - App constants (defined in main hook)
 */
export function useRegistrationUiState({ CONSTANTS }) {
  // ===== NAVIGATION STATE =====
  const [currentScreen, _setCurrentScreen] = useState('home');

  // VERBATIM COPY: setCurrentScreen wrapper from lines ~151-156
  const setCurrentScreen = useCallback(
    (screen, source = 'unknown') => {
      console.log(`[NAV] ${currentScreen} → ${screen} (from: ${source})`);
      console.trace('[NAV] Stack trace');
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
  const [waitlistPosition, setWaitlistPosition] = useState(0);
  const [operatingHours, setOperatingHours] = useState(null);

  // ===== SUCCESS/ASSIGNMENT STATE =====
  const [showSuccess, setShowSuccess] = useState(false);
  const [replacedGroup, setReplacedGroup] = useState(null);
  const [displacement, setDisplacement] = useState(null);
  const [originalCourtData, setOriginalCourtData] = useState(null);

  // ===== COURT CHANGE STATE =====
  const [canChangeCourt, setCanChangeCourt] = useState(false);
  const [changeTimeRemaining, setChangeTimeRemaining] = useState(
    CONSTANTS.CHANGE_COURT_TIMEOUT_SEC
  );
  const [isChangingCourt, setIsChangingCourt] = useState(false);
  const [, setWasOvertimeCourt] = useState(false);

  // ===== TIME LIMIT STATE =====
  const [isTimeLimited, setIsTimeLimited] = useState(false);
  const [timeLimitReason, setTimeLimitReason] = useState(null);

  // ===== UI FLAGS =====
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [, setLastActivity] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [, setIsUserTyping] = useState(false);

  // ===== ADMIN STATE =====
  const [courtToMove, setCourtToMove] = useState(null);
  const [ballPriceInput, setBallPriceInput] = useState('');
  const [ballPriceCents, setBallPriceCents] = useState(TENNIS_CONFIG.PRICING.TENNIS_BALLS * 100);

  // ===== WAITLIST CTA STATE =====
  const [hasWaitlistPriority, setHasWaitlistPriority] = useState(false);
  const [currentWaitlistEntryId, setCurrentWaitlistEntryId] = useState(null);

  // ===== ASYNC OPERATION FLAGS =====
  const [isAssigning, setIsAssigning] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);

  return {
    // State values
    data,
    currentScreen,
    availableCourts,
    waitlistPosition,
    operatingHours,
    showSuccess,
    replacedGroup,
    displacement,
    originalCourtData,
    canChangeCourt,
    changeTimeRemaining,
    isTimeLimited,
    timeLimitReason,
    showAddPlayer,
    isChangingCourt,
    currentTime,
    courtToMove,
    hasWaitlistPriority,
    currentWaitlistEntryId,
    isAssigning,
    isJoiningWaitlist,
    ballPriceInput,
    ballPriceCents,

    // Setters
    setData,
    setCurrentScreen,
    setAvailableCourts,
    setWaitlistPosition,
    setOperatingHours,
    setShowSuccess,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setCanChangeCourt,
    setChangeTimeRemaining,
    setIsTimeLimited,
    setTimeLimitReason,
    setShowAddPlayer,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setLastActivity,
    setCurrentTime,
    setCourtToMove,
    setHasWaitlistPriority,
    setCurrentWaitlistEntryId,
    setIsAssigning,
    setIsJoiningWaitlist,
    setBallPriceInput,
    setBallPriceCents,
    setIsUserTyping,
  };
}
