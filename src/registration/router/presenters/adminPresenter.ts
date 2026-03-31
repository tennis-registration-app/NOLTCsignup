/**
 * AdminScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by AdminScreen.
 *
 * Extracted from AdminRoute.jsx — maintains exact prop mapping.
 */

import type { AppState, Handlers, RegistrationConstants, RegistrationUiState } from '../../../types/appTypes.js';

export interface AdminModel {
  // Data
  data: RegistrationUiState['data'];
  currentTime: Date;
  // Alert state (read only)
  showAlert: boolean;
  alertMessage: string;
  // Block modal state (read-only values)
  showBlockModal: boolean;
  selectedCourtsToBlock: number[];
  blockMessage: string;
  blockStartTime: string;
  blockEndTime: string;
  blockingInProgress: boolean;
  // Move state (read-only values)
  courtToMove: number | null;
  waitlistMoveFrom: number | null;
  // Price state (read-only values)
  ballPriceInput: string;
  priceError: string | null;
  showPriceSuccess: boolean;
  // Utilities
  getCourtBlockStatus: (courtNumber: number) => import('../../../types/appTypes').CourtBlockStatusResult | null;
  CONSTANTS: RegistrationConstants;
}

export interface AdminActions {
  // Block modal setters
  setShowBlockModal: (v: boolean) => void;
  setSelectedCourtsToBlock: (v: number[]) => void;
  setBlockMessage: (v: string) => void;
  setBlockStartTime: (v: string) => void;
  setBlockEndTime: (v: string) => void;
  setBlockingInProgress: (v: boolean) => void;
  // Move setters
  setCourtToMove: (v: number | null) => void;
  setWaitlistMoveFrom: (v: number | null) => void;
  // Price setters
  setBallPriceInput: (v: string) => void;
  setPriceError: (v: string) => void;
  setShowPriceSuccess: (v: boolean) => void;
  // Callbacks (renamed to on* convention)
  onClearAllCourts: () => void;
  onClearCourt: (courtNum: number) => void;
  onCancelBlock: (blockId: string, courtNumber: number) => Promise<void>;
  onBlockCreate: () => Promise<void>;
  onMoveCourt: (fromCourtNum: number, toCourtNum: number) => void;
  onClearWaitlist: () => Promise<void>;
  onRemoveFromWaitlist: (group: unknown) => void;
  onReorderWaitlist: (fromIndex: number, toIndex: number) => Promise<void>;
  onPriceUpdate: () => Promise<void>;
  onExit: () => void;
  showAlertMessage: (message: string) => void;
}

/**
 * Build the model (data) props for AdminScreen
 */
export function buildAdminModel(app: AppState, handlers: Handlers): AdminModel {
  // Destructure from app — admin slices via grouped alias
  const { state, admin, alert, CONSTANTS } = app;
  const { blockAdmin, waitlistAdmin, adminPriceFeedback } = admin;
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
  // Destructure from app — admin slices via grouped alias
  const { setters, alert, admin } = app;
  const { blockAdmin, waitlistAdmin, adminPriceFeedback } = admin;
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
