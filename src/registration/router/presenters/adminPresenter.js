// @ts-check
/**
 * AdminScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by AdminScreen.
 *
 * Extracted from AdminRoute.jsx — maintains exact prop mapping.
 */

/**
 * Build the model (data) props for AdminScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {import('../../../types/appTypes').Handlers} handlers
 * @returns {Object} Model props for AdminScreen
 */
export function buildAdminModel(app, handlers) {
  // Destructure from app (verbatim from AdminRoute)
  const { state, blockAdmin, waitlistAdmin, adminPriceFeedback, alert, CONSTANTS } = app;
  const { currentTime, courtToMove, ballPriceInput } = state;
  const { showAlert, alertMessage } = alert;
  const {
    showBlockModal,
    selectedCourtsToBlock,
    blockMessage,
    blockStartTime,
    blockEndTime,
    blockingInProgress,
    getCourtBlockStatus,
  } = blockAdmin;
  const { waitlistMoveFrom } = waitlistAdmin;
  const { priceError, showPriceSuccess } = adminPriceFeedback;

  // Get data via handler
  const { getCourtData } = handlers;
  const adminData = getCourtData();

  return {
    // Data
    data: adminData,
    currentTime,
    // Alert state (read only)
    showAlert,
    alertMessage,
    // Block modal state (read-only values)
    showBlockModal,
    selectedCourtsToBlock,
    blockMessage,
    blockStartTime,
    blockEndTime,
    blockingInProgress,
    // Move state (read-only values)
    courtToMove,
    waitlistMoveFrom,
    // Price state (read-only values)
    ballPriceInput,
    priceError,
    showPriceSuccess,
    // Utilities
    getCourtBlockStatus,
    CONSTANTS,
  };
}

/**
 * Build the actions (callback/setter) props for AdminScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {import('../../../types/appTypes').Handlers} handlers
 * @returns {Object} Action props for AdminScreen
 */
export function buildAdminActions(app, handlers) {
  // Destructure from app (verbatim from AdminRoute)
  const { setters, alert, blockAdmin, waitlistAdmin, adminPriceFeedback } = app;
  const { setCourtToMove, setBallPriceInput } = setters;
  const { showAlertMessage } = alert;
  const {
    setShowBlockModal,
    setSelectedCourtsToBlock,
    setBlockMessage,
    setBlockStartTime,
    setBlockEndTime,
    setBlockingInProgress,
    onCancelBlock,
    onBlockCreate,
  } = blockAdmin;
  const { setWaitlistMoveFrom, onReorderWaitlist } = waitlistAdmin;
  const { setPriceError, setShowPriceSuccess } = adminPriceFeedback;

  // Destructure from handlers (verbatim from AdminRoute)
  const {
    handleClearAllCourts,
    handleAdminClearCourt,
    handleMoveCourt,
    handleClearWaitlist,
    handleRemoveFromWaitlist,
    handlePriceUpdate,
    handleExitAdmin,
  } = handlers;

  return {
    // Block modal setters
    setShowBlockModal,
    setSelectedCourtsToBlock,
    setBlockMessage,
    setBlockStartTime,
    setBlockEndTime,
    setBlockingInProgress,
    // Move setters
    setCourtToMove,
    setWaitlistMoveFrom,
    // Price setters
    setBallPriceInput,
    setPriceError,
    setShowPriceSuccess,
    // Callbacks (renamed to on* convention)
    onClearAllCourts: handleClearAllCourts,
    onClearCourt: handleAdminClearCourt,
    onCancelBlock,
    onBlockCreate,
    onMoveCourt: handleMoveCourt,
    onClearWaitlist: handleClearWaitlist,
    onRemoveFromWaitlist: handleRemoveFromWaitlist,
    onReorderWaitlist,
    onPriceUpdate: handlePriceUpdate,
    onExit: handleExitAdmin,
    showAlertMessage,
  };
}
