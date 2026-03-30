import React, { useCallback, useMemo } from 'react';
import { TimeScrollPicker, getNowSlot } from './TimeScrollPicker';

type TimeSlot = { hour: number; minute: number; label: string; value: number };

/**
 * Adapter between the form's HH:MM string contract and the
 * TimeScrollPicker's integer-minutes slot contract.
 *
 * Form contract (upstream):
 *   startTime: 'HH:MM' | 'now' | ''
 *   endTime:   'HH:MM' | ''
 *
 * TimeScrollPicker contract:
 *   onTimeChange(startSlot, endSlot)  — slot objects with .value (minutes), .hour, .minute
 *   initialStartValue / initialEndValue — integer minutes
 */
interface VisualTimeEntryProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (t: string) => void;
  onEndTimeChange: (t: string) => void;
  selectedDate?: Date;
  selectedCourts?: unknown;
  blockReason?: unknown;
  timePickerMode?: unknown;
  setTimePickerMode?: unknown;
  hideToggleButton?: unknown;
}

export function VisualTimeEntry({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  selectedDate = new Date(),
  // Accepted for interface compatibility; not used by scroll picker
  selectedCourts: _selectedCourts,
  blockReason: _blockReason,
  timePickerMode: _timePickerMode,
  setTimePickerMode: _setTimePickerMode,
  hideToggleButton: _hideToggleButton,
}: VisualTimeEntryProps) {
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Convert HH:MM string → integer minutes for the picker
  const initialStartValue = useMemo(() => {
    if (!startTime || startTime === 'now') {
      if (startTime === 'now') {
        return getNowSlot().value;
      }
      return null;
    }
    const [h, m] = startTime.split(':').map(Number);
    return h * 60 + m;
  }, [startTime]);

  const initialEndValue = useMemo(() => {
    if (!endTime) return null;
    const [h, m] = endTime.split(':').map(Number);
    return h * 60 + m;
  }, [endTime]);

  // Convert slot objects back to HH:MM strings for the form
  const handleTimeChange = useCallback(
    (startSlot: TimeSlot | null, endSlot: TimeSlot | null) => {
      if (startSlot) {
        const hh = String(startSlot.hour).padStart(2, '0');
        const mm = String(startSlot.minute).padStart(2, '0');
        onStartTimeChange(`${hh}:${mm}`);
      }
      if (endSlot) {
        const hh = String(endSlot.hour).padStart(2, '0');
        const mm = String(endSlot.minute).padStart(2, '0');
        onEndTimeChange(`${hh}:${mm}`);
      }
    },
    [onStartTimeChange, onEndTimeChange]
  );

  return (
    <TimeScrollPicker
      onTimeChange={handleTimeChange}
      initialStartValue={initialStartValue}
      initialEndValue={initialEndValue}
      isToday={isToday}
    />
  );
}
