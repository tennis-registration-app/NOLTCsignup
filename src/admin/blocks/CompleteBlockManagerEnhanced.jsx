/**
 * CompleteBlockManagerEnhanced Component
 *
 * Main block management UI with create/timeline/calendar views.
 * Handles court blocking, wet courts, and event scheduling.
 */
import React, { useState, useEffect } from 'react';
import { Edit2, X, CalendarDays, Droplets } from '../components';
import BlockTimeline from './BlockTimeline.jsx';
import RecurrenceConfig from './RecurrenceConfig.jsx';
import CourtSelectionGrid from './CourtSelectionGrid.jsx';
import BlockReasonSelector from './BlockReasonSelector.jsx';
import EventDetailsModal from '../calendar/EventDetailsModal.jsx';
import ConflictDetector from '../components/blocks/ConflictDetector.jsx';
import { getEventTypeFromReason } from '../calendar/utils.js';
import { useWetCourts } from './hooks/useWetCourts';
import { expandRecurrenceDates } from './utils/expandRecurrenceDates';
import { logger } from '../../lib/logger.js';
import EditModeBanner from './EditModeBanner.jsx';
import QuickTemplatesCard from './QuickTemplatesCard.jsx';
import DateSelectionCard from './DateSelectionCard.jsx';
import WetCourtManagementPanel from './WetCourtManagementPanel.jsx';
import BlockSummaryCard from './BlockSummaryCard.jsx';
import BlockActionButtons from './BlockActionButtons.jsx';

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
  const { active: wetCourtsActive, courts: wetCourts, enabled: ENABLE_WET_COURTS } = wetCourtsModel;
  const {
    setActive: setWetCourtsActive,
    setCourts: setWetCourts,
    setSuspended: setSuspendedBlocks,
  } = wetCourtsActions;
  const {
    courts,
    blocks: courtBlocks = [],
    hoursOverrides = [],
    editingBlock: initialEditingBlock = null,
    // suspendedBlocks not destructured - unused in this component
  } = blockModel;
  const {
    applyBlocks: onApplyBlocks,
    onEditingConsumed: onEditingBlockConsumed = null,
    notify: onNotification,
  } = blockActions;
  const {
    VisualTimeEntry,
    MiniCalendar,
    EventCalendar: EventCalendarEnhanced,
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
    Tennis,
  } = components;
  const { backend } = services;
  const [activeView, setActiveView] = useState(defaultView);
  const [selectedCourts, setSelectedCourts] = useState([]);
  const [blockReason, setBlockReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timePickerMode, setTimePickerMode] = useState('visual');
  const [recurrence, setRecurrence] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isEvent, setIsEvent] = useState(true);
  const [eventType, setEventType] = useState('event');
  const [eventTitle, setEventTitle] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCustomReason, setShowCustomReason] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [originalValues, setOriginalValues] = useState(null);

  useEffect(() => {
    setActiveView(defaultView);
  }, [defaultView]);

  // Pre-fill form when initialEditingBlock is provided (from Court Status edit)
  useEffect(() => {
    if (initialEditingBlock) {
      setEditingBlock(initialEditingBlock);
      setSelectedCourts(initialEditingBlock.courtNumber ? [initialEditingBlock.courtNumber] : []);
      setBlockReason(initialEditingBlock.reason || '');
      setEventTitle(initialEditingBlock.title || initialEditingBlock.reason || '');
      setEventType(initialEditingBlock.blockType || 'maintenance');

      const startDateTime = initialEditingBlock.startTime || initialEditingBlock.startsAt;
      const endDateTime = initialEditingBlock.endTime || initialEditingBlock.endsAt;

      if (startDateTime) {
        const startDate = new Date(startDateTime);
        setSelectedDate(startDate);
        setStartTime(startDate.toTimeString().slice(0, 5));
      }
      if (endDateTime) {
        const endDate = new Date(endDateTime);
        setEndTime(endDate.toTimeString().slice(0, 5));
      }

      // Store original values for change detection
      setOriginalValues({
        courts: initialEditingBlock.courtNumber ? [initialEditingBlock.courtNumber] : [],
        reason: initialEditingBlock.reason || '',
        title: initialEditingBlock.title || initialEditingBlock.reason || '',
        eventType: initialEditingBlock.blockType || 'maintenance',
        startTime: startDateTime ? new Date(startDateTime).toTimeString().slice(0, 5) : '',
        endTime: endDateTime ? new Date(endDateTime).toTimeString().slice(0, 5) : '',
        selectedDate: startDateTime ? new Date(startDateTime).toDateString() : null,
      });

      // Clear after consuming so effect doesn't re-run
      if (onEditingBlockConsumed) {
        onEditingBlockConsumed();
      }
    }
  }, [initialEditingBlock, onEditingBlockConsumed]);

  const currentTime = new Date();

  // Wet court operations via hook
  const { handleEmergencyWetCourt, deactivateWetCourts, clearWetCourt } = useWetCourts({
    backend,
    onNotification,
    ENABLE_WET_COURTS,
    wetCourts,
    setWetCourts,
    setWetCourtsActive,
    setSuspendedBlocks,
    courts,
    setRefreshTrigger,
  });

  const blockTemplates = [
    { name: 'Wet Courts (2 hours)', reason: 'WET COURT', duration: 120 },
    { name: 'Maintenance (4 hours)', reason: 'COURT WORK', duration: 240 },
    { name: 'Morning Lesson', reason: 'LESSON', startTime: '09:00', endTime: '10:00' },
    { name: 'Evening Clinic', reason: 'CLINIC', startTime: '18:00', endTime: '20:00' },
  ];

  useEffect(() => {
    const hasValidTimes = startTime && endTime;
    const hasReason = blockReason.trim().length > 0;
    const hasCourts = selectedCourts.length > 0;

    let timeIsValid = true;
    if (hasValidTimes) {
      if (startTime !== 'now') {
        const start = new Date();
        const end = new Date();
        const [startHours, startMinutes] = startTime.split(':');
        const [endHours, endMinutes] = endTime.split(':');

        start.setHours(parseInt(startHours), parseInt(startMinutes), 0);
        end.setHours(parseInt(endHours), parseInt(endMinutes), 0);

        if (end <= start) {
          timeIsValid = false;
        }
      }
    }

    // Check if any values have changed from original (only when editing)
    let hasChanges = true; // Default true for new blocks
    if (editingBlock && originalValues) {
      hasChanges =
        JSON.stringify([...selectedCourts].sort()) !==
          JSON.stringify([...originalValues.courts].sort()) ||
        blockReason !== originalValues.reason ||
        eventTitle !== originalValues.title ||
        eventType !== originalValues.eventType ||
        startTime !== originalValues.startTime ||
        endTime !== originalValues.endTime ||
        selectedDate?.toDateString() !== originalValues.selectedDate;
    }

    setIsValid(hasValidTimes && hasReason && hasCourts && timeIsValid && hasChanges);
  }, [
    selectedCourts,
    blockReason,
    startTime,
    endTime,
    eventTitle,
    eventType,
    selectedDate,
    editingBlock,
    originalValues,
  ]);

  const handleTemplateSelect = (template) => {
    setBlockReason(template.reason);
    if (template.duration) {
      setStartTime('now');
      const end = new Date();
      end.setMinutes(end.getMinutes() + template.duration);
      setEndTime(end.toTimeString().slice(0, 5));
    } else {
      setStartTime(template.startTime);
      setEndTime(template.endTime);
    }
    setShowTemplates(false);
  };

  const handleBlockCourts = () => {
    const blocks = expandRecurrenceDates(selectedDate, recurrence);
    const now = new Date();

    const appliedBlocks = [];

    blocks.forEach((blockInfo) => {
      selectedCourts.forEach((courtNum) => {
        let actualStartTime;
        if (startTime === 'now') {
          actualStartTime = now;
        } else {
          actualStartTime = new Date(blockInfo.date);
          const [hours, minutes] = startTime.split(':');
          actualStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        const actualEndTime = new Date(blockInfo.date);
        const [endHours, endMinutes] = endTime.split(':');
        actualEndTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        if (actualEndTime < actualStartTime) {
          actualEndTime.setDate(actualEndTime.getDate() + 1);
        }

        appliedBlocks.push({
          id: Date.now().toString() + Math.random(),
          courtNumber: courtNum,
          reason: blockReason,
          title: eventTitle || blockReason, // Always preserve the title
          startTime: actualStartTime.toISOString(),
          endTime: actualEndTime.toISOString(),
          isEvent: isEvent,
          eventDetails: isEvent
            ? {
                title: eventTitle || blockReason,
                type: eventType,
                courts: selectedCourts,
              }
            : null,
          createdAt: new Date().toISOString(),
        });
      });
    });

    // If editing, remove the old block first
    if (editingBlock) {
      handleRemoveBlock(editingBlock.id);
    }

    logger.debug('BlockManager', 'Sending to applyBlocks', appliedBlocks);
    onApplyBlocks(appliedBlocks);

    // Reset form
    setSelectedCourts([]);
    setBlockReason('');
    setStartTime('');
    setEndTime('');
    setSelectedDate(new Date());
    setRecurrence(null);
    setEditingBlock(null);
    setOriginalValues(null);
    setIsEvent(false);
    setEventType('event');
    setEventTitle('');
  };

  const handleRemoveBlock = async (blockId) => {
    if (!backend) {
      logger.error('BlockManager', 'No backend available for delete');
      alert('Backend not available');
      return;
    }

    try {
      const result = await backend.admin.cancelBlock({
        blockId: blockId,
      });

      if (result.ok) {
        logger.debug('BlockManager', 'Block deleted successfully');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        logger.error('BlockManager', 'Failed to delete block', result.message);
        alert('Failed to delete block: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      logger.error('BlockManager', 'Error deleting block', error);
      alert('Error deleting block: ' + error.message);
    }
  };

  const toggleCourtSelection = (courtNum) => {
    setSelectedCourts((prev) =>
      prev.includes(courtNum) ? prev.filter((c) => c !== courtNum) : [...prev, courtNum]
    );
  };

  const handleEditBlock = (block) => {
    setSelectedBlock(block);
  };

  const handleDuplicateBlock = (block) => {
    setSelectedCourts([]);
    setBlockReason(block.reason);

    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    const durationMs = end - start;

    setStartTime('now');
    const newEnd = new Date(Date.now() + durationMs);
    setEndTime(newEnd.toTimeString().slice(0, 5));

    setActiveView('create');
  };

  const handleQuickReason = (reason) => {
    setBlockReason(reason);

    // Auto-set event type based on reason
    const autoEventType = getEventTypeFromReason(reason);
    if (autoEventType) {
      setEventType(autoEventType);
      setIsEvent(true); // Default to showing on calendar
      // Auto-generate event title
      if (!eventTitle || eventTitle.includes('(Copy)')) {
        setEventTitle(reason.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()));
      }
    } else {
      // Only WET COURT and similar should be hidden by default
      setIsEvent(false);
      setEventTitle('');
    }
  };

  // Wrapper for quick reason selection (calls handleQuickReason + clears custom mode)
  const handleQuickReasonSelect = (reason) => {
    handleQuickReason(reason);
    setShowCustomReason(false);
  };

  // Wrapper for "Other" button (enables custom mode + clears reason)
  const handleOtherClick = () => {
    setShowCustomReason(true);
    setBlockReason('');
  };

  return (
    <div className="space-y-6" data-testid="admin-block-list">
      <div className="flex items-center justify-between">
        {editingBlock && activeView === 'create' && (
          <EditModeBanner
            editingBlock={editingBlock}
            onCancel={() => {
              setEditingBlock(null);
              setOriginalValues(null);
              setSelectedCourts([]);
              setBlockReason('');
              setStartTime('');
              setEndTime('');
              setSelectedDate(new Date());
              setRecurrence(null);
            }}
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
          Tennis={Tennis}
          onEditEvent={(blockToEdit) => {
            // Switch to create view and populate form
            setActiveView('create');
            setEditingBlock(blockToEdit);
            setSelectedCourts([blockToEdit.courtNumber]);
            setBlockReason(blockToEdit.reason);

            const startDate = new Date(blockToEdit.startTime);
            const endDate = new Date(blockToEdit.endTime);
            const parsedStartTime = startDate.toTimeString().slice(0, 5);
            const parsedEndTime = endDate.toTimeString().slice(0, 5);

            setSelectedDate(startDate);
            setStartTime(parsedStartTime);
            setEndTime(parsedEndTime);

            // Set event details if it's an event
            if (blockToEdit.isEvent) {
              setIsEvent(true);
              setEventTitle(blockToEdit.eventDetails?.title || '');
              setEventType(blockToEdit.eventDetails?.type || 'event');
            }

            // Store original values for change detection
            setOriginalValues({
              courts: [blockToEdit.courtNumber],
              reason: blockToEdit.reason,
              title: blockToEdit.eventDetails?.title || blockToEdit.reason,
              eventType: blockToEdit.eventDetails?.type || 'maintenance',
              startTime: parsedStartTime,
              endTime: parsedEndTime,
              selectedDate: startDate.toDateString(),
            });
          }}
          onDuplicateEvent={(event) => {
            // Switch to create view with duplicated data
            setActiveView('create');
            setEditingBlock(null); // Not editing, creating new
            setOriginalValues(null); // Clear original values for new block
            setSelectedCourts(event.courtNumbers || []);
            setBlockReason(event.reason);

            // Set current time as start time
            setStartTime('now');

            // Calculate end time based on original duration
            const originalStart = new Date(event.startTime);
            const originalEnd = new Date(event.endTime);
            const durationMs = originalEnd - originalStart;
            const newEnd = new Date(Date.now() + durationMs);
            setEndTime(newEnd.toTimeString().slice(0, 5));

            setSelectedDate(new Date()); // Today's date

            // Set event details if it's an event
            if (event.isEvent && event.eventDetails) {
              setIsEvent(true);
              setEventTitle(event.eventDetails.title + ' (Copy)');
              setEventType(event.eventDetails.type);
            } else {
              setIsEvent(false);
              setEventTitle('');
              setEventType('event');
            }
          }}
        />
      )}

      {activeView === 'create' && (
        <div className="grid grid-cols-3 gap-6">
          <div
            className="col-span-2"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <QuickTemplatesCard
              showTemplates={showTemplates}
              setShowTemplates={setShowTemplates}
              blockTemplates={blockTemplates}
              handleTemplateSelect={handleTemplateSelect}
            />

            <CourtSelectionGrid
              selectedCourts={selectedCourts}
              onToggleCourt={toggleCourtSelection}
              editingBlock={editingBlock}
              onSelectAll={() => setSelectedCourts([...Array(12)].map((_, i) => i + 1))}
              onClearSelection={() => setSelectedCourts([])}
            />

            <BlockReasonSelector
              blockReason={blockReason}
              showCustomReason={showCustomReason}
              onQuickReasonSelect={handleQuickReasonSelect}
              onOtherClick={handleOtherClick}
              onCustomReasonChange={setBlockReason}
            />

            <div style={{ order: 3 }}>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                {VisualTimeEntry && (
                  <VisualTimeEntry
                    key={selectedDate.toISOString()}
                    startTime={startTime}
                    endTime={endTime}
                    onStartTimeChange={setStartTime}
                    onEndTimeChange={setEndTime}
                    selectedDate={selectedDate}
                    selectedCourts={selectedCourts}
                    blockReason={blockReason}
                    timePickerMode={timePickerMode}
                    setTimePickerMode={setTimePickerMode}
                    hideToggleButton={true}
                  />
                )}
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
                wetCourts={wetCourts}
                clearWetCourt={clearWetCourt}
                deactivateWetCourts={deactivateWetCourts}
              />
            )}

            {(selectedCourts.length > 0 || blockReason || startTime || endTime) && (
              <BlockSummaryCard
                selectedCourts={selectedCourts}
                blockReason={blockReason}
                startTime={startTime}
                endTime={endTime}
                recurrence={recurrence}
                isEvent={isEvent}
                eventType={eventType}
              />
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3">Event Title</h3>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g., Summer League - Division A"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!isEvent}
                  onChange={(e) => setIsEvent(!e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="font-medium">Hide on Calendar View</span>
              </label>

              <button
                onClick={() => setShowRecurrence(!showRecurrence)}
                className="py-2 px-3 rounded-lg font-medium transition-all shadow-sm border bg-white hover:bg-blue-50 text-gray-700 border-blue-300 hover:border-blue-400"
              >
                <div className="flex items-center gap-2">
                  <span>Repeat</span>
                  <span className="text-sm text-blue-600">{showRecurrence ? '△' : '▽'}</span>
                </div>
              </button>
            </div>

            {showRecurrence && (
              <RecurrenceConfig recurrence={recurrence} onRecurrenceChange={setRecurrence} />
            )}

            <BlockActionButtons
              handleBlockCourts={handleBlockCourts}
              isValid={isValid}
              editingBlock={editingBlock}
              selectedCourts={selectedCourts}
              recurrence={recurrence}
              wetCourtsActive={wetCourtsActive}
              wetCourts={wetCourts}
              deactivateWetCourts={deactivateWetCourts}
              handleEmergencyWetCourt={handleEmergencyWetCourt}
              DropletsIcon={Droplets}
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
