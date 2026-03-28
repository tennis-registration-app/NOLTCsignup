import { useCallback } from 'react';

// Import services for handlers that need them
import { GeolocationService } from '../../services';
import { logger } from '../../../lib/logger';

/**
 * Navigation Handlers
 * Extracted from useRegistrationHandlers
 * Accepts named slices from the app state object.
 */
export function useNavigationHandlers({
  state,
  setters,
  groupGuest,
  memberIdentity,
  mobile,
  alert,
  TENNIS_CONFIG,
}) {
  const { showAddPlayer } = state;
  const { setShowAddPlayer, setCurrentScreen } = setters;
  const {
    showGuestForm,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    setCurrentGroup,
  } = groupGuest;
  const { setMemberNumber, setCurrentMemberId } = memberIdentity;
  const { mobileFlow, setCheckingLocation, requestMobileReset } = mobile;
  const { showAlertMessage } = alert;

  // VERBATIM COPY: checkLocationAndProceed from line ~170
  const checkLocationAndProceed = useCallback(
    async (onSuccess) => {
      // Skip location check if disabled
      if (!TENNIS_CONFIG.GEOLOCATION.ENABLED) {
        logger.warn('Geolocation', 'Geolocation check disabled for development');
        onSuccess();
        return;
      }

      setCheckingLocation(true);

      try {
        const locationResult = await GeolocationService.verifyAtClub() as { success: boolean; message: string };

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

  // handleGroupGoBack — used by GroupScreen and CourtSelectionScreen only.
  // ClearCourtScreen handles its own back navigation directly.
  const handleGroupGoBack = useCallback(() => {
    if (mobileFlow) {
      requestMobileReset();
    } else {
      // Desktop behavior - go back to home
      setCurrentGroup([]);
      setMemberNumber('');
      setCurrentMemberId(null);
      setCurrentScreen('home', 'groupGoBack');
    }
  }, [
    mobileFlow,
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
