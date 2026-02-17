import { useCallback } from 'react';

// Import services for handlers that need them
import { GeolocationService } from '../../services';

/**
 * Navigation Handlers
 * Extracted from useRegistrationHandlers
 * Verbatim function bodies, no logic changes.
 */
export function useNavigationHandlers(deps) {
  const {
    // State
    showGuestForm,
    showAddPlayer,
    mobileFlow,
    currentScreen,
    clearCourtStep,
    // Setters
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    setShowAddPlayer,
    setCurrentGroup,
    setMemberNumber,
    setCurrentMemberId,
    setCurrentScreen,
    setCheckingLocation,
    // Helpers
    decrementClearCourtStep,
    requestMobileReset,
    showAlertMessage,
    // Constants
    TENNIS_CONFIG,
  } = deps;

  // VERBATIM COPY: checkLocationAndProceed from line ~170
  const checkLocationAndProceed = useCallback(
    async (onSuccess) => {
      // Skip location check if disabled
      if (!TENNIS_CONFIG.GEOLOCATION.ENABLED) {
        console.log('⚠️ Geolocation check disabled for development');
        onSuccess();
        return;
      }

      setCheckingLocation(true);

      try {
        const locationResult = await GeolocationService.verifyAtClub();

        if (locationResult.success) {
          // Location verified, proceed with action
          onSuccess();
        } else {
          // Not at club
          showAlertMessage(locationResult.message);
        }
      } catch (error) {
        // Location check failed (timeout, permission denied, etc.)
        console.error('Location check failed:', error);
        showAlertMessage(TENNIS_CONFIG.GEOLOCATION.ERROR_MESSAGE);
      } finally {
        setCheckingLocation(false);
      }
    },
    [TENNIS_CONFIG, setCheckingLocation, showAlertMessage]
  );

  // VERBATIM COPY: handleToggleAddPlayer from line ~668
  const handleToggleAddPlayer = useCallback(() => {
    if (showGuestForm) {
      // If guest form is showing, close it and reset
      setShowGuestForm(false);
      setGuestName('');
      setGuestSponsor('');
      setShowGuestNameError(false);
      setShowSponsorError(false);
      setShowAddPlayer(false);
    } else {
      // Normal toggle behavior
      setShowAddPlayer(!showAddPlayer);
    }
  }, [
    showGuestForm,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    showAddPlayer,
    setShowAddPlayer,
  ]);

  // VERBATIM COPY: handleGroupGoBack from line ~692
  const handleGroupGoBack = useCallback(() => {
    if (mobileFlow) {
      // Check if we're in Clear Court workflow - handle navigation properly
      if (currentScreen === 'clearCourt') {
        // In Clear Court, Back should go to previous step or exit
        if (clearCourtStep > 1) {
          decrementClearCourtStep();
        } else {
          // Exit Clear Court workflow
          requestMobileReset();
        }
      } else {
        // For other screens, close the registration overlay
        requestMobileReset();
      }
    } else {
      // Desktop behavior - go back to home
      setCurrentGroup([]);
      setMemberNumber('');
      setCurrentMemberId(null);
      setCurrentScreen('home', 'groupGoBack');
    }
  }, [
    mobileFlow,
    currentScreen,
    clearCourtStep,
    decrementClearCourtStep,
    requestMobileReset,
    setCurrentGroup,
    setMemberNumber,
    setCurrentMemberId,
    setCurrentScreen,
  ]);

  return {
    checkLocationAndProceed,
    handleToggleAddPlayer,
    handleGroupGoBack,
  };
}
