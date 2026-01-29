import React from 'react';
import { AdminScreen } from '../../screens';

/**
 * AdminRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Added app/handlers grouping — WP6.0.2a
 * Verbatim JSX. No behavior change.
 */
export function AdminRoute(props) {
  // Bridge mode: prefer app/handlers, fallback to props for compatibility
  const app = props.app ?? props;
  const handlers = props.handlers ?? props;

  // Destructure from app (state/config)
  const {
    currentTime = app.state?.currentTime,
    // Alert state (read only)
    showAlert = app.alert?.showAlert,
    alertMessage = app.alert?.alertMessage,
    showAlertMessage = app.alert?.showAlertMessage,
    // Block modal state
    showBlockModal = app.blockAdmin?.showBlockModal,
    setShowBlockModal = app.blockAdmin?.setShowBlockModal,
    selectedCourtsToBlock = app.blockAdmin?.selectedCourtsToBlock,
    setSelectedCourtsToBlock = app.blockAdmin?.setSelectedCourtsToBlock,
    blockMessage = app.blockAdmin?.blockMessage,
    setBlockMessage = app.blockAdmin?.setBlockMessage,
    blockStartTime = app.blockAdmin?.blockStartTime,
    setBlockStartTime = app.blockAdmin?.setBlockStartTime,
    blockEndTime = app.blockAdmin?.blockEndTime,
    setBlockEndTime = app.blockAdmin?.setBlockEndTime,
    blockingInProgress = app.blockAdmin?.blockingInProgress,
    setBlockingInProgress = app.blockAdmin?.setBlockingInProgress,
    onCancelBlock = app.blockAdmin?.onCancelBlock,
    onBlockCreate = app.blockAdmin?.onBlockCreate,
    getCourtBlockStatus = app.blockAdmin?.getCourtBlockStatus,
    // Move state
    courtToMove = app.state?.courtToMove,
    setCourtToMove = app.setters?.setCourtToMove,
    waitlistMoveFrom = app.waitlistAdmin?.waitlistMoveFrom,
    setWaitlistMoveFrom = app.waitlistAdmin?.setWaitlistMoveFrom,
    onReorderWaitlist = app.waitlistAdmin?.onReorderWaitlist,
    // Price state
    ballPriceInput = app.state?.ballPriceInput,
    setBallPriceInput = app.setters?.setBallPriceInput,
    priceError = app.adminPriceFeedback?.priceError,
    setPriceError = app.adminPriceFeedback?.setPriceError,
    showPriceSuccess = app.adminPriceFeedback?.showPriceSuccess,
    setShowPriceSuccess = app.adminPriceFeedback?.setShowPriceSuccess,
    // Utilities
    CONSTANTS = app.CONSTANTS,
  } = props;

  // Destructure from handlers
  const {
    getCourtData = handlers.getCourtData,
    handleClearAllCourts = handlers.handleClearAllCourts,
    handleAdminClearCourt = handlers.handleAdminClearCourt,
    handleMoveCourt = handlers.handleMoveCourt,
    handleClearWaitlist = handlers.handleClearWaitlist,
    handleRemoveFromWaitlist = handlers.handleRemoveFromWaitlist,
    handlePriceUpdate = handlers.handlePriceUpdate,
    handleExitAdmin = handlers.handleExitAdmin,
  } = props;

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
