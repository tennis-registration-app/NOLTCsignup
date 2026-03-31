// @ts-check
/**
 * AdminScreen Component
 * Admin panel for court management, waitlist management, and system settings.
 * All state is managed by parent (App.jsx) - this component receives state and callbacks as props.
 */
import React, { useEffect } from 'react';
import { AlertDisplay, ToastHost } from '../components';
import BlockCourtsModal from './admin/BlockCourtsModal.jsx';
import MoveCourtUI from './admin/MoveCourtUI.jsx';
import CourtGrid from './admin/CourtGrid.jsx';
import WaitlistManagement from './admin/WaitlistManagement.jsx';
import SystemSettingsSection from './admin/SystemSettingsSection.jsx';
import { logger } from '../../lib/logger';
import type {
  RegistrationUiState,
  BlockAdminState,
  WaitlistAdminState,
  RegistrationConstants,
} from '../../types/appTypes';

type AdminCourt = RegistrationUiState['data']['courts'][number];

export interface AdminScreenProps {
  data: RegistrationUiState['data'];
  currentTime: Date;
  showAlert: boolean;
  alertMessage: string;
  showBlockModal: boolean;
  setShowBlockModal: (v: boolean) => void;
  selectedCourtsToBlock: number[];
  setSelectedCourtsToBlock: (v: number[]) => void;
  blockMessage: string;
  setBlockMessage: (v: string) => void;
  blockStartTime: string;
  setBlockStartTime: (v: string) => void;
  blockEndTime: string;
  setBlockEndTime: (v: string) => void;
  blockingInProgress: boolean;
  setBlockingInProgress: (v: boolean) => void;
  courtToMove: number | null;
  setCourtToMove: (v: number | null) => void;
  waitlistMoveFrom: WaitlistAdminState['waitlistMoveFrom'];
  setWaitlistMoveFrom: WaitlistAdminState['setWaitlistMoveFrom'];
  ballPriceInput: string;
  setBallPriceInput: (v: string) => void;
  priceError: string | null;
  setPriceError: (v: string) => void;
  showPriceSuccess: boolean;
  setShowPriceSuccess: (v: boolean) => void;
  onClearAllCourts: () => void;
  onClearCourt: (courtNum: number) => void;
  onCancelBlock: BlockAdminState['onCancelBlock'];
  onBlockCreate: BlockAdminState['onBlockCreate'];
  onMoveCourt: (fromCourtNum: number, toCourtNum: number) => void;
  onClearWaitlist: () => void;
  onRemoveFromWaitlist: (group: unknown) => void;
  onReorderWaitlist: WaitlistAdminState['onReorderWaitlist'];
  onPriceUpdate: () => void;
  onExit: () => void;
  showAlertMessage: (message: string) => void;
  getCourtBlockStatus: BlockAdminState['getCourtBlockStatus'];
  CONSTANTS: RegistrationConstants;
}

const AdminScreen = ({
  data,
  currentTime,
  showAlert,
  alertMessage,
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
  courtToMove,
  setCourtToMove,
  waitlistMoveFrom,
  setWaitlistMoveFrom,
  ballPriceInput,
  setBallPriceInput,
  priceError,
  setPriceError,
  showPriceSuccess,
  setShowPriceSuccess,
  onClearAllCourts,
  onClearCourt,
  onCancelBlock,
  onBlockCreate,
  onMoveCourt,
  onClearWaitlist,
  onRemoveFromWaitlist,
  onReorderWaitlist,
  onPriceUpdate,
  onExit,
  showAlertMessage,
  getCourtBlockStatus,
  CONSTANTS,
}: AdminScreenProps) => {
  const now = new Date();

  // Compute derived values from data
  const occupiedCourts = data.courts.filter(
    (court: AdminCourt) => court !== null && (court.session?.group?.players?.length ?? 0) > 0
  );

  const overtimeCourts = data.courts.filter(
    (court: AdminCourt) =>
      court &&
      (court.session?.group?.players?.length ?? 0) > 0 &&
      new Date(court.session?.scheduledEndAt ?? '') <= currentTime
  );

  // Count only currently blocked courts
  const blockedCourts = data.courts.filter((court: AdminCourt) => {
    const blk = court.block as (typeof court.block & { startTime?: string; endTime?: string }) | null;
    if (!blk || !blk.startTime || !blk.endTime) return false;
    const blockStart = new Date(blk.startTime);
    const blockEnd = new Date(blk.endTime);
    return now >= blockStart && now < blockEnd;
  });

  useEffect(() => {
    logger.info('Admin', 'Admin data loaded', {
      totalCourts: data.courts.length,
      occupied: occupiedCourts.length,
      blocked: blockedCourts.length,
    });
  }, [data.courts.length, occupiedCourts.length, blockedCourts.length]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-8 flex items-center justify-center">
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-6xl h-full max-h-[95vh] overflow-y-auto scrollbar-hide">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400 text-sm sm:text-base">System management and controls</p>
        </div>

        {/* Court Management */}
        <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Court Management
              <span className="text-sm sm:text-lg font-normal text-gray-400 block sm:inline sm:ml-3">
                ({occupiedCourts.length} occupied, {overtimeCourts.length} overtime)
              </span>
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setShowBlockModal(true);
                  setSelectedCourtsToBlock([]);
                  setBlockMessage('');
                  setBlockStartTime('');
                  setBlockEndTime('');
                  setBlockingInProgress(false);
                }}
                className="bg-yellow-700 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-yellow-800 transition-colors flex-1 sm:flex-initial"
              >
                Block Courts
              </button>
              <button
                onClick={onClearAllCourts}
                className="bg-orange-600 text-white py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-700 transition-colors flex-1 sm:flex-initial"
              >
                Clear All Courts
              </button>
            </div>
          </div>

          {/* Block Courts Modal */}
          {showBlockModal && (
            <BlockCourtsModal
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
              setShowBlockModal={setShowBlockModal}
              onBlockCreate={onBlockCreate}
              CONSTANTS={CONSTANTS}
            />
          )}

          {/* Move Court UI */}
          {courtToMove && (
            <MoveCourtUI
              courtToMove={courtToMove}
              setCourtToMove={setCourtToMove}
              data={data}
              onMoveCourt={onMoveCourt}
              CONSTANTS={CONSTANTS}
            />
          )}

          <CourtGrid
            data={data}
            currentTime={currentTime}
            setCourtToMove={setCourtToMove}
            onClearCourt={onClearCourt}
            onCancelBlock={onCancelBlock}
            showAlertMessage={showAlertMessage}
            getCourtBlockStatus={getCourtBlockStatus}
          />
        </div>

        {/* Waitlist Management */}
        <WaitlistManagement
          data={data}
          waitlistMoveFrom={waitlistMoveFrom}
          setWaitlistMoveFrom={setWaitlistMoveFrom}
          onClearWaitlist={onClearWaitlist}
          onRemoveFromWaitlist={onRemoveFromWaitlist}
          onReorderWaitlist={onReorderWaitlist}
        />

        {/* System Settings */}
        <SystemSettingsSection
          ballPriceInput={ballPriceInput}
          setBallPriceInput={setBallPriceInput}
          priceError={priceError ?? ""}
          setPriceError={setPriceError}
          showPriceSuccess={showPriceSuccess}
          setShowPriceSuccess={setShowPriceSuccess}
          onPriceUpdate={onPriceUpdate}
        />

        {/* Exit Admin */}
        <div className="flex justify-center">
          <button
            onClick={onExit}
            className="bg-gray-600 text-white py-2 sm:py-3 px-6 sm:px-8 rounded-xl text-base sm:text-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Exit Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminScreen;
