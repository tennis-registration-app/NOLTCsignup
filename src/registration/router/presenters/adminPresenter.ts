/**
 * AdminScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by AdminScreen.
 *
 * Extracted from AdminRoute.jsx — maintains exact prop mapping.
 */

import type { AppState, Handlers } from '../../../types/appTypes.js';

export interface AdminModel {
  // Data
  data: any;
  currentTime: number;
  // Alert state (read only)
  showAlert: boolean;
  alertMessage: string;
  // Block modal state (read-only values)
  showBlockModal: boolean;
  selectedCourtsToBlock: any[];
  blockMessage: string;
  blockStartTime: string;
  blockEndTime: string;
  blockingInProgress: boolean;
  // Move state (read-only values)
  courtToMove: any;
  waitlistMoveFrom: any;
  // Price state (read-only values)
  ballPriceInput: string;
  priceError: string | null;
  showPriceSuccess: boolean;
  // Utilities
  getCourtBlockStatus: Function;
  CONSTANTS: any;
}

export interface AdminActions {
  // Block modal setters
  setShowBlockModal: Function;
  setSelectedCourtsToBlock: Function;
  setBlockMessage: Function;
  setBlockStartTime: Function;
  setBlockEndTime: Function;
  setBlockingInProgress: Function;
  // Move setters
  setCourtToMove: Function;
  setWaitlistMoveFrom: Function;
  // Price setters
  setBallPriceInput: Function;
  setPriceError: Function;
  setShowPriceSuccess: Function;
  // Callbacks (renamed to on* convention)
  onClearAllCourts: Function;
  onClearCourt: Function;
  onCancelBlock: Function;
  onBlockCreate: Function;
  onMoveCourt: Function;
  onClearWaitlist: Function;
  onRemoveFromWaitlist: Function;
  onReorderWaitlist: Function;
  onPriceUpdate: Function;
  onExit: Function;
  showAlertMessage: Function;
}

/**
 * Build the model (data) props for AdminScreen
 */
export function buildAdminModel(app: AppState, handlers: Handlers): AdminModel {
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
 */
export function buildAdminActions(app: AppState, handlers: Handlers): AdminActions {
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
