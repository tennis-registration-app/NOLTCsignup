/**
 * CompleteBlockManagerEnhanced Component
 *
 * Main block management UI with create/timeline/calendar views.
 * Handles court blocking, wet courts, and event scheduling.
 */
import React, { useState, useEffect } from 'react';
import {
  Edit2,
  X,
  Plus,
  CalendarDays,
  Droplets,
  AlertTriangle,
  Wrench,
  GraduationCap,
  Users,
} from '../components';
import BlockTimeline from './BlockTimeline.jsx';
import RecurrenceConfig from './RecurrenceConfig.jsx';
import EventDetailsModal from '../calendar/EventDetailsModal.jsx';
import { getEventTypeFromReason } from '../calendar/utils.js';

// Get dependencies from window
const Tennis = window.Tennis;
const Events = window.Events;
const WC = window.WC;

// Conflict Detection Component
const ConflictDetector = ({
  courts,
  selectedCourts,
  startTime,
  endTime,
  selectedDate,
  editingBlock,
}) => {
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (!selectedCourts.length || !startTime || !endTime) {
      setConflicts([]);
      return;
    }

    const detectedConflicts = [];

    selectedCourts.forEach((courtNum) => {
      const court = courts[courtNum - 1];
      if (!court) return;

      let blockStart, blockEnd;

      if (startTime === 'now') {
        blockStart = new Date();
      } else {
        blockStart = new Date(selectedDate);
        const [hours, minutes] = startTime.split(':');
        blockStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      blockEnd = new Date(selectedDate);
      const [endHours, endMinutes] = endTime.split(':');
      blockEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      if (blockEnd < blockStart) {
        blockEnd.setDate(blockEnd.getDate() + 1);
      }

      // Check for existing blocks in localStorage
      try {
        const courtBlocks = JSON.parse(localStorage.getItem('courtBlocks') || '[]');

        courtBlocks.forEach((block) => {
          if (block.courtNumber === courtNum && (!editingBlock || block.id !== editingBlock.id)) {
            const existingStart = new Date(block.startTime);
            const existingEnd = new Date(block.endTime);

            if (
              (blockStart >= existingStart && blockStart < existingEnd) ||
              (blockEnd > existingStart && blockEnd <= existingEnd) ||
              (blockStart <= existingStart && blockEnd >= existingEnd)
            ) {
              detectedConflicts.push({
                courtNumber: courtNum,
                type: 'block',
                reason: block.reason,
                time: `${existingStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${existingEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              });
            }
          }
        });
      } catch (error) {
        console.error('Error checking block conflicts:', error);
      }

      // Check session using Domain format: court.session.group.players
      const sessionPlayers = court?.session?.group?.players;
      if (sessionPlayers) {
        const bookingStart = new Date(court.session.startedAt);
        const bookingEnd = new Date(court.session.scheduledEndAt);

        if (
          (blockStart >= bookingStart && blockStart < bookingEnd) ||
          (blockEnd > bookingStart && blockEnd <= bookingEnd) ||
          (blockStart <= bookingStart && blockEnd >= bookingEnd)
        ) {
          detectedConflicts.push({
            courtNumber: courtNum,
            type: 'booking',
            players: sessionPlayers.map((p) => p.name),
            time: `${bookingStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${bookingEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          });
        }
      }
    });

    setConflicts(detectedConflicts);
  }, [courts, selectedCourts, startTime, endTime, selectedDate]);

  if (conflicts.length === 0) return null;

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-900 mb-2">Conflicts Detected</h4>
          <div className="space-y-2">
            {conflicts.map((conflict, idx) => (
              <div key={idx} className="text-sm text-yellow-800">
                <span className="font-medium">Court {conflict.courtNumber}</span>
                {conflict.type === 'block' ? (
                  <span>
                    : Already blocked ({conflict.reason}) at {conflict.time}
                  </span>
                ) : (
                  <span>
                    : Booked by {conflict.players.join(', ')} at {conflict.time}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-yellow-700">
            You can still create this block, but existing bookings will need to be handled.
          </p>
        </div>
      </div>
    </div>
  );
};

// Complete Block Manager Component (Enhanced with Interactive Event Calendar)
const CompleteBlockManagerEnhanced = ({
  courts,
  onApplyBlocks,
  existingBlocks,
  wetCourtsActive,
  setWetCourtsActive,
  wetCourts,
  setWetCourts,
  suspendedBlocks,
  setSuspendedBlocks,
  ENABLE_WET_COURTS,
  onNotification,
  defaultView = 'timeline',
  // These components are passed from parent
  VisualTimeEntry,
  MiniCalendar,
  EventCalendarEnhanced,
  // Calendar view components for Month view support
  MonthView,
  EventSummary,
  HoverCard,
  QuickActionsMenu,
  Tennis,
  backend, // TennisBackend for API calls
  hoursOverrides = [], // Holiday/special hours for calendar indicators
  initialEditingBlock = null,
  onEditingBlockConsumed = null,
}) => {
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

      // Clear after consuming so effect doesn't re-run
      if (onEditingBlockConsumed) {
        onEditingBlockConsumed();
      }
    }
  }, [initialEditingBlock, onEditingBlockConsumed]);

  const currentTime = new Date();

  // Get device ID from window.Tennis or fallback
  const getDeviceId = () => {
    return window.Tennis?.deviceId || localStorage.getItem('deviceId') || 'admin-device';
  };

  // Wet Court Helper Functions - Using API
  const handleEmergencyWetCourt = async () => {
    if (!ENABLE_WET_COURTS) return;
    if (!backend) {
      console.error('Backend not available');
      onNotification?.('Backend not available', 'error');
      return;
    }

    console.log('🌧️ Emergency wet court - calling API');

    try {
      const result = await backend.admin.markWetCourts({
        deviceId: getDeviceId(),
        durationMinutes: 720, // 12 hours
        reason: 'WET COURT',
        idempotencyKey: `wet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      if (result.ok) {
        console.log(`✅ Marked ${result.courtsMarked} courts as wet until ${result.endsAt}`);
        onNotification?.(`All ${result.courtsMarked} courts marked wet`, 'success');

        // Update local state for UI
        const allCourts = new Set(result.courtNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        setWetCourts(allCourts);
        setWetCourtsActive(true);

        // Emit event for legacy components (if available)
        Events?.emitDom?.('tennisDataUpdate', { key: 'wetCourts', data: Array.from(allCourts) });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error('Failed to mark wet courts:', result.message);
        onNotification?.(result.message || 'Failed to mark wet courts', 'error');
      }
    } catch (error) {
      console.error('Error marking wet courts:', error);
      onNotification?.('Error marking wet courts', 'error');
    }
  };

  const deactivateWetCourts = async () => {
    if (!ENABLE_WET_COURTS) return;
    if (!backend) {
      onNotification?.('Backend not available', 'error');
      return;
    }

    try {
      const result = await backend.admin.clearWetCourts({
        deviceId: getDeviceId(),
      });

      if (result.ok) {
        console.log(`✅ Cleared ${result.blocksCleared} wet court blocks`);
        onNotification?.(`Cleared ${result.blocksCleared} wet courts`, 'success');

        // Update local state
        setWetCourtsActive(false);
        setWetCourts(new Set());
        setSuspendedBlocks([]);

        // Emit event for legacy components (if available)
        Events?.emitDom?.('tennisDataUpdate', { key: 'wetCourts', data: [] });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error('Failed to clear wet courts:', result.message);
        onNotification?.(result.message || 'Failed to clear wet courts', 'error');
      }
    } catch (error) {
      console.error('Error clearing wet courts:', error);
      onNotification?.('Error clearing wet courts', 'error');
    }
  };

  // Clear individual wet court via API
  const clearWetCourt = async (courtNumber) => {
    if (!ENABLE_WET_COURTS) return;
    if (!backend) {
      onNotification?.('Backend not available', 'error');
      return;
    }

    console.log(`☀️ Clearing wet court ${courtNumber}`);

    // Get court ID from courts array
    const court = courts[courtNumber - 1];
    if (!court?.id) {
      console.error(`Court ${courtNumber} not found`);
      onNotification?.(`Court ${courtNumber} not found`, 'error');
      return;
    }

    try {
      const result = await backend.admin.clearWetCourts({
        deviceId: getDeviceId(),
        courtIds: [court.id],
      });

      if (result.ok) {
        // Update local UI state
        const newWetCourts = new Set(wetCourts);
        newWetCourts.delete(courtNumber);
        setWetCourts(newWetCourts);

        // Emit event for legacy components (if available)
        Events?.emitDom?.('tennisDataUpdate', { key: 'wetCourts', data: Array.from(newWetCourts) });

        // If all courts are dry, update active state
        if (newWetCourts.size === 0) {
          setWetCourtsActive(false);
        }

        onNotification?.(`Court ${courtNumber} cleared`, 'success');
      } else {
        console.error('Failed to clear wet court:', result.message);
        onNotification?.(result.message || 'Failed to clear wet court', 'error');
      }
    } catch (error) {
      console.error('Error clearing wet court:', error);
      onNotification?.('Error clearing wet court', 'error');
    }
  };

  const quickReasons = [
    {
      label: 'COURT WORK',
      icon: Wrench,
      color: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
    },
    {
      label: 'LESSON',
      icon: GraduationCap,
      color: 'bg-green-100 hover:bg-green-200 text-green-700',
    },
    { label: 'CLINIC', icon: Users, color: 'bg-purple-100 hover:bg-purple-200 text-purple-700' },
  ];

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

    setIsValid(hasValidTimes && hasReason && hasCourts && timeIsValid);
  }, [selectedCourts, blockReason, startTime, endTime]);

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
    const blocks = [];
    const now = new Date();

    if (!recurrence) {
      blocks.push({ date: selectedDate });
    } else {
      let currentDate = new Date(selectedDate);
      let occurrenceCount = 0;

      while (true) {
        blocks.push({ date: new Date(currentDate) });
        occurrenceCount++;

        if (recurrence.endType === 'after' && occurrenceCount >= recurrence.occurrences) {
          break;
        }
        if (recurrence.endType === 'date' && currentDate > new Date(recurrence.endDate)) {
          break;
        }

        if (recurrence.pattern === 'daily') {
          currentDate.setDate(currentDate.getDate() + recurrence.frequency);
        } else if (recurrence.pattern === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7 * recurrence.frequency);
        } else if (recurrence.pattern === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + recurrence.frequency);
        }

        if (occurrenceCount > 365) break;
      }
    }

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

    console.log('🔍 Sending to applyBlocks:', appliedBlocks);
    onApplyBlocks(appliedBlocks);

    // Reset form
    setSelectedCourts([]);
    setBlockReason('');
    setStartTime('');
    setEndTime('');
    setSelectedDate(new Date());
    setRecurrence(null);
    setEditingBlock(null);
    setIsEvent(false);
    setEventType('event');
    setEventTitle('');
  };

  const handleRemoveBlock = async (blockId) => {
    if (!backend) {
      console.error('No backend available for delete');
      alert('Backend not available');
      return;
    }

    try {
      const result = await backend.admin.cancelBlock({
        blockId: blockId,
      });

      if (result.ok) {
        console.log('✅ Block deleted successfully');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error('Failed to delete block:', result.message);
        alert('Failed to delete block: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting block:', error);
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

  return (
    <div className="space-y-6" data-testid="admin-block-list">
      <div className="flex items-center justify-between">
        {editingBlock && activeView === 'create' && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Edit2 size={16} />
            <span>Editing block on Court {editingBlock.courtNumber}</span>
            <button
              onClick={() => {
                setEditingBlock(null);
                setSelectedCourts([]);
                setBlockReason('');
                setStartTime('');
                setEndTime('');
                setSelectedDate(new Date());
                setRecurrence(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
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

            setSelectedDate(startDate);
            setStartTime(startDate.toTimeString().slice(0, 5));
            setEndTime(endDate.toTimeString().slice(0, 5));

            // Set event details if it's an event
            if (blockToEdit.isEvent) {
              setIsEvent(true);
              setEventTitle(blockToEdit.eventDetails?.title || '');
              setEventType(blockToEdit.eventDetails?.type || 'event');
            }
          }}
          onDuplicateEvent={(event) => {
            // Switch to create view with duplicated data
            setActiveView('create');
            setEditingBlock(null); // Not editing, creating new
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
            <div style={{ order: 4 }}>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800">Quick Templates</h3>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>{showTemplates ? 'Hide' : 'Show'}</span>
                    <span className="text-xs">{showTemplates ? '△' : '▽'}</span>
                  </button>
                </div>

                {showTemplates && (
                  <div className="grid grid-cols-2 gap-3">
                    {blockTemplates.map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleTemplateSelect(template)}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left border border-gray-200"
                      >
                        <p className="font-medium text-gray-800">{template.name}</p>
                        <p className="text-sm text-gray-600">{template.reason}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ order: 1 }}>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3
                  className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-100 pb-2"
                  style={{ marginTop: '0', lineHeight: '1.75rem' }}
                >
                  Select Courts to Block
                </h3>
                <div className="grid grid-cols-6 gap-2">
                  {[...Array(12)].map((_, idx) => {
                    const courtNum = idx + 1;
                    const isSelected = selectedCourts.includes(courtNum);

                    return (
                      <button
                        key={courtNum}
                        onClick={() => toggleCourtSelection(courtNum)}
                        disabled={editingBlock && editingBlock.courtNumber !== courtNum}
                        className={`py-2 px-3 rounded-lg font-medium transition-all shadow-sm border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                            : editingBlock && editingBlock.courtNumber !== courtNum
                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        Court {courtNum}
                      </button>
                    );
                  })}
                </div>
                {!editingBlock && (
                  <div className="mt-3 flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedCourts([...Array(12)].map((_, i) => i + 1))}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedCourts([])}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ order: 2 }}>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-100 pb-2">
                  Block Reason
                </h3>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {quickReasons.map((reason) => {
                      const Icon = reason.icon;
                      return (
                        <button
                          key={reason.label}
                          onClick={() => {
                            handleQuickReason(reason.label);
                            setShowCustomReason(false);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            blockReason === reason.label ? 'bg-blue-600 text-white' : reason.color
                          }`}
                        >
                          <Icon size={18} />
                          {reason.label}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        setShowCustomReason(true);
                        setBlockReason('');
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm border ${
                        showCustomReason
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Plus size={18} />
                      Other
                    </button>
                  </div>

                  {showCustomReason && (
                    <input
                      ref={(input) => input && input.focus()}
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Enter custom reason..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>

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
              selectedCourts={selectedCourts}
              startTime={startTime}
              endTime={endTime}
              selectedDate={selectedDate}
              editingBlock={editingBlock}
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3
                className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-100 pb-2"
                style={{ marginTop: '0', lineHeight: '1.75rem' }}
              >
                Select Date
              </h3>

              {MiniCalendar && (
                <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
              )}

              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays size={16} className="text-gray-600" />
                  <span className="font-medium">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Wet Court Management Panel */}
            {wetCourtsActive && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-red-900">🌧️ Wet Court Conditions</h4>
                  <span className="text-sm text-red-700">
                    {12 - wetCourts.size}/12 courts operational
                  </span>
                </div>

                <p className="text-sm text-red-800 mb-4">
                  Click courts below as they dry to resume normal operations.
                </p>

                {/* Court Grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((courtNum) => {
                    const isWet = wetCourts.has(courtNum);
                    return (
                      <button
                        key={courtNum}
                        onClick={() => clearWetCourt(courtNum)}
                        className={`p-2 rounded text-sm font-medium transition-all ${
                          isWet
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        Court {courtNum}
                        <div className="text-xs mt-1">{isWet ? '💧 Wet' : '☀️ Dry'}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Action */}
                <button
                  onClick={() => {
                    deactivateWetCourts();
                  }}
                  className="w-full py-2 px-3 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
                >
                  ✅ All Courts Dry - Resume Normal Operations
                </button>
              </div>
            )}

            {(selectedCourts.length > 0 || blockReason || startTime || endTime) && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Block Summary</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  {selectedCourts.length > 0 && (
                    <div>
                      <span className="font-medium">Courts:</span>{' '}
                      {selectedCourts.sort((a, b) => a - b).join(', ')}
                    </div>
                  )}
                  {blockReason && (
                    <div>
                      <span className="font-medium">Reason:</span> {blockReason}
                    </div>
                  )}
                  {startTime && endTime && (
                    <div>
                      <span className="font-medium">Time:</span>{' '}
                      {startTime === 'now' ? 'Now' : startTime} - {endTime}
                    </div>
                  )}
                  {recurrence && (
                    <div>
                      <span className="font-medium">Repeats:</span> {recurrence.pattern}ly for{' '}
                      {recurrence.endType === 'after'
                        ? `${recurrence.occurrences} times`
                        : `until ${recurrence.endDate}`}
                    </div>
                  )}
                  {isEvent && (
                    <div>
                      <span className="font-medium">Event Calendar:</span> Yes ({eventType})
                    </div>
                  )}
                </div>
              </div>
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

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <button
                onClick={handleBlockCourts}
                disabled={!isValid}
                data-testid="admin-block-create-btn"
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isValid
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {editingBlock ? 'Update' : 'Apply'} Block to{' '}
                {selectedCourts.length <= 3
                  ? `Court${selectedCourts.length !== 1 ? 's' : ''} ${selectedCourts.sort((a, b) => a - b).join(', ')}`
                  : `${selectedCourts.length} Courts`}
                {recurrence && ` (${recurrence.pattern}ly)`}
              </button>

              <button
                onClick={wetCourtsActive ? deactivateWetCourts : handleEmergencyWetCourt}
                className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all border ${
                  wetCourtsActive
                    ? 'bg-gray-600 text-white border-blue-400 ring-1 ring-blue-400 shadow-md'
                    : 'bg-blue-50 hover:bg-blue-100 text-gray-700 border-blue-300 hover:border-blue-400'
                }`}
              >
                <Droplets size={16} />
                WET COURTS
                {wetCourtsActive && wetCourts.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {wetCourts.size}
                  </span>
                )}
              </button>
            </div>
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
