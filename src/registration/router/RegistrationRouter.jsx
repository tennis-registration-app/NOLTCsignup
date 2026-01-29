import React from 'react';
import {
  HomeScreen,
  SuccessScreen,
  CourtSelectionScreen,
  ClearCourtScreen,
  AdminScreen,
  GroupScreen,
} from '../screens';
import { AlertDisplay, ToastHost, QRScanner } from '../components';
import { API_CONFIG } from '../../lib/apiConfig.js';
import { TennisBusinessLogic } from '@lib';

/**
 * RegistrationRouter
 * Extracted from App.jsx — WP5.9.1
 *
 * Handles screen routing based on currentScreen state.
 * All props are passed through from App.jsx.
 */
export default function RegistrationRouter({
  // Core navigation
  currentScreen,
  setCurrentScreen,

  // Alert state (from useAlertDisplay)
  showAlert,
  alertMessage,
  showAlertMessage,

  // Mobile state (from useMobileFlowController)
  mobileFlow,
  mobileMode,
  preselectedCourt,
  mobileCountdown,
  checkingLocation,
  showQRScanner,
  gpsFailedPrompt,
  onQRScanToken,
  onQRScannerClose,
  openQRScanner,
  dismissGpsPrompt,

  // Search state (from useMemberSearch)
  searchInput,
  setSearchInput,
  showSuggestions,
  setShowSuggestions,
  isSearching,
  effectiveSearchInput,
  getAutocompleteSuggestions,
  addPlayerSearch,
  showAddPlayerSuggestions,
  effectiveAddPlayerSearch,
  handleGroupSearchChange,
  handleGroupSearchFocus,
  handleAddPlayerSearchChange,
  handleAddPlayerSearchFocus,

  // Member identity (from useMemberIdentity)
  memberNumber,
  setMemberNumber,
  currentMemberId,
  frequentPartners,
  frequentPartnersLoading,

  // Group/guest state (from useGroupGuest)
  currentGroup,
  setCurrentGroup,
  guestName,
  guestSponsor,
  showGuestForm,
  showGuestNameError,
  showSponsorError,
  handleRemovePlayer,
  handleSelectSponsor,
  handleCancelGuest,

  // Streak state (from useStreak)
  registrantStreak,
  showStreakModal,
  streakAcknowledged,
  setStreakAcknowledged,

  // Court assignment (from useCourtAssignmentResult)
  justAssignedCourt,
  assignedSessionId,
  hasAssignedCourt,

  // Clear court (from useClearCourtFlow)
  selectedCourtToClear,
  setSelectedCourtToClear,
  clearCourtStep,
  setClearCourtStep,

  // Block admin (from useBlockAdmin)
  showBlockModal,
  setShowBlockModal,
  selectedCourtsToBlock,
  setSelectedCourtsToBlock,
  blockStartTime,
  setBlockStartTime,
  blockEndTime,
  setBlockEndTime,
  blockMessage,
  setBlockMessage,
  blockWarningMinutes,
  blockingInProgress,
  setBlockingInProgress,
  getCourtBlockStatus,
  onBlockCreate,
  onCancelBlock,

  // Waitlist admin (from useWaitlistAdmin)
  waitlistMoveFrom,
  setWaitlistMoveFrom,
  onReorderWaitlist,

  // Session timeout (from useSessionTimeout)
  showTimeoutWarning,

  // Admin price feedback (from useAdminPriceFeedback)
  showPriceSuccess,
  setShowPriceSuccess,
  priceError,
  setPriceError,
  ballPriceInput,
  setBallPriceInput,

  // CTA state (computed values)
  canFirstGroupPlay,
  canSecondGroupPlay,
  firstWaitlistEntry,
  secondWaitlistEntry,
  firstWaitlistEntryData,
  secondWaitlistEntryData,

  // Remaining App.jsx state
  data,
  availableCourts,
  waitlistPosition,
  showSuccess,
  setShowSuccess,
  replacedGroup,
  displacement,
  setDisplacement,
  originalCourtData,
  setOriginalCourtData,
  canChangeCourt,
  changeTimeRemaining,
  isTimeLimited,
  timeLimitReason,
  showAddPlayer,
  isChangingCourt,
  setIsChangingCourt,
  setWasOvertimeCourt,
  currentTime,
  courtToMove,
  setCourtToMove,
  hasWaitlistPriority,
  setHasWaitlistPriority,
  currentWaitlistEntryId,
  setCurrentWaitlistEntryId,
  isAssigning,
  isJoiningWaitlist,
  ballPriceCents,
  successResetTimerRef,

  // Computed values
  isMobileView,

  // Handlers
  handleSuggestionClick,
  handleGroupSuggestionClick,
  handleAddPlayerSuggestionClick,
  markUserTyping,
  findMemberNumber,
  addFrequentPartner,
  isPlayerAlreadyPlaying,
  handleToggleAddPlayer,
  handleToggleGuestForm,
  handleGuestNameChange,
  handleAddGuest,
  handleGroupSelectCourt,
  handleStreakAcknowledge,
  handleGroupJoinWaitlist,
  handleGroupGoBack,
  assignCourtToGroup,
  changeCourt,
  clearCourt,
  sendGroupToWaitlist,
  resetForm,
  clearSuccessResetTimer,
  handleClearAllCourts,
  handleAdminClearCourt,
  handleMoveCourt,
  handleClearWaitlist,
  handleRemoveFromWaitlist,
  handlePriceUpdate,
  handleExitAdmin,
  checkLocationAndProceed,
  getCourtData,
  saveCourtData,
  getCourtsOccupiedForClearing,
  computeRegistrationCourtSelection,
  sameGroup,

  // External dependencies
  backend,
  CONSTANTS,
  TENNIS_CONFIG,
}) {
  // ===== ROUTING JSX =====

  // Silent assign loading screen (mobile waitlist assignment in progress)
  if (mobileMode === 'silent-assign') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
          <p className="text-xl font-medium">Assigning court...</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    const isCourtAssignment = justAssignedCourt !== null;
    const courtData = getCourtData();
    // Find court by number (API may return courts in different order than array index)
    const courts = courtData.courts || [];
    const assignedCourt = justAssignedCourt
      ? courts.find((c) => c.number === justAssignedCourt) || courts[justAssignedCourt - 1]
      : null;

    let estimatedWait = 0;
    let position = 0;
    if (!isCourtAssignment) {
      // Position in queue - use API position if available
      position = waitlistPosition > 0 ? waitlistPosition : courtData.waitlist.length;

      // Calculate estimated wait time using domain functions
      try {
        const A = window.Tennis?.Domain?.Availability;
        const W = window.Tennis?.Domain?.Waitlist;

        if (A && W && A.getFreeCourtsInfo && A.getNextFreeTimes && W.estimateWaitForPositions) {
          const now = new Date();

          // Build blocks array from court-level blocks (active) and upcomingBlocks (future)
          const activeBlocks = courtData.courts
            .filter((c) => c?.block)
            .map((c) => ({
              courtNumber: c.number,
              startTime: c.block.startsAt || c.block.startTime,
              endTime: c.block.endsAt || c.block.endTime,
              isWetCourt: (c.block.reason || c.block.title || '').toLowerCase().includes('wet'),
            }));
          const upcomingBlocks = (courtData.upcomingBlocks || []).map((b) => ({
            courtNumber: b.courtNumber,
            startTime: b.startTime || b.startsAt,
            endTime: b.endTime || b.endsAt,
            isWetCourt: (b.reason || b.title || '').toLowerCase().includes('wet'),
          }));
          const allBlocks = [...activeBlocks, ...upcomingBlocks];

          // Build wetSet from currently active wet blocks
          const wetSet = new Set(
            allBlocks
              .filter(
                (b) => b.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
              )
              .map((b) => b.courtNumber)
          );

          // Convert data to domain format
          const domainData = { courts: courtData.courts };

          // Get availability info
          const info = A.getFreeCourtsInfo({ data: domainData, now, blocks: allBlocks, wetSet });
          const nextTimes = A.getNextFreeTimes({
            data: domainData,
            now,
            blocks: allBlocks,
            wetSet,
          });

          // Calculate ETA using domain function
          const avgGame = window.Tennis?.Config?.Timing?.AVG_GAME || CONSTANTS.AVG_GAME_TIME_MIN;
          const etas = W.estimateWaitForPositions({
            positions: [position],
            currentFreeCount: info.free?.length || 0,
            nextFreeTimes: nextTimes,
            avgGameMinutes: avgGame,
          });
          estimatedWait = etas[0] || 0;
        } else {
          // Domain functions not available - fallback to simple calculation
          estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
        }
      } catch (e) {
        console.error('Error calculating wait time:', e);
        estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
      }
    }

    return (
      <>
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />
        <SuccessScreen
          isCourtAssignment={isCourtAssignment}
          justAssignedCourt={justAssignedCourt}
          assignedCourt={assignedCourt}
          sessionId={assignedSessionId}
          replacedGroup={replacedGroup}
          canChangeCourt={canChangeCourt}
          changeTimeRemaining={changeTimeRemaining}
          position={position}
          estimatedWait={estimatedWait}
          currentGroup={currentGroup}
          mobileCountdown={mobileFlow ? mobileCountdown : null}
          isMobile={mobileFlow}
          isTimeLimited={isTimeLimited}
          timeLimitReason={timeLimitReason}
          registrantStreak={registrantStreak}
          onChangeCourt={changeCourt}
          onHome={resetForm}
          ballPriceCents={ballPriceCents}
          onPurchaseBalls={async (sessionId, accountId, options) => {
            console.log('[Ball Purchase] App.jsx handler called', {
              sessionId,
              accountId,
              options,
            });
            const result = await backend.commands.purchaseBalls({
              sessionId,
              accountId,
              splitBalls: options?.splitBalls || false,
              splitAccountIds: options?.splitAccountIds || null,
            });
            console.log('[Ball Purchase] API result from backend.commands.purchaseBalls', result);
            return result;
          }}
          onLookupMemberAccount={async (memberNumber) => {
            const members = await backend.directory.getMembersByAccount(memberNumber);
            return members;
          }}
          TENNIS_CONFIG={TENNIS_CONFIG}
          getCourtBlockStatus={getCourtBlockStatus}
          upcomingBlocks={data.upcomingBlocks}
          blockWarningMinutes={blockWarningMinutes}
        />
      </>
    );
  }

  // Home screen (combined Welcome + Search)
  if (currentScreen === 'home') {
    return (
      <>
        {checkingLocation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-xl">
              <p className="text-lg">{TENNIS_CONFIG.GEOLOCATION.CHECKING_MESSAGE}</p>
            </div>
          </div>
        )}
        <HomeScreen
          // Search functionality
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          isSearching={isSearching}
          effectiveSearchInput={effectiveSearchInput}
          getAutocompleteSuggestions={getAutocompleteSuggestions}
          handleSuggestionClick={handleSuggestionClick}
          markUserTyping={markUserTyping}
          // Navigation
          setCurrentScreen={setCurrentScreen}
          setCurrentGroup={setCurrentGroup}
          setMemberNumber={setMemberNumber}
          setHasWaitlistPriority={setHasWaitlistPriority}
          setCurrentWaitlistEntryId={setCurrentWaitlistEntryId}
          findMemberNumber={findMemberNumber}
          // CTA state
          canFirstGroupPlay={canFirstGroupPlay}
          canSecondGroupPlay={canSecondGroupPlay}
          firstWaitlistEntry={firstWaitlistEntry}
          secondWaitlistEntry={secondWaitlistEntry}
          firstWaitlistEntryData={firstWaitlistEntryData}
          secondWaitlistEntryData={secondWaitlistEntryData}
          // UI state
          showAlert={showAlert}
          alertMessage={alertMessage}
          isMobileView={isMobileView}
          CONSTANTS={CONSTANTS}
          // Clear court
          onClearCourtClick={() => {
            checkLocationAndProceed(() => setCurrentScreen('clearCourt', 'homeClearCourtClick'));
          }}
        />
      </>
    );
  }

  // Admin screen
  if (currentScreen === 'admin') {
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

  // Group management screen
  if (currentScreen === 'group') {
    return (
      <>
        <GroupScreen
          // Data
          data={data}
          currentGroup={currentGroup}
          memberNumber={memberNumber}
          availableCourts={availableCourts}
          frequentPartners={frequentPartners}
          frequentPartnersLoading={frequentPartnersLoading}
          // UI state
          showAlert={showAlert}
          alertMessage={alertMessage}
          showTimeoutWarning={showTimeoutWarning}
          isMobileView={isMobileView}
          // Mobile flow
          mobileFlow={mobileFlow}
          preselectedCourt={preselectedCourt}
          // Search state
          searchInput={searchInput}
          showSuggestions={showSuggestions}
          effectiveSearchInput={effectiveSearchInput}
          // Add player state
          showAddPlayer={showAddPlayer}
          addPlayerSearch={addPlayerSearch}
          showAddPlayerSuggestions={showAddPlayerSuggestions}
          effectiveAddPlayerSearch={effectiveAddPlayerSearch}
          // Guest form state
          showGuestForm={showGuestForm}
          guestName={guestName}
          guestSponsor={guestSponsor}
          showGuestNameError={showGuestNameError}
          showSponsorError={showSponsorError}
          // Callbacks
          onSearchChange={handleGroupSearchChange}
          onSearchFocus={handleGroupSearchFocus}
          onSuggestionClick={handleGroupSuggestionClick}
          onAddPlayerSearchChange={handleAddPlayerSearchChange}
          onAddPlayerSearchFocus={handleAddPlayerSearchFocus}
          onAddPlayerSuggestionClick={handleAddPlayerSuggestionClick}
          onToggleAddPlayer={handleToggleAddPlayer}
          onToggleGuestForm={handleToggleGuestForm}
          onRemovePlayer={handleRemovePlayer}
          onSelectSponsor={handleSelectSponsor}
          onGuestNameChange={handleGuestNameChange}
          onAddGuest={handleAddGuest}
          onCancelGuest={handleCancelGuest}
          onAddFrequentPartner={addFrequentPartner}
          onSelectCourt={handleGroupSelectCourt}
          isAssigning={isAssigning}
          onJoinWaitlist={handleGroupJoinWaitlist}
          joiningWaitlist={isJoiningWaitlist}
          onGoBack={handleGroupGoBack}
          onStartOver={resetForm}
          // Utilities
          getAutocompleteSuggestions={getAutocompleteSuggestions}
          isPlayerAlreadyPlaying={isPlayerAlreadyPlaying}
          sameGroup={sameGroup}
          CONSTANTS={CONSTANTS}
        />

        {/* Uncleared Session Streak Modal (streak >= 3) */}
        {showStreakModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Clear Court Reminder</h3>
                <p className="text-gray-600">
                  Your last {registrantStreak} sessions were ended without using &apos;Clear
                  Court&apos;. Please tap Clear Court when you finish so others can get on faster.
                </p>
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={streakAcknowledged}
                  onChange={(e) => setStreakAcknowledged(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-gray-700 font-medium">Got it</span>
              </label>

              <button
                onClick={handleStreakAcknowledge}
                disabled={!streakAcknowledged}
                className={`w-full py-3 px-6 rounded-xl font-medium transition-colors ${
                  streakAcknowledged
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Return to Select Your Court
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Court selection screen
  if (currentScreen === 'court') {
    // When a group has already been assigned a court, treat it like changing courts
    const isSelectingDifferentCourt = isChangingCourt || hasAssignedCourt;

    // Get court data from React state
    const reactData = getCourtData();
    const courtData = reactData;
    const courts = courtData.courts || [];

    // Compute court selection using centralized policy
    const courtSelection = computeRegistrationCourtSelection(courts);
    const unoccupiedCourts = courtSelection.primaryCourts;
    const overtimeCourts = courtSelection.fallbackOvertimeCourts;

    // Selectable: unoccupied first, then overtime if no unoccupied
    const selectableCourts = courtSelection.showingOvertimeCourts
      ? overtimeCourts
      : unoccupiedCourts;
    const selectable = selectableCourts.map((c) => c.number);

    const hasWaiters = (courtData.waitlist?.length || 0) > 0;

    // If user has waitlist priority, they should ONLY see FREE courts (not overtime)
    // Otherwise, only show courts when no one is waiting
    let computedAvailableCourts = [];
    if (hasWaitlistPriority) {
      // For waitlist priority users, prefer unoccupied courts, fallback to overtime
      const unoccupiedNumbers = unoccupiedCourts.map((c) => c.number);
      const overtimeNumbers = overtimeCourts.map((c) => c.number);

      if (unoccupiedNumbers.length > 0) {
        computedAvailableCourts = unoccupiedNumbers;
      } else if (overtimeNumbers.length > 0) {
        computedAvailableCourts = overtimeNumbers;
      }
    } else if (!hasWaiters && selectable.length > 0) {
      // Normal users get all selectable courts when no waitlist
      computedAvailableCourts = selectable;
    }

    const showCourtTiles = computedAvailableCourts.length > 0;

    console.log('[COURT SCREEN] Debug:', {
      hasWaiters,
      hasWaitlistPriority,
      selectableLength: selectable.length,
      showCourtTiles,
      availableCourtsLength: computedAvailableCourts.length,
    });

    const hasWaitlistEntries = courtData.waitlist.length > 0;

    // Check if showing overtime courts
    // Only count truly free courts as unoccupied (not blocked or wet courts)
    const hasUnoccupiedCourts = courtData.courts.some((court, index) => {
      const courtNumber = index + 1;

      // Check if court is blocked or wet
      const blockStatus = getCourtBlockStatus(courtNumber);
      if (blockStatus && blockStatus.isCurrent) {
        return false; // Blocked courts are not unoccupied
      }

      // Check if court is wet (you might have wet court logic here)
      // Add wet court check if needed

      // Only count as unoccupied if it's truly free AND selectable
      // Domain format: court.session.group.players
      const isTrulyFree =
        !court ||
        court.wasCleared ||
        (!court.session && court.history) ||
        !court.session?.group?.players?.length;

      // Additional check: must also be in the selectable courts list
      const isSelectable = computedAvailableCourts.includes(courtNumber);

      return isTrulyFree && isSelectable;
    });
    const showingOvertimeCourts =
      computedAvailableCourts.length > 0 && !hasUnoccupiedCourts && !isSelectingDifferentCourt;

    return (
      <>
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />

        {/* QR Scanner modal for mobile GPS fallback */}
        {showQRScanner && (
          <QRScanner
            onScan={onQRScanToken}
            onClose={onQRScannerClose}
            onError={(err) => {
              console.error('[Mobile] QR scanner error:', err);
            }}
          />
        )}

        {/* GPS failed prompt for mobile */}
        {gpsFailedPrompt && API_CONFIG.IS_MOBILE && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Required</h3>
              <p className="text-gray-600 mb-4">
                We couldn&apos;t detect your location. Please scan the QR code on the kiosk screen
                to verify you&apos;re at the club.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={openQRScanner}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Scan QR Code
                </button>
                <button
                  onClick={dismissGpsPrompt}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <CourtSelectionScreen
          availableCourts={computedAvailableCourts}
          showingOvertimeCourts={showingOvertimeCourts}
          hasWaitingGroups={hasWaitlistEntries}
          waitingGroupsCount={courtData.waitlist.length}
          currentGroup={currentGroup}
          isMobileView={isMobileView}
          upcomingBlocks={courtData.upcomingBlocks}
          onCourtSelect={async (courtNum) => {
            // If changing courts, handle the court change
            if (isChangingCourt && justAssignedCourt) {
              // If we have displacement info, use atomic undo which ends takeover + restores displaced
              if (
                displacement &&
                displacement.displacedSessionId &&
                displacement.takeoverSessionId
              ) {
                try {
                  const undoResult = await backend.commands.undoOvertimeTakeover({
                    takeoverSessionId: displacement.takeoverSessionId,
                    displacedSessionId: displacement.displacedSessionId,
                  });
                  // If undo failed with conflict, fall back to clearCourt
                  if (!undoResult.ok) {
                    console.warn(
                      '[Displacement] Undo returned conflict, falling back to clearCourt:',
                      undoResult
                    );
                    await clearCourt(justAssignedCourt, 'Bumped');
                  }
                  // If ok: true, the undo endpoint already ended the takeover session - no clearCourt needed
                } catch (err) {
                  console.error('[Displacement] Undo takeover failed:', err);
                  // Fallback: just clear the court if undo fails
                  await clearCourt(justAssignedCourt, 'Bumped');
                }
              } else {
                // No displacement - just clear the court normally
                await clearCourt(justAssignedCourt, 'Bumped');
              }
              setDisplacement(null); // Clear ONLY after court change is complete
            }
            console.log(
              '[Change Court Debug] availableCourts at selection:',
              computedAvailableCourts,
              'length:',
              computedAvailableCourts.length
            );
            await assignCourtToGroup(courtNum, computedAvailableCourts.length);
            // setDisplacement(null) removed from here - it was clearing the state prematurely
            setIsChangingCourt(false);
            setWasOvertimeCourt(false);
          }}
          onJoinWaitlist={async () => {
            await sendGroupToWaitlist(currentGroup);
            setShowSuccess(true);
            // Mobile: trigger success signal
            if (window.UI?.__mobileSendSuccess__) {
              window.UI.__mobileSendSuccess__();
            }
            // Don't auto-reset in mobile flow - let the overlay handle timing
            if (!mobileFlow) {
              clearSuccessResetTimer();
              successResetTimerRef.current = setTimeout(() => {
                successResetTimerRef.current = null;
                resetForm();
              }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
            }
          }}
          onAssignNext={async () => {
            console.log('[ASSIGN NEXT] Button clicked');
            try {
              // Get current board state
              const board = await backend.queries.getBoard();

              // Find first waiting entry
              const firstWaiting = board?.waitlist?.find((e) => e.status === 'waiting');
              if (!firstWaiting) {
                showAlertMessage('No entries waiting in queue');
                return;
              }

              // Find first available court
              const availableCourt = board?.courts?.find((c) => c.isAvailable && !c.isBlocked);
              if (!availableCourt) {
                showAlertMessage('No courts available');
                return;
              }

              // Assign using API
              const res = await backend.commands.assignFromWaitlist({
                waitlistEntryId: firstWaiting.id,
                courtId: availableCourt.id,
              });

              if (res?.ok) {
                window.Tennis?.UI?.toast?.(`Assigned to Court ${availableCourt.number}`, {
                  type: 'success',
                });
                showAlertMessage(`Assigned to Court ${availableCourt.number}`);
              } else {
                window.Tennis?.UI?.toast?.(res?.message || 'Failed assigning next', {
                  type: 'error',
                });
                showAlertMessage(res?.message || 'Failed assigning next');
              }
            } catch (err) {
              console.error('[ASSIGN NEXT] Error:', err);
              showAlertMessage(err.message || 'Failed assigning next');
            }
          }}
          onGoBack={() => {
            setCurrentScreen('group', 'courtGoBack');
            setIsChangingCourt(false);
            setWasOvertimeCourt(false);
            // If we were changing courts and had replaced an overtime court, restore it
            if (isChangingCourt && justAssignedCourt && originalCourtData) {
              try {
                const goBackData = getCourtData();
                goBackData.courts[justAssignedCourt - 1] = originalCourtData;
                saveCourtData(goBackData);
                setOriginalCourtData(null);
              } catch (error) {
                console.error('Failed to restore court:', error);
              }
            }
          }}
          onStartOver={resetForm}
        />
      </>
    );
  }

  // Clear court screen
  if (currentScreen === 'clearCourt') {
    return (
      <ClearCourtScreen
        clearCourtStep={clearCourtStep}
        setClearCourtStep={setClearCourtStep}
        selectedCourtToClear={selectedCourtToClear}
        setSelectedCourtToClear={setSelectedCourtToClear}
        clearCourt={clearCourt}
        resetForm={resetForm}
        showAlert={showAlert}
        alertMessage={alertMessage}
        getCourtsOccupiedForClearing={getCourtsOccupiedForClearing}
        courtData={getCourtData()}
        CONSTANTS={CONSTANTS}
        TennisBusinessLogic={TennisBusinessLogic}
        mobileFlow={mobileFlow}
      />
    );
  }

  return null;
}
