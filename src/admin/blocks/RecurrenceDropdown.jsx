import React, { useState, useRef, useEffect } from 'react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = [
  { day: 0, label: 'S' },
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
];

const getPresets = (selectedDate) => {
  const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
  const dayName = DAY_NAMES[date.getDay()];

  return [
    { label: 'Does not repeat', value: null },
    {
      label: 'Daily',
      value: {
        pattern: 'daily',
        frequency: 1,
        endType: 'after',
        occurrences: 7,
        endDate: '',
        daysOfWeek: [],
      },
    },
    {
      label: `Weekly on ${dayName}`,
      value: {
        pattern: 'weekly',
        frequency: 1,
        endType: 'after',
        occurrences: 7,
        endDate: '',
        daysOfWeek: [date.getDay()],
      },
    },
    {
      label: 'Monthly',
      value: {
        pattern: 'monthly',
        frequency: 1,
        endType: 'after',
        occurrences: 7,
        endDate: '',
        daysOfWeek: [],
      },
    },
    {
      label: 'Every weekday (Mon-Fri)',
      value: {
        pattern: 'weekly',
        frequency: 1,
        endType: 'after',
        occurrences: 7,
        endDate: '',
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    },
  ];
};

const getTriggerLabel = (recurrence, selectedDate) => {
  if (!recurrence) return 'Does not repeat';

  const presets = getPresets(selectedDate);
  for (const preset of presets) {
    if (!preset.value) continue;
    if (
      preset.value.pattern === recurrence.pattern &&
      preset.value.frequency === recurrence.frequency &&
      JSON.stringify(preset.value.daysOfWeek) === JSON.stringify(recurrence.daysOfWeek)
    ) {
      return preset.label;
    }
  }

  return 'Custom';
};

const PATTERN_OPTIONS = [
  { value: 'daily', label: 'day' },
  { value: 'weekly', label: 'week' },
  { value: 'monthly', label: 'month' },
];

const CustomRecurrencePanel = ({ recurrence, onRecurrenceChange, onCancel, onDone }) => {
  const pattern = recurrence?.pattern || 'daily';
  const frequency = recurrence?.frequency ?? 1;
  const endType = recurrence?.endType || 'never';
  const occurrences = recurrence?.occurrences || 7;
  const endDate = recurrence?.endDate || '';
  const selectedDays = recurrence?.daysOfWeek || [];

  const update = (fields) => {
    onRecurrenceChange({ ...recurrence, ...fields });
  };

  const handlePatternChange = (newPattern) => {
    if (newPattern === 'weekly') {
      update({
        pattern: newPattern,
        daysOfWeek: selectedDays.length ? selectedDays : [new Date().getDay()],
      });
    } else {
      update({ pattern: newPattern, daysOfWeek: [] });
    }
  };

  const toggleDay = (day) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort((a, b) => a - b);
    update({ daysOfWeek: newDays });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-2">
      <div className="text-base font-medium mb-4">Custom recurrence</div>

      {/* Repeat every row */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Repeat every</span>
        <input
          type="number"
          min="1"
          max="30"
          value={frequency}
          onChange={(e) =>
            update({ frequency: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })
          }
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            if (!e.target.value || parseInt(e.target.value) < 1) {
              update({ frequency: 1 });
            }
          }}
          className="w-12 text-center py-2 text-sm font-medium rounded-lg border border-gray-200"
        />
        <select
          value={pattern}
          onChange={(e) => handlePatternChange(e.target.value)}
          className="py-2 px-3 text-sm rounded-lg border border-gray-200"
        >
          {PATTERN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Day circles (weekly only) */}
      {pattern === 'weekly' && (
        <div className="mt-3 mb-3">
          <div className="text-sm text-gray-500 mb-2">Repeat on</div>
          <div className="flex items-center gap-2">
            {DAY_LABELS.map(({ day, label }) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                  selectedDays.includes(day)
                    ? 'bg-blue-600 text-white border border-blue-600'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ends section */}
      <div className="mt-4">
        <div className="text-sm text-gray-500 mb-2">Ends</div>
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              value="never"
              checked={endType === 'never'}
              onChange={() => update({ endType: 'never' })}
              className="text-blue-600"
            />
            Never
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              value="date"
              checked={endType === 'date'}
              onChange={() => update({ endType: 'date' })}
              className="text-blue-600"
            />
            On
            <input
              type="date"
              value={endDate}
              onChange={(e) => update({ endDate: e.target.value })}
              disabled={endType !== 'date'}
              className="w-32 py-1.5 px-2.5 text-sm rounded-lg border border-gray-200"
            />
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              value="after"
              checked={endType === 'after'}
              onChange={() => update({ endType: 'after' })}
              className="text-blue-600"
            />
            After
            <input
              type="number"
              min="1"
              max="365"
              value={occurrences}
              onChange={(e) => update({ occurrences: parseInt(e.target.value) || 1 })}
              onFocus={(e) => e.target.select()}
              disabled={endType !== 'after'}
              className="w-12 text-center py-1.5 px-2.5 text-sm rounded-lg border border-gray-200"
            />
            occurrences
          </label>
        </div>
      </div>

      {/* Cancel / Done */}
      <div className="flex justify-end gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDone}
          className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

const RecurrenceDropdown = ({
  recurrence,
  onRecurrenceChange,
  selectedDate,
  triggerRowExtra,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [savedRecurrence, setSavedRecurrence] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presets = getPresets(selectedDate);
  const triggerLabel = getTriggerLabel(recurrence, selectedDate);

  const handlePresetSelect = (preset) => {
    onRecurrenceChange(preset.value);
    setIsOpen(false);
    setCustomPanelOpen(false);
  };

  const handleCustomClick = () => {
    setSavedRecurrence(recurrence);
    if (!recurrence) {
      const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      onRecurrenceChange({
        pattern: 'weekly',
        frequency: 1,
        endType: 'after',
        occurrences: 7,
        endDate: '',
        daysOfWeek: [date.getDay()],
      });
    }
    setCustomPanelOpen(true);
    setIsOpen(false);
  };

  const handleCustomCancel = () => {
    onRecurrenceChange(savedRecurrence);
    setCustomPanelOpen(false);
    setSavedRecurrence(null);
  };

  const handleCustomDone = () => {
    setCustomPanelOpen(false);
    setSavedRecurrence(null);
  };

  const isActive = recurrence !== null;

  return (
    <div ref={containerRef}>
      <div className="flex items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (customPanelOpen) return;
              setIsOpen((prev) => !prev);
            }}
            className={`py-2 px-3 rounded-lg font-medium transition-all shadow-sm border text-sm ${
              isActive
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white hover:bg-blue-50 text-gray-700 border-blue-300 hover:border-blue-400'
            }`}
          >
            {triggerLabel} ▾
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    triggerLabel === preset.label
                      ? 'bg-blue-100 text-blue-700 font-bold'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <div className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCustomClick}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    triggerLabel === 'Custom'
                      ? 'bg-blue-100 text-blue-700 font-bold'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  Custom...
                </button>
              </div>
            </div>
          )}
        </div>
        {triggerRowExtra}
      </div>
      {children}
      {customPanelOpen && (
        <CustomRecurrencePanel
          recurrence={recurrence}
          onRecurrenceChange={onRecurrenceChange}
          onCancel={handleCustomCancel}
          onDone={handleCustomDone}
        />
      )}
    </div>
  );
};

export default RecurrenceDropdown;
