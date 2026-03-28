import { useCallback } from 'react';
import {
  handleClearAllCourtsOp,
  handleAdminClearCourtOp,
  handleMoveCourtOp,
  handleClearWaitlistOp,
  handleRemoveFromWaitlistOp,
} from '../../handlers/adminOperations';

/**
 * Admin Handlers
 * Extracted from useRegistrationHandlers
 * Accepts named slices from the app state object.
 */
export function useAdminHandlers({
  services,
  alert,
  helpers,
  setters,
  search,
  state,
  adminPriceFeedback,
  TENNIS_CONFIG,
  court,
}) {
  const { backend, dataStore } = services;
  const { showAlertMessage } = alert;
  const { getCourtData } = helpers;
  const { setCourtToMove, setCurrentScreen } = setters;
  const { setSearchInput } = search;
  const { ballPriceInput } = state;
  const { setPriceError, showPriceSuccessWithClear } = adminPriceFeedback;
  const { clearCourt } = court;

  // VERBATIM COPY: handleClearAllCourts from line ~731
  const handleClearAllCourts = useCallback(
    () => handleClearAllCourtsOp({ backend, showAlertMessage }),
    [backend, showAlertMessage]
  );

  // VERBATIM COPY: handleAdminClearCourt from line ~736
  const handleAdminClearCourt = useCallback(
    (courtNum) => handleAdminClearCourtOp({ clearCourt, showAlertMessage }, courtNum),
    [clearCourt, showAlertMessage]
  );

  // VERBATIM COPY: handleMoveCourt from line ~741
  const handleMoveCourt = useCallback(
    (fromCourtNum, toCourtNum) =>
      handleMoveCourtOp(
        { backend, getCourtData, showAlertMessage, setCourtToMove },
        fromCourtNum,
        toCourtNum
      ),
    [backend, getCourtData, showAlertMessage, setCourtToMove]
  );

  // VERBATIM COPY: handleClearWaitlist from line ~751
  const handleClearWaitlist = useCallback(
    () => handleClearWaitlistOp({ backend, showAlertMessage, getCourtData }),
    [backend, showAlertMessage, getCourtData]
  );

  // VERBATIM COPY: handleRemoveFromWaitlist from line ~756
  const handleRemoveFromWaitlist = useCallback(
    (group) => handleRemoveFromWaitlistOp({ backend, showAlertMessage }, group),
    [backend, showAlertMessage]
  );

  // VERBATIM COPY: handlePriceUpdate from lines ~761-788
  const handlePriceUpdate = useCallback(async () => {
    const price = parseFloat(ballPriceInput);

    // Validation
    if (isNaN(price)) {
      setPriceError('Please enter a valid number');
      return;
    }

    if (price < 0.5 || price > 50.0) {
      setPriceError('Price must be between $0.50 and $50.00');
      return;
    }

    // Save to localStorage
    try {
      const parsed = (await dataStore.get(TENNIS_CONFIG.STORAGE.SETTINGS_KEY)) || {};
      parsed.tennisBallPrice = price;
      await dataStore.set(TENNIS_CONFIG.STORAGE.SETTINGS_KEY, parsed, { immediate: true });

      // Show success message
      showPriceSuccessWithClear();
    } catch {
      // Intentional: error details not needed, generic message shown to user
      setPriceError('Failed to save price');
    }
  }, [ballPriceInput, setPriceError, dataStore, TENNIS_CONFIG, showPriceSuccessWithClear]);

  // VERBATIM COPY: handleExitAdmin from lines ~789-796
  const handleExitAdmin = useCallback(() => {
    setCurrentScreen('home', 'exitAdminPanel');
    setSearchInput('');
  }, [setCurrentScreen, setSearchInput]);

  return {
    handleClearAllCourts,
    handleAdminClearCourt,
    handleMoveCourt,
    handleClearWaitlist,
    handleRemoveFromWaitlist,
    handlePriceUpdate,
    handleExitAdmin,
  };
}
