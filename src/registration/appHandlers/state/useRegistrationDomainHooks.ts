/**
 * useRegistrationDomainHooks - Consolidated domain hook calls
 * Extracted from useRegistrationAppState.js
 *
 * Contains shell-owned domain hook invocations (8 hooks).
 * Workflow hooks (useGroupGuest, useStreak, useCourtAssignmentResult, useMemberIdentity)
 * have moved to WorkflowProvider.
 */

import type { TennisBackendShape } from '../../../types/appTypes';
import { logger } from '../../../lib/logger';

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

// Block admin hook
import { useBlockAdmin } from '../../blocks/useBlockAdmin';

// Waitlist admin hook
import { useWaitlistAdmin } from '../../waitlist/useWaitlistAdmin';

// Debug utilities
const DEBUG = false;
const dbg = (...args: unknown[]) => {
  if (DEBUG) logger.debug('RegistrationDomainHooks', ...(args as [string, ...unknown[]]));
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
interface UseRegistrationDomainHooksDeps {
  backend: TennisBackendShape;
  CONSTANTS: { ALERT_DISPLAY_MS: number; ADMIN_CODE: string; MAX_AUTOCOMPLETE_RESULTS: number; [key: string]: unknown };
  setCurrentScreen: (screen: string, source?: string) => void;
  showSuccess: boolean;
  justAssignedCourt: string | null;
  isMobile: boolean;
  toast: (message: string, options?: { type?: string; duration?: number }) => void;
  markUserTyping: () => void;
  getCourtData: () => { courts: unknown[]; waitlist: { id?: string; group?: { id?: string } }[]; [key: string]: unknown };
  showAlertMessage?: ((message: string) => void) | null;
}

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
}: UseRegistrationDomainHooksDeps) {
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

  // NOTE: useGroupGuest, useStreak, useCourtAssignmentResult, useMemberIdentity
  // have moved to WorkflowProvider (key-based reset).

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

  // Return shell-owned values only.
  // Workflow hooks (groupGuest, streak, courtAssignment, memberIdentity)
  // now come from WorkflowContext.
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
