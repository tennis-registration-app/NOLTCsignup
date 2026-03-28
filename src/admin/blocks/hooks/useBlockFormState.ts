import { useState } from 'react';

/**
 * useBlockFormState
 *
 * Extracted from CompleteBlockManagerEnhanced.jsx
 *
 * Consolidates form-related state for block creation/editing.
 * Each useState is preserved verbatim from the original component.
 */
export function useBlockFormState() {
  // Court selection - line 55
  const [selectedCourts, setSelectedCourts] = useState([]);

  // Block details - lines 56-58
  const [blockReason, setBlockReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Date selection - line 59
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Recurrence - line 61
  const [recurrence, setRecurrence] = useState(null);

  // Event/calendar settings - lines 66-68
  const [isEvent, setIsEvent] = useState(true);
  const [eventType, setEventType] = useState('event');
  const [eventTitle, setEventTitle] = useState('');

  // Edit mode - lines 64, 72
  const [editingBlock, setEditingBlock] = useState(null);
  const [originalValues, setOriginalValues] = useState(null);

  return {
    // State values
    selectedCourts,
    blockReason,
    startTime,
    endTime,
    selectedDate,
    recurrence,
    isEvent,
    eventType,
    eventTitle,
    editingBlock,
    originalValues,

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
    setEditingBlock,
    setOriginalValues,
  };
}
