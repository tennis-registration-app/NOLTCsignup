// @ts-check
/**
 * AdminScreen Component
 * Admin panel for court management, waitlist management, and system settings.
 * All state is managed by parent (App.jsx) - this component receives state and callbacks as props.
 */
import React from 'react';
import { AlertDisplay, ToastHost } from '../components';
import BlockCourtsModal from './admin/BlockCourtsModal.jsx';
import MoveCourtUI from './admin/MoveCourtUI.jsx';
import CourtGrid from './admin/CourtGrid.jsx';
import WaitlistManagement from './admin/WaitlistManagement.jsx';
import SystemSettingsSection from './admin/SystemSettingsSection.jsx';
import { logger } from '../../lib/logger.js';

const AdminScreen = ({
  // Data
  data,
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

  // Callbacks (handlers defined in App.jsx)
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

  // Utilities
  getCourtBlockStatus,
  CONSTANTS,
  // TENNIS_CONFIG available if needed
}) => {
  const now = new Date();

  // Compute derived values from data
  const occupiedCourts = data.courts.filter(
    (court) => court !== null && court.session?.group?.players?.length > 0 && !court.wasCleared
  );

  const overtimeCourts = data.courts.filter(
    (court) =>
      court &&
      court.session?.group?.players?.length > 0 &&
      !court.wasCleared &&
      new Date(court.session?.scheduledEndAt) <= currentTime
  );

  // Count only currently blocked courts
  const blockedCourts = data.courts.filter((court) => {
    if (!court || !court.blocked || !court.blocked.startTime || !court.blocked.endTime)
      return false;
    const blockStartTime = new Date(court.blocked.startTime);
    const blockEndTime = new Date(court.blocked.endTime);
    return now >= blockStartTime && now < blockEndTime;
  });

  logger.info('Admin', 'Admin data loaded', {
    totalCourts: data.courts.length,
    occupied: occupiedCourts.length,
    blocked: blockedCourts.length,
    blockedDetails: blockedCourts,
  });

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
          priceError={priceError}
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
