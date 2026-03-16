/**
 * CompleteBlockManagerEnhanced Component
 *
 * Main block management UI with create/timeline/calendar views.
 * Handles court blocking, wet courts, and event scheduling.
 */
import React, { useState } from 'react';
import { Edit2, X, CalendarDays } from '../components';
import { useOptimisticWetToggle } from '../courts/useOptimisticWetToggle.js';
import BlockTimeline from './BlockTimeline.jsx';
import RecurrenceConfig from './RecurrenceConfig.jsx';
import CourtSelectionGrid from './CourtSelectionGrid.jsx';
import BlockReasonSelector from './BlockReasonSelector.jsx';
import EventDetailsModal from '../calendar/EventDetailsModal.jsx';
import ConflictDetector from '../components/blocks/ConflictDetector.jsx';
import { useBlockForm } from './hooks/useBlockForm';
import { useBlockActions } from './hooks/useBlockActions';
import EditModeBanner from './EditModeBanner.jsx';
import QuickTemplatesCard from './QuickTemplatesCard.jsx';
import DateSelectionCard from './DateSelectionCard.jsx';
import WetCourtManagementPanel from './WetCourtManagementPanel.jsx';
import BlockSummaryCard from './BlockSummaryCard.jsx';
import BlockActionButtons from './BlockActionButtons.jsx';
import ManageRecurringPanel from './ManageRecurringPanel.jsx';
import SmartTimeRangePicker from '../../components/admin/SmartTimeRangePicker';

const DURATION_2H = 120; // minutes
const DURATION_4H = 240; // minutes

const blockTemplates = [
  { name: 'Wet Courts (2 hours)', reason: 'WET COURT', duration: DURATION_2H },
  { name: 'Maintenance (4 hours)', reason: 'COURT WORK', duration: DURATION_4H },
  { name: 'Morning Lesson', reason: 'LESSON', startTime: '09:00', endTime: '10:00' },
  { name: 'Evening Clinic', reason: 'CLINIC', startTime: '18:00', endTime: '20:00' },
];

// Complete Block Manager Component (Enhanced with Interactive Event Calendar)
/**
 * @param {Object} props
 * @param {import('../types/domainObjects.js').WetCourtsModel} props.wetCourtsModel
 * @param {import('../types/domainObjects.js').WetCourtsActions} props.wetCourtsActions
 * @param {import('../types/domainObjects.js').BlockModel} props.blockModel
 * @param {import('../types/domainObjects.js').BlockActions} props.blockActions
 * @param {import('../types/domainObjects.js').BlockComponents} props.components
 * @param {import('../types/domainObjects.js').AdminServices} props.services
 * @param {string} [props.defaultView] - Initial view mode ('timeline', 'calendar', 'create')
 */
const CompleteBlockManagerEnhanced = ({
  wetCourtsModel,
  wetCourtsActions,
  blockModel,
  blockActions,
  components,
  services,
  defaultView = 'timeline',
}) => {
  // Destructure domain objects to preserve original variable names
  const { active: wetCourtsActive, courts: wetCourts } = wetCourtsModel;
  const {
    courts = /** @type {any[]} */ ([]),
    blocks: courtBlocks = /** @type {any[]} */ ([]),
    hoursOverrides = /** @type {any[]} */ ([]),
    editingBlock: initialEditingBlock = null,
    // suspendedBlocks not destructured - unused in this component
  } = blockModel;
  const {
    applyBlocks: onApplyBlocks,
    onEditingConsumed: onEditingBlockConsumed = null,
    notify: onNotification,
  } = blockActions;
  const {
    MiniCalendar,
    EventCalendar: EventCalendarEnhanced,
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
  } = components;
  const { backend } = services;

  const form = useBlockForm({ defaultView, initialEditingBlock, onEditingBlockConsumed });
  const {
    selectedCourts,
    blockReason,
    startTime,
    endTime,
    selectedDate,
    recurrence,
    isEvent,
    isValid,
    setSelectedCourts,
    setBlockReason,
    setStartTime,
    setEndTime,
    setSelectedDate,
    setRecurrence,
    setIsEvent,
    activeView,
    showTemplates,
    setShowTemplates,
    showRecurrence,
    setShowRecurrence,
    endManuallySet,
    setEndManuallySet,
    editingBlock,
    selectedBlock,
    setSelectedBlock,
    refreshTrigger,
    setRefreshTrigger,
    resetForm,
    populateFromBlock,
  } = form;

  const [showManageRecurring, setShowManageRecurring] = useState(false);

  const currentTime = new Date();

  // Wet court operations — use controller-provided actions directly
  const handleEmergencyWetCourt = wetCourtsActions.activateEmergency;
  const deactivateWetCourts = wetCourtsActions.deactivateAll;

  // Shared optimistic wet toggle — same implementation as CourtStatusGrid
  const { optimisticWetCourts, handleWetCourtToggle: clearWetCourt } = useOptimisticWetToggle({
    wetCourts,
    clearCourt: wetCourtsActions.clearCourt,
  });

  // Use optimistic wet courts when in-flight, otherwise real data
  const displayWetCourts = optimisticWetCourts || wetCourts;

  const {
    handleTemplateSelect,
    handleBlockCourts,
    handleRemoveBlock,
    toggleCourtSelection,
    handleEditBlock,
    handleDuplicateBlock,
    handleQuickReasonSelect,
    handleRemoveBlockGroup,
  } = useBlockActions({ form, backend, onApplyBlocks, onNotification });

  return (
    <div className="space-y-6" data-testid="admin-block-list">
      <div className="flex items-center justify-between">
        {editingBlock && activeView === 'create' && (
          <EditModeBanner
            editingBlock={editingBlock}
            onCancel={resetForm}
            Edit2Icon={Edit2}
            XIcon={X}
          />
        )}
      </div>

      {activeView === 'timeline' && (
        <BlockTimeline
          courts={courts}
          currentTime={currentTime}
          onEditBlock={handleEditBlock}
          onRemoveBlock={handleRemoveBlock}
          onRemoveBlockGroup={handleRemoveBlockGroup}
          onDuplicateBlock={handleDuplicateBlock}
          refreshTrigger={refreshTrigger}
          backend={backend}
        />
      )}

      {activeView === 'calendar' && EventCalendarEnhanced && (
        <EventCalendarEnhanced
          courts={courts}
          currentTime={currentTime}
          refreshTrigger={refreshTrigger}
          onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
          backend={backend}
          hoursOverrides={hoursOverrides}
          MonthView={MonthView}
          EventSummary={EventSummary}
          HoverCard={HoverCard}
          QuickActionsMenu={QuickActionsMenu}
          onEditEvent={(blockToEdit) => populateFromBlock(blockToEdit)}
          onDuplicateEvent={(event) => populateFromBlock(event, { duplicate: true })}
        />
      )}

      {activeView === 'create' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-6">
            <CourtSelectionGrid
              selectedCourts={selectedCourts}
              onToggleCourt={toggleCourtSelection}
              editingBlock={editingBlock}
              onSelectAll={() => setSelectedCourts([...Array(12)].map((_, i) => i + 1))}
              onClearSelection={() => setSelectedCourts([])}
            />

            <BlockReasonSelector
              blockReason={blockReason}
              onQuickReasonSelect={handleQuickReasonSelect}
              onCustomReasonChange={setBlockReason}
              wetCourtsActive={wetCourtsActive}
              wetCourts={displayWetCourts}
              deactivateWetCourts={deactivateWetCourts}
              handleEmergencyWetCourt={handleEmergencyWetCourt}
            />

            <div className="order-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex gap-6">
                  {/* Left: Time Picker + Repeat */}
                  <div className="flex-[3] min-w-0">
                    <SmartTimeRangePicker
                      startTime={startTime}
                      endTime={endTime}
                      onStartTimeChange={setStartTime}
                      onEndTimeChange={setEndTime}
                      endManuallySet={endManuallySet}
                      onEndManuallySet={setEndManuallySet}
                      selectedDate={selectedDate}
                    />
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (showRecurrence) {
                              setShowRecurrence(false);
                              setRecurrence(null);
                            } else {
                              setShowRecurrence(true);
                            }
                          }}
                          className={`py-2 px-3 rounded-lg font-medium transition-all shadow-sm border ${
                            showRecurrence
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-white hover:bg-blue-50 text-gray-700 border-blue-300 hover:border-blue-400'
                          }`}
                        >
                          {showRecurrence ? 'Repeat ▵' : 'Repeat ▽'}
                        </button>
                        <button
                          onClick={() => setShowManageRecurring((prev) => !prev)}
                          className={`py-2 px-3 rounded-lg font-medium transition-all shadow-sm border ${
                            showManageRecurring
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-white hover:bg-blue-50 text-gray-700 border-blue-300 hover:border-blue-400'
                          }`}
                        >
                          Manage Recurring
                        </button>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!isEvent}
                          onChange={(e) => setIsEvent(!e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded"
                        />
                        Hide on Calendar View
                      </label>
                    </div>
                    {showRecurrence && (
                      <RecurrenceConfig
                        recurrence={recurrence}
                        onRecurrenceChange={setRecurrence}
                      />
                    )}
                    {showManageRecurring && (
                      <div className="mt-3">
                        <ManageRecurringPanel
                          backend={backend}
                          onNotification={onNotification}
                          onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: Block Summary + Action Buttons */}
                  <div className="flex-[2] flex flex-col gap-4 min-w-0">
                    <BlockSummaryCard
                      selectedCourts={selectedCourts}
                      blockReason={blockReason}
                      startTime={startTime}
                      endTime={endTime}
                      recurrence={recurrence}
                    />

                    <div className="sticky bottom-0 bg-white pt-2">
                      <BlockActionButtons
                        handleBlockCourts={handleBlockCourts}
                        onClear={resetForm}
                        isValid={isValid}
                        editingBlock={editingBlock}
                        selectedCourts={selectedCourts}
                        recurrence={recurrence}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ConflictDetector
              courts={courts}
              courtBlocks={courtBlocks}
              selectedCourts={selectedCourts}
              startTime={startTime}
              endTime={endTime}
              selectedDate={selectedDate}
              editingBlock={editingBlock}
            />
          </div>

          <div className="space-y-6">
            <DateSelectionCard
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              MiniCalendar={MiniCalendar}
              CalendarDaysIcon={CalendarDays}
            />

            {/* Wet Court Management Panel */}
            {wetCourtsActive && (
              <WetCourtManagementPanel
                wetCourts={displayWetCourts}
                clearWetCourt={clearWetCourt}
                deactivateWetCourts={deactivateWetCourts}
              />
            )}

            <QuickTemplatesCard
              showTemplates={showTemplates}
              setShowTemplates={setShowTemplates}
              blockTemplates={blockTemplates}
              handleTemplateSelect={handleTemplateSelect}
            />
          </div>
        </div>
      )}

      {/* Block Details/Edit Modal */}
      {selectedBlock && (
        <EventDetailsModal
          event={selectedBlock}
          courts={courts.map((court, idx) => ({
            id: court?.id || `court-${idx + 1}`,
            courtNumber: idx + 1,
          }))}
          backend={backend}
          onClose={() => setSelectedBlock(null)}
          onSaved={() => {
            setSelectedBlock(null);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export default CompleteBlockManagerEnhanced;
