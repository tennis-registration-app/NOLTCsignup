/**
 * CompleteBlockManagerEnhanced Component
 *
 * Main block management UI with create/timeline/calendar views.
 * Handles court blocking, wet courts, and event scheduling.
 */
import React, { useState } from 'react';
import { Edit2, X, CalendarDays } from '../components';
import { useOptimisticWetToggle } from '../courts/useOptimisticWetToggle';
import BlockTimeline from './BlockTimeline';
import RecurrenceDropdown from './RecurrenceDropdown';
import CourtSelectionGrid from './CourtSelectionGrid';
import BlockReasonSelector from './BlockReasonSelector';
import EventDetailsModal from '../calendar/EventDetailsModal';
import ConflictDetector from '../components/blocks/ConflictDetector';
import { useBlockForm } from './hooks/useBlockForm';
import { useBlockActions } from './hooks/useBlockActions';
import EditModeBanner from './EditModeBanner';
import QuickTemplatesCard from './QuickTemplatesCard';
import DateSelectionCard from './DateSelectionCard';
import WetCourtManagementPanel from './WetCourtManagementPanel';
import BlockSummaryCard from './BlockSummaryCard';
import BlockActionButtons from './BlockActionButtons';
import ManageRecurringPanel from './ManageRecurringPanel';
import SmartTimeRangePicker from '../../components/admin/SmartTimeRangePicker';
import type { ComponentType } from 'react';
import type { BlockTimelineBackend } from './BlockTimeline';
import type { ManageRecurringBackend } from './ManageRecurringPanel';
import type { AdminBackend } from '../calendar/EventDetailsModal';

type CourtBlock = {courtNumber: number; id?: string; startTime: string; endTime: string; reason?: string};
type RecurrenceState = {pattern: string; frequency: number; endType: string; occurrences?: number; endDate?: string; daysOfWeek?: number[]} | null;
type CourtStatusItem = {session?: {group?: {players?: {name: string}[]}; startedAt: string; scheduledEndAt: string}; id?: string; courtNumber?: number};
type MiniCalendarProps = {selectedDate: Date; onDateSelect: (d: Date) => void};
type AdminBackendShape = {admin: Record<string, unknown>};

interface CompleteBlockManagerProps {
  wetCourtsModel: {active?: boolean; courts?: Set<number>};
  wetCourtsActions: {activateEmergency?: () => void; deactivateAll?: () => void; clearCourt?: (n: number) => void};
  blockModel: {courts?: CourtStatusItem[]; blocks?: CourtBlock[]; hoursOverrides?: object[]; editingBlock?: Record<string,unknown>|null};
  blockActions: {applyBlocks?: (b: unknown[]) => void; onEditingConsumed?: (() => void)|null; notify?: (msg: string, type: string) => void};
  components: {MiniCalendar?: ComponentType<MiniCalendarProps>; EventCalendar?: ComponentType<Record<string, unknown>>; MonthView?: ComponentType<Record<string, unknown>>; EventSummary?: ComponentType<Record<string, unknown>>; HoverCard?: ComponentType<Record<string, unknown>>; QuickActionsMenu?: ComponentType<Record<string, unknown>>};
  services: {backend?: AdminBackendShape | null};
  defaultView?: string;
}

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
}: CompleteBlockManagerProps) => {
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
  } = useBlockActions({ form, backend: backend as Parameters<typeof useBlockActions>[0]["backend"], onApplyBlocks: onApplyBlocks ?? (() => {}), onNotification: onNotification ?? (() => {}) });

  const blockTimelineBackend = backend as unknown as BlockTimelineBackend | null;
  const manageRecurringBackend = backend as unknown as ManageRecurringBackend | null;
  const eventDetailsBackend = backend as unknown as AdminBackend | null;
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
          backend={blockTimelineBackend}
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
          onEditEvent={(blockToEdit: Parameters<typeof populateFromBlock>[0]) => populateFromBlock(blockToEdit)}
          onDuplicateEvent={(event: Parameters<typeof populateFromBlock>[0]) => populateFromBlock(event, { duplicate: true })}
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
              wetCourtsActive={!!wetCourtsActive}
              wetCourts={displayWetCourts ?? new Set()}
              deactivateWetCourts={deactivateWetCourts ?? (() => {})}
              handleEmergencyWetCourt={handleEmergencyWetCourt ?? (() => {})}
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
                      onDateChange={setSelectedDate}
                    />
                    <div className="mt-3">
                      <RecurrenceDropdown
                        recurrence={recurrence}
                        onRecurrenceChange={(r) => setRecurrence(r as RecurrenceState)}
                        selectedDate={selectedDate}
                        triggerRowExtra={
                          <label className="ml-auto flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isEvent}
                              onChange={(e) => setIsEvent(!e.target.checked)}
                              className="w-4 h-4 text-red-600 rounded"
                            />
                            Hide on Calendar View
                          </label>
                        }
                      >
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => setShowManageRecurring((prev) => !prev)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          >
                            Manage Recurring
                          </button>
                        </div>
                      </RecurrenceDropdown>
                    </div>
                    {showManageRecurring && (
                      <div className="mt-3">
                        <ManageRecurringPanel
                          backend={manageRecurringBackend}
                          onNotification={onNotification ?? (() => {})}
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
                        isValid={!!isValid}
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
                wetCourts={displayWetCourts ?? new Set()}
                clearWetCourt={clearWetCourt}
                deactivateWetCourts={deactivateWetCourts ?? (() => {})}
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
          event={(selectedBlock as unknown) as import("../calendar/utils").CalendarEvent}
          courts={(courts as Array<Record<string, unknown>>).map((court, idx) => ({
            id: (court?.id as string | undefined) || `court-${idx + 1}`,
            courtNumber: idx + 1,
          }))}
          backend={eventDetailsBackend}
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
