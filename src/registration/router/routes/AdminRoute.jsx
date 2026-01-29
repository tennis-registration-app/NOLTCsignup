import React from 'react';
import { AdminScreen } from '../../screens';

/**
 * AdminRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Verbatim JSX. No behavior change.
 */
export function AdminRoute(props) {
  const {
    getCourtData,
    currentTime,
    // Alert state (read only)
    showAlert,
    alertMessage,
    // Block modal state
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
    // Move state
    courtToMove,
    setCourtToMove,
    waitlistMoveFrom,
    setWaitlistMoveFrom,
    // Price state
    ballPriceInput,
    setBallPriceInput,
    priceError,
    setPriceError,
    showPriceSuccess,
    setShowPriceSuccess,
    // Callbacks
    handleClearAllCourts,
    handleAdminClearCourt,
    onCancelBlock,
    onBlockCreate,
    handleMoveCourt,
    handleClearWaitlist,
    handleRemoveFromWaitlist,
    onReorderWaitlist,
    handlePriceUpdate,
    handleExitAdmin,
    showAlertMessage,
    // Utilities
    getCourtBlockStatus,
    CONSTANTS,
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
