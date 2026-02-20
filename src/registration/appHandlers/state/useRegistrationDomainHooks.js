/**
 * useRegistrationDomainHooks - Consolidated domain hook calls
 * Extracted from useRegistrationAppState.js
 *
 * Contains all 13 domain hook invocations with their destructured returns.
 */

import { logger } from '../../../lib/logger.js';

// Alert display hook
import { useAlertDisplay } from '../../ui/alert';

// Admin price feedback hook
import { useAdminPriceFeedback } from '../../ui/adminPriceFeedback';

// Guest counter hook
import { useGuestCounter } from '../../ui/guestCounter';

// Mobile flow controller hook
import { useMobileFlowController } from '../../ui/mobile';

// Member search hook
import { useMemberSearch } from '../../search/useMemberSearch.js';

// Court assignment result hook
import { useCourtAssignmentResult } from '../../court/useCourtAssignmentResult';

// Clear court flow hook
import { useClearCourtFlow } from '../../court/useClearCourtFlow';

// Block admin hook
import { useBlockAdmin } from '../../blocks/useBlockAdmin';

// Waitlist admin hook
import { useWaitlistAdmin } from '../../waitlist/useWaitlistAdmin';

// Group/Guest hook
import { useGroupGuest } from '../../group/useGroupGuest';

// Streak hook
import { useStreak } from '../../streak/useStreak';

// Member identity hook
import { useMemberIdentity } from '../../memberIdentity/useMemberIdentity';

// Debug utilities
const DEBUG = false;
const dbg = (/** @type {any[]} */ ...args) => {
  if (DEBUG) logger.debug('RegistrationDomainHooks', .../** @type {[any, ...any[]]} */ (args));
};

/**
 * Consolidated domain hooks for registration app state
 * @param {Object} deps - Dependencies needed by hooks
 * @param {any} deps.backend - Backend service instance
 * @param {any} deps.CONSTANTS - App constants
 * @param {Function} deps.setCurrentScreen - Screen navigation setter
 * @param {boolean} deps.showSuccess - Current success state
 * @param {string|null} deps.justAssignedCourt - Just assigned court
 * @param {boolean} deps.isMobile - Mobile device flag
 * @param {Function} deps.toast - Toast function
 * @param {Function} deps.markUserTyping - Mark user typing function
 * @param {Function} deps.getCourtData - Get court data function
 * @param {Function|null} [deps.showAlertMessage] - External alert message function
 */
export function useRegistrationDomainHooks({
  backend,
  CONSTANTS,
  setCurrentScreen,
  showSuccess,
  justAssignedCourt,
  isMobile,
  toast,
  markUserTyping,
  getCourtData,
  showAlertMessage: externalShowAlertMessage,
}) {
  // Alert display hook
  const { showAlert, alertMessage, setShowAlert, setAlertMessage, showAlertMessage } =
    useAlertDisplay({ alertDurationMs: CONSTANTS.ALERT_DISPLAY_MS });

  // Admin price feedback hook
  const {
    showPriceSuccess,
    priceError,
    setShowPriceSuccess,
    setPriceError,
    showPriceSuccessWithClear,
  } = useAdminPriceFeedback();

  // Guest counter hook
  const { guestCounter, incrementGuestCounter } = useGuestCounter();

  // Court assignment result hook
  const {
    justAssignedCourt: courtAssignmentJustAssigned,
    assignedSessionId,
    assignedEndTime,
    hasAssignedCourt,
    setJustAssignedCourt,
    setAssignedSessionId,
    setAssignedEndTime,
    setHasAssignedCourt,
  } = useCourtAssignmentResult();

  // Clear court flow hook
  const {
    selectedCourtToClear,
    clearCourtStep,
    setSelectedCourtToClear,
    setClearCourtStep,
    decrementClearCourtStep,
  } = useClearCourtFlow();

  // Group/Guest hook
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

  // Streak hook
  const {
    registrantStreak,
    showStreakModal,
    streakAcknowledged,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,
  } = useStreak();

  // Member identity hook
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

  // Member search hook
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

  // Mobile flow controller hook
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

  // Block admin hook
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

  // Waitlist admin hook
  const { waitlistMoveFrom, setWaitlistMoveFrom, onReorderWaitlist } = useWaitlistAdmin({
    getCourtData,
    showAlertMessage: externalShowAlertMessage || showAlertMessage,
    backend,
  });

  // Return all values in a flat object
  return {
    // Alert display
    showAlert,
    alertMessage,
    setShowAlert,
    setAlertMessage,
    showAlertMessage,

    // Admin price feedback
    showPriceSuccess,
    priceError,
    setShowPriceSuccess,
    setPriceError,
    showPriceSuccessWithClear,

    // Guest counter
    guestCounter,
    incrementGuestCounter,

    // Court assignment result
    justAssignedCourt: courtAssignmentJustAssigned,
    assignedSessionId,
    assignedEndTime,
    hasAssignedCourt,
    setJustAssignedCourt,
    setAssignedSessionId,
    setAssignedEndTime,
    setHasAssignedCourt,

    // Clear court flow
    selectedCourtToClear,
    clearCourtStep,
    setSelectedCourtToClear,
    setClearCourtStep,
    decrementClearCourtStep,

    // Group/Guest
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

    // Streak
    registrantStreak,
    showStreakModal,
    streakAcknowledged,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,

    // Member identity
    memberNumber,
    currentMemberId,
    frequentPartners,
    frequentPartnersLoading,
    setMemberNumber,
    setCurrentMemberId,
    fetchFrequentPartners,
    clearCache,

    // Member search
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

    // Mobile flow controller
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

    // Block admin
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

    // Waitlist admin
    waitlistMoveFrom,
    setWaitlistMoveFrom,
    onReorderWaitlist,
  };
}
