import { useState, useEffect, useMemo } from 'react';

/**
 * Manages all block form state: field values, validation,
 * pre-fill from editing, and form reset/populate actions.
 */
export function useBlockForm({ defaultView, initialEditingBlock, onEditingBlockConsumed }) {
  const [activeView, setActiveView] = useState(defaultView);
  const [selectedCourts, setSelectedCourts] = useState([]);
  const [blockReason, setBlockReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timePickerMode, setTimePickerMode] = useState('visual');
  const [recurrence, setRecurrence] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
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

  const isValid = useMemo(() => {
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

    return hasValidTimes && hasReason && hasCourts && timeIsValid && hasChanges;
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

  /** Reset all form fields to defaults. */
  const resetForm = () => {
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

  /**
   * Populate form from an existing block (for edit or duplicate).
   * @param {Object} block - The block to populate from
   * @param {Object} [opts]
   * @param {boolean} [opts.duplicate] - If true, treat as duplicate (no editingBlock, "(Copy)" suffix)
   */
  const populateFromBlock = (block, opts = {}) => {
    const { duplicate = false } = opts;

    setActiveView('create');

    if (duplicate) {
      setEditingBlock(null);
      setOriginalValues(null);
      setSelectedCourts(block.courtNumbers || []);
      setBlockReason(block.reason);

      setStartTime('now');
      const originalStart = new Date(block.startTime);
      const originalEnd = new Date(block.endTime);
      const durationMs = originalEnd - originalStart;
      const newEnd = new Date(Date.now() + durationMs);
      setEndTime(newEnd.toTimeString().slice(0, 5));

      setSelectedDate(new Date());

      if (block.isEvent && block.eventDetails) {
        setIsEvent(true);
        setEventTitle(block.eventDetails.title + ' (Copy)');
        setEventType(block.eventDetails.type);
      } else {
        setIsEvent(false);
        setEventTitle('');
        setEventType('event');
      }
    } else {
      setEditingBlock(block);
      setSelectedCourts([block.courtNumber]);
      setBlockReason(block.reason);

      const startDate = new Date(block.startTime);
      const endDate = new Date(block.endTime);
      const parsedStartTime = startDate.toTimeString().slice(0, 5);
      const parsedEndTime = endDate.toTimeString().slice(0, 5);

      setSelectedDate(startDate);
      setStartTime(parsedStartTime);
      setEndTime(parsedEndTime);

      if (block.isEvent) {
        setIsEvent(true);
        setEventTitle(block.eventDetails?.title || '');
        setEventType(block.eventDetails?.type || 'event');
      }

      setOriginalValues({
        courts: [block.courtNumber],
        reason: block.reason,
        title: block.eventDetails?.title || block.reason,
        eventType: block.eventDetails?.type || 'maintenance',
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        selectedDate: startDate.toDateString(),
      });
    }
  };

  return {
    // Form state
    selectedCourts,
    blockReason,
    startTime,
    endTime,
    selectedDate,
    recurrence,
    isEvent,
    eventType,
    eventTitle,
    isValid,
    // Setters
    setSelectedCourts,
    setBlockReason,
    setStartTime,
    setEndTime,
    setSelectedDate,
    setRecurrence,
    setIsEvent,
    setEventType,
    setEventTitle,
    // UI toggles
    activeView,
    setActiveView,
    timePickerMode,
    setTimePickerMode,
    showTemplates,
    setShowTemplates,
    showCustomReason,
    setShowCustomReason,
    showRecurrence,
    setShowRecurrence,
    // Editing state
    editingBlock,
    setEditingBlock,
    selectedBlock,
    setSelectedBlock,
    refreshTrigger,
    setRefreshTrigger,
    originalValues,
    // Actions
    resetForm,
    populateFromBlock,
  };
}
