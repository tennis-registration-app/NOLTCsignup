/**
 * useRegistrationDomainHooks - Consolidated domain hook calls
 * Extracted from useRegistrationAppState.js (WP5.9.6.4)
 *
 * Contains all 13 domain hook invocations with their destructured returns.
 */

// Alert display hook (WP5.6 R6a-1)
import { useAlertDisplay } from '../../ui/alert';

// Admin price feedback hook (WP5.6 R6a-2)
import { useAdminPriceFeedback } from '../../ui/adminPriceFeedback';

// Guest counter hook (WP5.6 R6a-3)
import { useGuestCounter } from '../../ui/guestCounter';

// Session timeout hook (WP5.7)
import { useSessionTimeout } from '../../ui/timeout';

// Mobile flow controller hook (WP5.8)
import { useMobileFlowController } from '../../ui/mobile';

// Member search hook (WP5.3 R5a.3)
import { useMemberSearch } from '../../search/useMemberSearch.js';

// Court assignment result hook (WP5.4 R9a-1.3)
import { useCourtAssignmentResult } from '../../court/useCourtAssignmentResult';

// Clear court flow hook (WP5.4 R9a-2.3)
import { useClearCourtFlow } from '../../court/useClearCourtFlow';

// Block admin hook (WP5.3 R3.3)
import { useBlockAdmin } from '../../blocks/useBlockAdmin';

// Waitlist admin hook (WP5.3 R4a.3)
import { useWaitlistAdmin } from '../../waitlist/useWaitlistAdmin';

// Group/Guest hook (WP5.3 R8a.3)
import { useGroupGuest } from '../../group/useGroupGuest';

// Streak hook (WP5.3 R8c.3)
import { useStreak } from '../../streak/useStreak';

// Member identity hook (WP5.3 R8b.3)
import { useMemberIdentity } from '../../memberIdentity/useMemberIdentity';

// Debug utilities
const DEBUG = false;
const dbg = (...args) => {
  if (DEBUG) console.log(...args);
};

/**
 * Consolidated domain hooks for registration app state
 * @param {Object} deps - Dependencies needed by hooks
 * @param {Object} deps.backend - Backend service instance
 * @param {Object} deps.CONSTANTS - App constants
 * @param {Function} deps.setCurrentScreen - Screen navigation setter
 * @param {Function} deps.setLastActivity - Activity timestamp setter
 * @param {Function} deps.setShowSuccess - Success display setter
 * @param {boolean} deps.showSuccess - Current success state
 * @param {string|null} deps.justAssignedCourt - Just assigned court
 * @param {string} deps.currentScreen - Current screen name
 * @param {boolean} deps.isMobile - Mobile device flag
 * @param {Function} deps.toast - Toast function
 * @param {Function} deps.markUserTyping - Mark user typing function
 * @param {Function} deps.getCourtData - Get court data function
 * @param {Function} deps.onTimeout - Timeout callback
 */
export function useRegistrationDomainHooks({
  backend,
  CONSTANTS,
  setCurrentScreen,
  setLastActivity,
  showSuccess,
  justAssignedCourt,
  currentScreen,
  isMobile,
  toast,
  markUserTyping,
  getCourtData,
  showAlertMessage: externalShowAlertMessage,
  onTimeout,
}) {
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
    justAssignedCourt: courtAssignmentJustAssigned,
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

  // Session timeout hook (WP5.7)
  const { showTimeoutWarning } = useSessionTimeout({
    currentScreen,
    setLastActivity,
    showAlertMessage: externalShowAlertMessage || showAlertMessage,
    onTimeout,
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
    isMobile,
    toast,
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
    showAlertMessage: externalShowAlertMessage || showAlertMessage,
    getCourtData,
  });

  // Waitlist admin hook (WP5.3 R4a.3)
  const { waitlistMoveFrom, setWaitlistMoveFrom, onReorderWaitlist } = useWaitlistAdmin({
    getCourtData,
    showAlertMessage: externalShowAlertMessage || showAlertMessage,
  });

  // Return all values in a flat object
  return {
    // Alert display (WP5.6 R6a-1)
    showAlert,
    alertMessage,
    setShowAlert,
    setAlertMessage,
    showAlertMessage,

    // Admin price feedback (WP5.6 R6a-2)
    showPriceSuccess,
    priceError,
    setShowPriceSuccess,
    setPriceError,
    showPriceSuccessWithClear,

    // Guest counter (WP5.6 R6a-3)
    guestCounter,
    incrementGuestCounter,

    // Court assignment result (WP5.4 R9a-1.3)
    justAssignedCourt: courtAssignmentJustAssigned,
    assignedSessionId,
    hasAssignedCourt,
    setJustAssignedCourt,
    setAssignedSessionId,
    setHasAssignedCourt,

    // Clear court flow (WP5.4 R9a-2.3)
    selectedCourtToClear,
    clearCourtStep,
    setSelectedCourtToClear,
    setClearCourtStep,
    decrementClearCourtStep,

    // Group/Guest (WP5.3 R8a.3)
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

    // Streak (WP5.3 R8c.3)
    registrantStreak,
    showStreakModal,
    streakAcknowledged,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,

    // Member identity (WP5.3 R8b.3)
    memberNumber,
    currentMemberId,
    frequentPartners,
    frequentPartnersLoading,
    setMemberNumber,
    setCurrentMemberId,
    fetchFrequentPartners,
    clearCache,

    // Session timeout (WP5.7)
    showTimeoutWarning,

    // Member search (WP5.3 R5a.3)
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

    // Mobile flow controller (WP5.8)
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

    // Block admin (WP5.3 R3.3)
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

    // Waitlist admin (WP5.3 R4a.3)
    waitlistMoveFrom,
    setWaitlistMoveFrom,
    onReorderWaitlist,
  };
}
