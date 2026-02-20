import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from './Icons';

const DURATION_2H = 120; // minutes
const DURATION_4H = 240; // minutes

// Enhanced Time Entry Component
export function VisualTimeEntry({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  selectedDate = new Date(),
  selectedCourts = [],
  blockReason = '',
  timePickerMode = 'visual',
  setTimePickerMode = null,
  hideToggleButton = false,
}) {
  const [duration, setDuration] = useState({ hours: 0, minutes: 0 });
  const [validationError, setValidationError] = useState('');
  const [lastUsedDuration, setLastUsedDuration] = useState(null);

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const isPast =
          isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinutes));

        slots.push({
          hour,
          minute,
          label: `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`,
          value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          isPast,
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (startTime && endTime && startTime !== 'now') {
      const start = new Date();
      const end = new Date();
      const [startHours, startMinutes] = startTime.split(':');
      const [endHours, endMinutes] = endTime.split(':');

      start.setHours(parseInt(startHours), parseInt(startMinutes), 0);
      end.setHours(parseInt(endHours), parseInt(endMinutes), 0);

      if (end < start) {
        end.setDate(end.getDate() + 1);
      }

      const diffMs = end - start;
      const diffMinutes = Math.floor(diffMs / 60000);

      setDuration({
        hours: Math.floor(diffMinutes / 60),
        minutes: diffMinutes % 60,
      });

      if (diffMinutes <= 0) {
        setValidationError('End time must be after start time');
      } else if (diffMinutes > 720) {
        setValidationError('Block duration cannot exceed 12 hours');
      } else {
        setValidationError('');
      }
    } else if (startTime === 'now' && endTime) {
      const now = new Date();
      const end = new Date();
      const [endHours, endMinutes] = endTime.split(':');
      end.setHours(parseInt(endHours), parseInt(endMinutes), 0);

      if (end < now) {
        end.setDate(end.getDate() + 1);
      }

      const diffMs = end - now;
      const diffMinutes = Math.floor(diffMs / 60000);

      setDuration({
        hours: Math.floor(diffMinutes / 60),
        minutes: diffMinutes % 60,
      });

      if (diffMinutes <= 0) {
        setValidationError('End time must be in the future');
      } else {
        setValidationError('');
      }
    }
  }, [startTime, endTime]);

  const durationPresets = [
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '2 hours', minutes: DURATION_2H },
    { label: '4 hours', minutes: DURATION_4H },
  ];

  const applyPresetDuration = (minutes) => {
    let baseTime = new Date();

    if (startTime !== 'now' && startTime) {
      const [hours, mins] = startTime.split(':');
      baseTime.setHours(parseInt(hours), parseInt(mins), 0);
    }

    const endDate = new Date(baseTime.getTime() + minutes * 60000);
    const endTimeString = endDate.toTimeString().slice(0, 5);
    onEndTimeChange(endTimeString);
  };

  const handleSlotClick = (slot, isStart) => {
    if (slot.isPast && isStart) return;

    if (isStart) {
      onStartTimeChange(slot.value);
      if (!endTime) {
        const [hours, minutes] = slot.value.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        date.setMinutes(date.getMinutes() + DURATION_2H);
        onEndTimeChange(date.toTimeString().slice(0, 5));
      }
    } else {
      onEndTimeChange(slot.value);
    }
  };

  const isSlotSelected = (slot, isStart) => {
    if (isStart) {
      return startTime === slot.value;
    } else {
      return endTime === slot.value;
    }
  };

  const isSlotInRange = (slot) => {
    if (!startTime || !endTime || startTime === 'now') return false;

    const slotTime = new Date();
    slotTime.setHours(slot.hour, slot.minute, 0);

    const start = new Date();
    const [startHours, startMinutes] = startTime.split(':');
    start.setHours(parseInt(startHours), parseInt(startMinutes), 0);

    const end = new Date();
    const [endHours, endMinutes] = endTime.split(':');
    end.setHours(parseInt(endHours), parseInt(endMinutes), 0);

    return slotTime > start && slotTime < end;
  };

  return (
    <div className="space-y-4">
      {startTime && endTime && (
        <div className={`p-3 rounded-lg ${validationError ? 'bg-red-50' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className={validationError ? 'text-red-600' : 'text-blue-600'} />
              <span className={`font-medium ${validationError ? 'text-red-700' : 'text-blue-700'}`}>
                {validationError
                  ? validationError
                  : `Duration: ${duration.hours}h ${duration.minutes}m`}
              </span>
            </div>
            {validationError && <AlertCircle size={16} className="text-red-600" />}
          </div>
        </div>
      )}

      {!hideToggleButton && setTimePickerMode && (
        <div className="flex items-center">
          <button
            onClick={() => setTimePickerMode(timePickerMode === 'visual' ? 'manual' : 'visual')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {timePickerMode === 'visual' ? 'Switch to manual input' : 'Switch to visual picker'}
          </button>
        </div>
      )}

      {timePickerMode === 'visual' ? (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Start Time</label>
                {selectedDate.toDateString() === new Date().toDateString() && (
                  <button
                    onClick={() => onStartTimeChange('now')}
                    className={`px-3 py-1 text-sm rounded-lg transition-all ${
                      startTime === 'now'
                        ? 'bg-blue-600 text-white'
                        : selectedCourts.length > 0 && blockReason
                          ? 'bg-blue-50 hover:bg-blue-100 border border-blue-300 shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Start Now
                  </button>
                )}
              </div>
              {setTimePickerMode && (
                <button
                  onClick={() =>
                    setTimePickerMode(timePickerMode === 'visual' ? 'manual' : 'visual')
                  }
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {timePickerMode === 'visual'
                    ? 'Switch to manual input'
                    : 'Switch to visual picker'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  onClick={() => handleSlotClick(slot, true)}
                  disabled={slot.isPast}
                  className={`py-2 px-3 text-sm rounded-lg transition-colors ${
                    isSlotSelected(slot, true)
                      ? 'bg-blue-600 text-white'
                      : slot.isPast
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {startTime && (
            <div>
              <label className="block text-sm font-medium mb-2">Quick Duration</label>
              <div className="grid grid-cols-4 gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      applyPresetDuration(preset.minutes);
                      setLastUsedDuration(preset.minutes);
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all shadow-sm border ${
                      lastUsedDuration === preset.minutes
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-300 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">End Time</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {timeSlots.map((slot) => {
                const isDisabled = startTime && startTime !== 'now' && slot.value <= startTime;
                return (
                  <button
                    key={slot.value}
                    onClick={() => handleSlotClick(slot, false)}
                    disabled={isDisabled}
                    className={`py-2 px-3 text-sm rounded-lg transition-colors ${
                      isSlotSelected(slot, false)
                        ? 'bg-blue-600 text-white'
                        : isSlotInRange(slot)
                          ? 'bg-blue-100 text-blue-700'
                          : isDisabled
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <div className="flex gap-2">
              {selectedDate.toDateString() === new Date().toDateString() && (
                <button
                  onClick={() => onStartTimeChange('now')}
                  className={`px-3 py-2 rounded-lg font-medium transition-all shadow-sm border ${
                    startTime === 'now'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                      : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-300 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  Now
                </button>
              )}
              <input
                type="time"
                value={startTime === 'now' ? '' : startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationError ? 'border-red-300 focus:ring-red-500' : 'focus:ring-blue-500'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
