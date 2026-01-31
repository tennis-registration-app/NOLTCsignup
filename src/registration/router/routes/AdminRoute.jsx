import React from 'react';
import { AdminScreen } from '../../screens';

/**
 * AdminRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 * Verbatim JSX. No behavior change.
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function AdminRoute({ app, handlers }) {
  // Destructure from app
  const { state, setters, alert, blockAdmin, waitlistAdmin, adminPriceFeedback, CONSTANTS } = app;
  const { currentTime, courtToMove, ballPriceInput } = state;
  const { setCourtToMove, setBallPriceInput } = setters;
  const { showAlert, alertMessage, showAlertMessage } = alert;
  const {
    showBlockModal,
    setShowBlockModal,
    selectedCourtsToBlock,
    setSelectedCourtsToBlock,
    blockMessage,
    setBlockMessage,
    blockStartTime,
    setBlockStartTime,
    blockEndTime,
    setBlockEndTime,
    blockingInProgress,
    setBlockingInProgress,
    onCancelBlock,
    onBlockCreate,
    getCourtBlockStatus,
  } = blockAdmin;
  const { waitlistMoveFrom, setWaitlistMoveFrom, onReorderWaitlist } = waitlistAdmin;
  const { priceError, setPriceError, showPriceSuccess, setShowPriceSuccess } = adminPriceFeedback;

  // Destructure from handlers
  const {
    getCourtData,
    handleClearAllCourts,
    handleAdminClearCourt,
    handleMoveCourt,
    handleClearWaitlist,
    handleRemoveFromWaitlist,
    handlePriceUpdate,
    handleExitAdmin,
  } = handlers;

  const adminData = getCourtData();

  return (
    <AdminScreen
      // Data
      data={adminData}
      currentTime={currentTime}
      // Alert state (read only)
      showAlert={showAlert}
      alertMessage={alertMessage}
      // Block modal state
      showBlockModal={showBlockModal}
      setShowBlockModal={setShowBlockModal}
      selectedCourtsToBlock={selectedCourtsToBlock}
      setSelectedCourtsToBlock={setSelectedCourtsToBlock}
      blockMessage={blockMessage}
      setBlockMessage={setBlockMessage}
      blockStartTime={blockStartTime}
      setBlockStartTime={setBlockStartTime}
      blockEndTime={blockEndTime}
      setBlockEndTime={setBlockEndTime}
      blockingInProgress={blockingInProgress}
      setBlockingInProgress={setBlockingInProgress}
      // Move state
      courtToMove={courtToMove}
      setCourtToMove={setCourtToMove}
      waitlistMoveFrom={waitlistMoveFrom}
      setWaitlistMoveFrom={setWaitlistMoveFrom}
      // Price state
      ballPriceInput={ballPriceInput}
      setBallPriceInput={setBallPriceInput}
      priceError={priceError}
      setPriceError={setPriceError}
      showPriceSuccess={showPriceSuccess}
      setShowPriceSuccess={setShowPriceSuccess}
      // Callbacks
      onClearAllCourts={handleClearAllCourts}
      onClearCourt={handleAdminClearCourt}
      onCancelBlock={onCancelBlock}
      onBlockCreate={onBlockCreate}
      onMoveCourt={handleMoveCourt}
      onClearWaitlist={handleClearWaitlist}
      onRemoveFromWaitlist={handleRemoveFromWaitlist}
      onReorderWaitlist={onReorderWaitlist}
      onPriceUpdate={handlePriceUpdate}
      onExit={handleExitAdmin}
      showAlertMessage={showAlertMessage}
      // Utilities
      getCourtBlockStatus={getCourtBlockStatus}
      CONSTANTS={CONSTANTS}
    />
  );
}
