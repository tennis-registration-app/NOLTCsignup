import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Import shared utilities from @lib
import {
  STORAGE as STORAGE_SHARED,
  readJSON as _sharedReadJSON,
  getEmptyData as _sharedGetEmptyData,
  getCourtBlockStatus as _sharedGetCourtBlockStatus,
  TENNIS_CONFIG as _sharedTennisConfig,
  TennisBusinessLogic,
} from '@lib';

// Import API config for mobile detection
import { API_CONFIG } from '../../lib/apiConfig.js';

// Import Domain engagement helpers
import { findEngagementByMemberId, getEngagementMessage } from '../../lib/domain/engagement.js';

// Import API Backend Integration
import { getTennisService } from '../services/index.js';

// TennisBackend interface layer
import { createBackend } from '../backend/index.js';

// Overtime eligibility policy
import { computeRegistrationCourtSelection } from '../../shared/courts/overtimeEligibility.js';

// Alert display hook (WP5.6 R6a-1)
import { useAlertDisplay } from '../ui/alert';

// Admin price feedback hook (WP5.6 R6a-2)
import { useAdminPriceFeedback } from '../ui/adminPriceFeedback';

// Guest counter hook (WP5.6 R6a-3)
import { useGuestCounter } from '../ui/guestCounter';

// Session timeout hook (WP5.7)
import { useSessionTimeout } from '../ui/timeout';

// Mobile flow controller hook (WP5.8)
import { useMobileFlowController } from '../ui/mobile';

// Member search hook (WP5.3 R5a.3)
import { useMemberSearch } from '../search/useMemberSearch.js';

// Court assignment result hook (WP5.4 R9a-1.3)
import { useCourtAssignmentResult } from '../court/useCourtAssignmentResult';

// Clear court flow hook (WP5.4 R9a-2.3)
import { useClearCourtFlow } from '../court/useClearCourtFlow';

// Block admin hook (WP5.3 R3.3)
import { useBlockAdmin } from '../blocks/useBlockAdmin';

// Waitlist admin hook (WP5.3 R4a.3)
import { useWaitlistAdmin } from '../waitlist/useWaitlistAdmin';

// Group/Guest hook (WP5.3 R8a.3)
import { useGroupGuest } from '../group/useGroupGuest';

// Streak hook (WP5.3 R8c.3)
import { useStreak } from '../streak/useStreak';

// Member identity hook (WP5.3 R8b.3)
import { useMemberIdentity } from '../memberIdentity/useMemberIdentity';

// Orchestration facade (WP5.5)
import {
  applyInactivityTimeoutOrchestrated,
  changeCourtOrchestrated,
  resetFormOrchestrated,
  handleSuggestionClickOrchestrated,
  handleAddPlayerSuggestionClickOrchestrated,
  sendGroupToWaitlistOrchestrated,
  assignCourtToGroupOrchestrated,
} from '../orchestration';

// Config
const TENNIS_CONFIG = _sharedTennisConfig;
const getCourtBlockStatus = _sharedGetCourtBlockStatus;

// Debug utilities
const DEBUG = false;
const dbg = (...args) => {
  if (DEBUG) console.log(...args);
};

// DataStore reference
let dataStore = null;
if (typeof window !== 'undefined') {
  dataStore = window.Tennis?.DataStore || null;
}

// TennisBackend singleton instance
const backend = createBackend();

/**
 * useRegistrationAppState
 * Extracted from App.jsx — WP5.9.4
 *
 * Contains all state, effects, and hook initialization for the registration app.
 * This is the main state management hook that orchestrates all other hooks.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.isMobileView - Whether the app is in mobile view mode
 * @returns {Object} - All state, setters, refs, derived values, helpers, and hook results
 */
export function useRegistrationAppState({ isMobileView = false } = {}) {
  // ===== CONSTANTS =====
  const CONSTANTS = {
    ADMIN_CODE: TENNIS_CONFIG.ADMIN.ACCESS_CODE,
    MAX_PLAYERS: TENNIS_CONFIG.PLAYERS.MAX_PER_GROUP,
    MAX_PLAY_DURATION_MS: TENNIS_CONFIG.TIMING.MAX_PLAY_DURATION_MS,
    MAX_PLAY_DURATION_MIN: TENNIS_CONFIG.TIMING.MAX_PLAY_DURATION_MIN,
    TIMEOUT_WARNING_MIN: TENNIS_CONFIG.TIMING.TIMEOUT_WARNING_MIN,
    SESSION_TIMEOUT_MS: TENNIS_CONFIG.TIMING.SESSION_TIMEOUT_MS,
    SESSION_WARNING_MS: TENNIS_CONFIG.TIMING.SESSION_WARNING_MS,
    COURT_COUNT: TENNIS_CONFIG.COURTS.TOTAL_COUNT,
    CHANGE_COURT_TIMEOUT_SEC: TENNIS_CONFIG.TIMING.CHANGE_COURT_TIMEOUT_SEC,
    AUTO_RESET_SUCCESS_MS: TENNIS_CONFIG.TIMING.AUTO_RESET_SUCCESS_MS,
    ALERT_DISPLAY_MS: TENNIS_CONFIG.TIMING.ALERT_DISPLAY_MS,
    AUTO_RESET_CLEAR_MS: TENNIS_CONFIG.TIMING.AUTO_RESET_CLEAR_MS,
    DURATIONS: {
      SINGLES_MIN: TENNIS_CONFIG.TIMING.SINGLES_DURATION_MIN,
      DOUBLES_MIN: TENNIS_CONFIG.TIMING.DOUBLES_DURATION_MIN,
    },
    MEMBER_COUNT: 40,
    MEMBER_ID_START: 1000,
    MAX_AUTOCOMPLETE_RESULTS: TENNIS_CONFIG.DISPLAY.MAX_AUTOCOMPLETE_RESULTS,
    MAX_FREQUENT_PARTNERS: TENNIS_CONFIG.DISPLAY.MAX_FREQUENT_PARTNERS,
    MAX_WAITING_DISPLAY: TENNIS_CONFIG.DISPLAY.MAX_WAITING_DISPLAY,
    AVG_GAME_TIME_MIN: TENNIS_CONFIG.TIMING.AVG_GAME_TIME_MIN,
    POLL_INTERVAL_MS: TENNIS_CONFIG.TIMING.POLL_INTERVAL_MS,
    UPDATE_INTERVAL_MS: TENNIS_CONFIG.TIMING.UPDATE_INTERVAL_MS,
  };

  // ===== REFS =====
  const successResetTimerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ===== CORE STATE =====
  const [data, setData] = useState(() => ({
    courts: Array(TENNIS_CONFIG.COURTS.TOTAL_COUNT).fill(null),
    waitlist: [],
    blocks: [],
    upcomingBlocks: [],
    recentlyCleared: [],
  }));

  const [currentScreen, _setCurrentScreen] = useState('home');
  const setCurrentScreen = (screen, source = 'unknown') => {
    console.log(`[NAV] ${currentScreen} → ${screen} (from: ${source})`);
    console.trace('[NAV] Stack trace');
    _setCurrentScreen(screen);
  };

  const [availableCourts, setAvailableCourts] = useState([]);
  const [waitlistPosition, setWaitlistPosition] = useState(0);
  const [operatingHours, setOperatingHours] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [replacedGroup, setReplacedGroup] = useState(null);
  const [displacement, setDisplacement] = useState(null);
  const [originalCourtData, setOriginalCourtData] = useState(null);
  const [canChangeCourt, setCanChangeCourt] = useState(false);
  const [changeTimeRemaining, setChangeTimeRemaining] = useState(
    CONSTANTS.CHANGE_COURT_TIMEOUT_SEC
  );
  const [isTimeLimited, setIsTimeLimited] = useState(false);
  const [timeLimitReason, setTimeLimitReason] = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [isChangingCourt, setIsChangingCourt] = useState(false);
  const [, setWasOvertimeCourt] = useState(false);
  const [, setLastActivity] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [courtToMove, setCourtToMove] = useState(null);
  const [hasWaitlistPriority, setHasWaitlistPriority] = useState(false);
  const [currentWaitlistEntryId, setCurrentWaitlistEntryId] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [ballPriceInput, setBallPriceInput] = useState('');
  const [ballPriceCents, setBallPriceCents] = useState(TENNIS_CONFIG.PRICING.TENNIS_BALLS * 100);
  const [, setIsUserTyping] = useState(false);

  // ===== HELPER FUNCTIONS (defined before hooks that need them) =====

  // Get court data (synchronous for React renders)
  const getCourtData = () => {
    return data;
  };

  // Clear any pending success reset timer
  const clearSuccessResetTimer = () => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
      successResetTimerRef.current = null;
    }
  };

  // Mark user as typing (for timeout handling)
  const markUserTyping = () => {
    setIsUserTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 3000);
  };

  // Get the API data service
  const getDataService = useCallback(() => {
    return getTennisService({
      deviceId: 'a0000000-0000-0000-0000-000000000001',
      deviceType: 'kiosk',
    });
  }, []);

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      const service = getDataService();
      const initialData = await service.loadInitialData();

      const courts = initialData.courts || [];
      const waitlist = initialData.waitlist || [];

      const updatedData = {
        courts: courts,
        waitlist: waitlist,
        recentlyCleared: data.recentlyCleared || [],
      };

      setData(updatedData);

      if (initialData.operatingHours) {
        setOperatingHours(initialData.operatingHours);
      }

      if (initialData.members && Array.isArray(initialData.members)) {
        setApiMembers(initialData.members);
      }

      const selection = computeRegistrationCourtSelection(courts);
      const selectableCourts = selection.showingOvertimeCourts
        ? selection.fallbackOvertimeCourts
        : selection.primaryCourts;
      const selectableNumbers = selectableCourts.map((c) => c.number);
      setAvailableCourts(selectableNumbers);

      console.log(
        '[Registration] Initial load complete, waitlist length:',
        initialData.waitlist?.length
      );

      return updatedData;
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataService]);

  // Helper to get courts occupied for clearing
  function getCourtsOccupiedForClearing() {
    const reactData = getCourtData();
    const courts = reactData.courts || [];

    const clearableCourts = courts
      .filter((c) => {
        if (c.session || c.isOccupied) {
          if (c.isBlocked) return false;
          return true;
        }
        return false;
      })
      .map((c) => c.number)
      .sort((a, b) => a - b);

    return clearableCourts;
  }

  // Duplicate guard helpers
  function __normalizeName(n) {
    return (n?.name ?? n?.fullName ?? n?.playerName ?? n ?? '')
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function guardAddPlayerEarly(getBoardData, player) {
    const memberId = player?.memberId || player?.id;
    const board = getBoardData() || {};

    if (DEBUG) {
      console.log('[guardAddPlayerEarly] Checking player:', player);
      console.log('[guardAddPlayerEarly] memberId:', memberId);
    }

    const engagement = findEngagementByMemberId(board, memberId);

    if (!engagement) return true;

    if (engagement.kind === 'waitlist') {
      const courts = Array.isArray(board?.courts) ? board.courts : [];
      const unoccupiedCount = courts.filter((c) => c.isAvailable).length;
      const overtimeCount = courts.filter((c) => c.isOvertime).length;
      const totalAvailable = unoccupiedCount > 0 ? unoccupiedCount : overtimeCount;
      const maxAllowedPosition = totalAvailable >= 2 ? 2 : 1;

      if (engagement.waitlistPosition <= maxAllowedPosition) {
        return true;
      }
    }

    if (typeof window !== 'undefined' && window.Tennis?.UI?.toast) {
      window.Tennis.UI.toast(getEngagementMessage(engagement));
    }
    return false;
  }

  function guardAgainstGroupDuplicate(player, playersArray) {
    const R = typeof window !== 'undefined' ? window.Tennis?.Domain?.roster : null;
    const nm = R?.normalizeName
      ? R.normalizeName(player?.name || player || '')
      : __normalizeName(player);
    const pid = player?.memberId || null;

    return !playersArray.some((p) => {
      if (pid && p?.memberId) {
        return p.memberId === pid;
      }
      const pName = R?.normalizeName ? R.normalizeName(p?.name || p || '') : __normalizeName(p);
      return pName === nm;
    });
  }

  // ===== EXTRACTED HOOKS =====

  // Alert display hook (WP5.6 R6a-1)
  const { showAlert, alertMessage, setShowAlert, setAlertMessage, showAlertMessage } =
    useAlertDisplay({ alertDurationMs: CONSTANTS.ALERT_DISPLAY_MS });

  // Admin price feedback hook (WP5.6 R6a-2)
  const {
    showPriceSuccess,
    priceError,
    setShowPriceSuccess,
    setPriceError,
    showPriceSuccessWithClear,
  } = useAdminPriceFeedback();

  // Guest counter hook (WP5.6 R6a-3)
  const { guestCounter, incrementGuestCounter } = useGuestCounter();

  // Court assignment result hook (WP5.4 R9a-1.3)
  const {
    justAssignedCourt,
    assignedSessionId,
    hasAssignedCourt,
    setJustAssignedCourt,
    setAssignedSessionId,
    setHasAssignedCourt,
  } = useCourtAssignmentResult();

  // Clear court flow hook (WP5.4 R9a-2.3)
  const {
    selectedCourtToClear,
    clearCourtStep,
    setSelectedCourtToClear,
    setClearCourtStep,
    decrementClearCourtStep,
  } = useClearCourtFlow();

  // Group/Guest hook (WP5.3 R8a.3)
  const {
    currentGroup,
    guestName,
    guestSponsor,
    showGuestForm,
    showGuestNameError,
    showSponsorError,
    setCurrentGroup,
    setGuestName,
    setGuestSponsor,
    setShowGuestForm,
    setShowGuestNameError,
    setShowSponsorError,
    handleRemovePlayer,
    handleSelectSponsor,
    handleCancelGuest,
  } = useGroupGuest();

  // Streak hook (WP5.3 R8c.3)
  const {
    registrantStreak,
    showStreakModal,
    streakAcknowledged,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,
  } = useStreak();

  // Member identity hook (WP5.3 R8b.3)
  const {
    memberNumber,
    currentMemberId,
    frequentPartners,
    frequentPartnersLoading,
    setMemberNumber,
    setCurrentMemberId,
    fetchFrequentPartners,
    clearCache,
  } = useMemberIdentity({ backend });

  // Inactivity timeout exit sequence (must be defined before useSessionTimeout)
  function applyInactivityTimeoutExitSequence() {
    applyInactivityTimeoutOrchestrated({
      setCurrentGroup,
      setShowSuccess,
      setMemberNumber,
      setCurrentMemberId,
      setJustAssignedCourt,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setCanChangeCourt,
      setIsTimeLimited,
      setCurrentScreen,
      setAssignedSessionId,
      setCurrentWaitlistEntryId,
      setWaitlistPosition,
      setCourtToMove,
      setHasAssignedCourt,
      setShowGuestForm,
      setGuestName,
      setGuestSponsor,
      setRegistrantStreak,
      setShowStreakModal,
      setStreakAcknowledged,
      setSearchInput,
      setShowSuggestions,
      setShowAddPlayer,
      setAddPlayerSearch,
      setShowAddPlayerSuggestions,
      setHasWaitlistPriority,
      setSelectedCourtToClear,
      setClearCourtStep,
      setIsChangingCourt,
      setWasOvertimeCourt,
      clearSuccessResetTimer,
    });
  }

  // Session timeout hook (WP5.7)
  const { showTimeoutWarning } = useSessionTimeout({
    currentScreen,
    setLastActivity,
    showAlertMessage,
    onTimeout: applyInactivityTimeoutExitSequence,
  });

  // Member search hook (WP5.3 R5a.3)
  const {
    searchInput,
    showSuggestions,
    addPlayerSearch,
    showAddPlayerSuggestions,
    isSearching,
    effectiveSearchInput,
    effectiveAddPlayerSearch,
    setSearchInput,
    setShowSuggestions,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    setApiMembers,
    handleGroupSearchChange,
    handleGroupSearchFocus,
    handleAddPlayerSearchChange,
    handleAddPlayerSearchFocus,
    getAutocompleteSuggestions,
  } = useMemberSearch({
    backend,
    setCurrentScreen,
    CONSTANTS,
    markUserTyping,
  });

  // Mobile flow controller hook (WP5.8)
  const {
    mobileFlow,
    preselectedCourt,
    mobileMode,
    mobileCountdown,
    checkingLocation,
    locationToken,
    showQRScanner,
    gpsFailedPrompt,
    setMobileFlow,
    setPreselectedCourt,
    setMobileMode,
    setCheckingLocation,
    setLocationToken,
    setShowQRScanner,
    setGpsFailedPrompt,
    getMobileGeolocation,
    requestMobileReset,
    onQRScanToken,
    onQRScannerClose,
    openQRScanner,
    dismissGpsPrompt,
  } = useMobileFlowController({
    showSuccess,
    justAssignedCourt,
    backend,
    isMobile: API_CONFIG.IS_MOBILE,
    toast: typeof window !== 'undefined' ? window.Tennis?.UI?.toast : undefined,
    dbg,
    DEBUG,
  });

  // Block admin hook (WP5.3 R3.3)
  const {
    showBlockModal,
    blockingInProgress,
    selectedCourtsToBlock,
    blockMessage,
    blockStartTime,
    blockEndTime,
    blockWarningMinutes,
    setShowBlockModal,
    setSelectedCourtsToBlock,
    setBlockMessage,
    setBlockStartTime,
    setBlockEndTime,
    setBlockWarningMinutes,
    setBlockingInProgress,
    onBlockCreate,
    onCancelBlock,
  } = useBlockAdmin({
    backend,
    showAlertMessage,
    getCourtData,
  });

  // Waitlist admin hook (WP5.3 R4a.3)
  const { waitlistMoveFrom, setWaitlistMoveFrom, onReorderWaitlist } = useWaitlistAdmin({
    getCourtData,
    showAlertMessage,
  });

  // ===== DERIVED VALUES (useMemo) =====

  // CTA state derived from waitlist and available courts
  const {
    firstWaitlistEntry,
    secondWaitlistEntry,
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
  } = useMemo(() => {
    const normalizedWaitlist = (data.waitlist || []).map((entry) => ({
      id: entry.id,
      position: entry.position,
      groupType: entry.group?.type,
      joinedAt: entry.joinedAt,
      minutesWaiting: entry.minutesWaiting,
      names: (entry.group?.players || []).map((p) => p.displayName || p.name || 'Unknown'),
      players: entry.group?.players || [],
    }));

    const firstGroup = normalizedWaitlist[0] || null;
    const secondGroup = normalizedWaitlist[1] || null;
    const gateCount = availableCourts.length;

    const live1 = gateCount >= 1 && firstGroup !== null;
    const live2 = gateCount >= 2 && secondGroup !== null;

    const first = firstGroup
      ? { id: firstGroup.id, position: firstGroup.position ?? 1, players: firstGroup.players }
      : null;
    const second = secondGroup
      ? { id: secondGroup.id, position: secondGroup.position ?? 2, players: secondGroup.players }
      : null;

    return {
      firstWaitlistEntry: first,
      secondWaitlistEntry: second,
      canFirstGroupPlay: !!live1,
      canSecondGroupPlay: !!live2,
      firstWaitlistEntryData: first,
      secondWaitlistEntryData: second,
    };
  }, [data.waitlist, availableCourts]);

  // Member database (simplified for autocomplete)
  const memberDatabase = useMemo(() => {
    const db = {};
    const names = [
      'Novak Djokovic',
      'Carlos Alcaraz',
      'Jannik Sinner',
      'Daniil Medvedev',
      'Alexander Zverev',
      'Andrey Rublev',
      'Casper Ruud',
      'Hubert Hurkacz',
      'Taylor Fritz',
      'Alex de Minaur',
      'Iga Swiatek',
      'Aryna Sabalenka',
      'Coco Gauff',
      'Elena Rybakina',
      'Jessica Pegula',
      'Ons Jabeur',
      'Marketa Vondrousova',
      'Karolina Muchova',
      'Beatriz Haddad Maia',
      'Petra Kvitova',
      'Stefanos Tsitsipas',
      'Felix Auger-Aliassime',
      'Cameron Norrie',
      'Karen Khachanov',
      'Frances Tiafoe',
      'Tommy Paul',
      'Lorenzo Musetti',
      'Ben Shelton',
      'Nicolas Jarry',
      'Sebastian Korda',
      'Madison Keys',
      'Victoria Azarenka',
      'Daria Kasatkina',
      'Belinda Bencic',
      'Caroline Garcia',
      'Simona Halep',
      'Elina Svitolina',
      'Maria Sakkari',
      'Liudmila Samsonova',
      'Zheng Qinwen',
    ];

    for (let i = 1; i <= CONSTANTS.MEMBER_COUNT; i++) {
      const id = CONSTANTS.MEMBER_ID_START + i;
      db[id.toString()] = {
        familyMembers: [
          {
            id: id,
            name: names[i - 1] || `Player ${i}`,
            phone: `555-${String(i).padStart(4, '0')}`,
            ranking: ((i - 1) % 20) + 1,
            winRate: 0.5 + Math.random() * 0.4,
          },
        ],
        playingHistory: [],
        lastGame: null,
      };
    }
    return db;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== USE EFFECTS =====

  // Debug: log whenever availableCourts changes
  useEffect(() => {
    console.log('🔄 availableCourts state changed:', availableCourts);
  }, [availableCourts]);

  // Cleanup success reset timer on unmount
  useEffect(() => {
    return () => {
      if (successResetTimerRef.current) {
        clearTimeout(successResetTimerRef.current);
        successResetTimerRef.current = null;
      }
    };
  }, []);

  // Fetch ball price from API on mount
  useEffect(() => {
    const fetchBallPrice = async () => {
      try {
        const result = await backend.admin.getSettings();
        if (result.ok && result.settings?.ball_price_cents) {
          setBallPriceCents(result.settings.ball_price_cents);
        }
        if (result.ok && result.settings?.block_warning_minutes) {
          const blockWarnMin = parseInt(result.settings.block_warning_minutes, 10);
          if (blockWarnMin > 0) {
            setBlockWarningMinutes(blockWarnMin);
          }
        }
      } catch (error) {
        console.error('Failed to load ball price from API:', error);
      }
    };
    fetchBallPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TennisBackend Real-time subscription
  useEffect(() => {
    console.log('[TennisBackend] Setting up board subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges((domainBoard) => {
      const board = domainBoard;

      console.log('[TennisBackend] Board update received:', {
        serverNow: board.serverNow,
        courts: board.courts?.length,
        waitlist: board.waitlist?.length,
      });

      setData((prev) => ({
        ...prev,
        courts: board.courts || [],
        waitlist: board.waitlist || [],
        blocks: board.blocks || [],
        upcomingBlocks: board.upcomingBlocks || [],
      }));

      if (board.operatingHours) {
        setOperatingHours(board.operatingHours);
      }

      const selectable = (board.courts || [])
        .filter((c) => (c.isAvailable || c.isOvertime) && !c.isBlocked)
        .map((c) => c.number);
      setAvailableCourts(selectable);

      console.log(
        '[Registration CTA Debug] Courts from API:',
        board.courts?.map((c) => ({
          num: c.number,
          isBlocked: c.isBlocked,
          isAvailable: c.isAvailable,
          isOvertime: c.isOvertime,
          block: c.block ? { id: c.block.id, reason: c.block.reason } : null,
        }))
      );
    });

    console.log('[TennisBackend] Board subscription active');

    return () => {
      console.log('[TennisBackend] Unsubscribing from board updates');
      unsubscribe();
    };
  }, []);

  // CSS Performance Optimizations
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

  // Load admin settings when entering admin screen
  useEffect(() => {
    const loadAdminSettings = async () => {
      if (currentScreen === 'admin') {
        try {
          const settings = await dataStore?.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY);
          if (settings) {
            const parsed = settings || {};
            setBallPriceInput(
              (parsed.tennisBallPrice || TENNIS_CONFIG.PRICING.TENNIS_BALLS).toFixed(2)
            );
          } else {
            setBallPriceInput(TENNIS_CONFIG.PRICING.TENNIS_BALLS.toFixed(2));
          }
        } catch (_error) {
          setBallPriceInput(TENNIS_CONFIG.PRICING.TENNIS_BALLS.toFixed(2));
        }
      }
    };
    loadAdminSettings();
  }, [currentScreen]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mobile Bridge Integration
  useEffect(() => {
    if (typeof window !== 'undefined' && window.RegistrationUI) {
      window.RegistrationUI.setSelectedCourt = (courtNumber) => {
        console.log('Mobile: Setting selected court to', courtNumber);
        setPreselectedCourt(courtNumber);
      };

      window.RegistrationUI.startRegistration = (courtNumber) => {
        console.log('Mobile: Starting registration for court', courtNumber);
        setCurrentScreen('group', 'mobileStartRegistration');
        requestAnimationFrame(() => {
          const input =
            document.querySelector('#mobile-group-search-input') ||
            document.querySelector('#main-search-input') ||
            document.querySelector('[data-role="player-input"]') ||
            document.querySelector('#playerNameInput') ||
            document.querySelector('input[type="text"]');
          if (input) {
            input.focus({ preventScroll: true });
            try {
              const v = input.value || '';
              input.setSelectionRange(v.length, v.length);
            } catch {
              /* setSelectionRange not supported */
            }
          }
        });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Fetch frequent partners when entering group screen
  useEffect(() => {
    if (currentScreen === 'group' && currentMemberId) {
      fetchFrequentPartners(currentMemberId);
    }
  }, [currentScreen, currentMemberId, fetchFrequentPartners]);

  // Expose loadData for tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.loadData = loadData;
    }
  }, [loadData]);

  // ===== RETURN ALL STATE AND HELPERS =====
  return {
    // Core state
    state: {
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
    },

    // Setters
    setters: {
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
    },

    // Refs
    refs: {
      successResetTimerRef,
      typingTimeoutRef,
    },

    // Derived/computed values
    derived: {
      isMobileView,
      canFirstGroupPlay,
      canSecondGroupPlay,
      firstWaitlistEntry,
      secondWaitlistEntry,
      firstWaitlistEntryData,
      secondWaitlistEntryData,
      memberDatabase,
    },

    // Helper functions
    helpers: {
      markUserTyping,
      getCourtData,
      clearSuccessResetTimer,
      getDataService,
      loadData,
      applyInactivityTimeoutExitSequence,
      getCourtsOccupiedForClearing,
      guardAddPlayerEarly,
      guardAgainstGroupDuplicate,
    },

    // Services
    services: {
      backend,
      dataStore,
    },

    // From useAlertDisplay
    alert: {
      showAlert,
      alertMessage,
      setShowAlert,
      setAlertMessage,
      showAlertMessage,
    },

    // From useAdminPriceFeedback
    adminPriceFeedback: {
      showPriceSuccess,
      priceError,
      setPriceError,
      setShowPriceSuccess,
      showPriceSuccessWithClear,
    },

    // From useGuestCounter
    guestCounterHook: {
      guestCounter,
      incrementGuestCounter,
    },

    // From useSessionTimeout
    timeout: {
      showTimeoutWarning,
    },

    // From useMemberSearch
    search: {
      searchInput,
      setSearchInput,
      showSuggestions,
      setShowSuggestions,
      isSearching,
      effectiveSearchInput,
      addPlayerSearch,
      setAddPlayerSearch,
      showAddPlayerSuggestions,
      setShowAddPlayerSuggestions,
      effectiveAddPlayerSearch,
      setApiMembers,
      getAutocompleteSuggestions,
      handleGroupSearchChange,
      handleGroupSearchFocus,
      handleAddPlayerSearchChange,
      handleAddPlayerSearchFocus,
    },

    // From useCourtAssignmentResult
    courtAssignment: {
      justAssignedCourt,
      setJustAssignedCourt,
      assignedSessionId,
      setAssignedSessionId,
      hasAssignedCourt,
      setHasAssignedCourt,
    },

    // From useClearCourtFlow
    clearCourtFlow: {
      selectedCourtToClear,
      setSelectedCourtToClear,
      clearCourtStep,
      setClearCourtStep,
      decrementClearCourtStep,
    },

    // From useMobileFlowController
    mobile: {
      mobileFlow,
      preselectedCourt,
      mobileMode,
      mobileCountdown,
      checkingLocation,
      locationToken,
      showQRScanner,
      gpsFailedPrompt,
      setMobileFlow,
      setPreselectedCourt,
      setMobileMode,
      setCheckingLocation,
      setLocationToken,
      setShowQRScanner,
      setGpsFailedPrompt,
      getMobileGeolocation,
      requestMobileReset,
      onQRScanToken,
      onQRScannerClose,
      openQRScanner,
      dismissGpsPrompt,
    },

    // From useBlockAdmin
    blockAdmin: {
      showBlockModal,
      setShowBlockModal,
      selectedCourtsToBlock,
      setSelectedCourtsToBlock,
      blockStartTime,
      setBlockStartTime,
      blockEndTime,
      setBlockEndTime,
      blockMessage,
      setBlockMessage,
      blockWarningMinutes,
      setBlockWarningMinutes,
      blockingInProgress,
      setBlockingInProgress,
      getCourtBlockStatus,
      onBlockCreate,
      onCancelBlock,
    },

    // From useWaitlistAdmin
    waitlistAdmin: {
      waitlistMoveFrom,
      setWaitlistMoveFrom,
      onReorderWaitlist,
    },

    // From useGroupGuest
    groupGuest: {
      currentGroup,
      setCurrentGroup,
      guestName,
      setGuestName,
      guestSponsor,
      setGuestSponsor,
      showGuestForm,
      setShowGuestForm,
      showGuestNameError,
      setShowGuestNameError,
      showSponsorError,
      setShowSponsorError,
      handleRemovePlayer,
      handleSelectSponsor,
      handleCancelGuest,
    },

    // From useStreak
    streak: {
      registrantStreak,
      setRegistrantStreak,
      showStreakModal,
      setShowStreakModal,
      streakAcknowledged,
      setStreakAcknowledged,
    },

    // From useMemberIdentity
    memberIdentity: {
      memberNumber,
      setMemberNumber,
      currentMemberId,
      setCurrentMemberId,
      frequentPartners,
      frequentPartnersLoading,
      fetchFrequentPartners,
      clearCache,
    },

    // Constants and config
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,
    TennisBusinessLogic,
    dbg,
    DEBUG,

    // Overtime eligibility helper
    computeRegistrationCourtSelection,

    // Orchestrators (WP5.5)
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,

    // Validation
    validateGroupCompat,
  };
}

// --- Robust validation wrapper: always returns { ok, errors[] }
function validateGroupCompat(players, guests) {
  const W =
    typeof window !== 'undefined'
      ? window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist || null
      : null;
  const norm = (ok, errs) => ({
    ok: !!ok,
    errors: Array.isArray(errs) ? errs : errs ? [errs] : [],
  });

  // 1) Prefer domain-level validator if available
  try {
    if (W && typeof W.validateGroup === 'function') {
      const out = W.validateGroup({ players, guests });
      if (out && (typeof out.ok === 'boolean' || Array.isArray(out.errors))) {
        return norm(out.ok, out.errors);
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (_e) {
    // fall through to local rules
  }

  // 2) Local minimal validator (matches club rules)
  // - At least 1 named player or guest
  // - Guests is a non-negative integer
  // - Total size 1–4 (singles/doubles max 4)

  // Count guests by isGuest flag in players array
  const guestRowCount = Array.isArray(players)
    ? players.filter((p) => p && p.isGuest === true).length
    : 0;

  // Parse the separate guests field
  const gVal = Number.isFinite(guests) ? guests : parseInt(guests || 0, 10);

  // Count non-guest players
  const namedPlayers = Array.isArray(players)
    ? players.filter((p) => p && !p.isGuest && String(p?.name ?? p ?? '').trim())
    : [];
  const namedCount = namedPlayers.length;

  const errs = [];
  if (namedCount < 1 && Math.max(guestRowCount, gVal) < 1) errs.push('Enter at least one player.');
  if (!Number.isFinite(gVal) || gVal < 0) errs.push('Guests must be 0 or more.');

  // Effective guest count is the MAX of the two representations (not the sum),
  // so we never double-count a guest.
  const effectiveGuestCount = Math.max(guestRowCount, Math.max(0, gVal));

  // Final effective size
  const totalSize = namedCount + effectiveGuestCount;

  if (totalSize < 1) errs.push('Group size must be at least 1.');
  if (totalSize > 4) errs.push('Maximum group size is 4.');

  return norm(errs.length === 0, errs);
}
