import React, { useState, useEffect, useRef } from 'react';

// --- Utility Functions ---

const formatTo12h = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
};

const getDurationLabel = (start: string, end: string): string => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const getNextFullHour = (): string => {
  const now = new Date();
  let h = now.getHours() + 1;
  if (h >= 24) h = 0;
  return `${h.toString().padStart(2, '0')}:00`;
};

const addHour = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  let newH = h + 1;
  if (newH >= 24) newH = 0;
  return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const applyExplicitPeriod = (h: number, mins: number, hasPM: boolean, hasAM: boolean): string | null => {
  let hour24 = h;
  if (hasPM && h >= 1 && h <= 11) hour24 = h + 12;
  if (hasPM && h === 12) hour24 = 12;
  if (hasAM && h === 12) hour24 = 0;
  if (hasAM && h >= 1 && h <= 11) hour24 = h;
  const m = mins || 0;
  if (hour24 >= 0 && hour24 <= 23 && m >= 0 && m <= 59) {
    return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  return null;
};

// Smart formatting: interprets raw digit input into a time
//
// Heuristic (no AM/PM suffix) — maps to 9 AM-5 PM:
//   9      -> 09:00    10 -> 10:00    11 -> 11:00    12 -> 12:00
//   1-5    -> 13:00-17:00
//   6,7,8  -> ambiguous, no resolution without suffix
//
// Explicit suffix always wins: "8p" -> 20:00, "8a" -> 08:00
// 4-digit input is 24h format: "0730" -> 07:30, "2015" -> 20:15
const smartFormatTime = (input: string): string | null => {
  const trimmed = input.trim().toUpperCase();

  const hasPM = /P(M)?$/i.test(trimmed);
  const hasAM = /A(M)?$/i.test(trimmed);
  const hasExplicitPeriod = hasPM || hasAM;

  const clean = trimmed.replace(/[^0-9]/g, '');

  if (clean.length === 0) return null;

  // --- Single digit ---
  if (clean.length === 1) {
    const h = parseInt(clean);
    if (hasExplicitPeriod) {
      return applyExplicitPeriod(h, 0, hasPM, hasAM);
    }
    if (h === 9) return '09:00';
    if (h >= 1 && h <= 5) return `${(h + 12).toString().padStart(2, '0')}:00`;
    return null;
  }

  // --- Two digits ---
  if (clean.length === 2) {
    const h = parseInt(clean);
    if (hasExplicitPeriod) {
      return applyExplicitPeriod(h, 0, hasPM, hasAM);
    }
    if (h === 9) return '09:00';
    if (h === 10) return '10:00';
    if (h === 11) return '11:00';
    if (h === 12) return '12:00';
    if (h >= 1 && h <= 5) return `${(h + 12).toString().padStart(2, '0')}:00`;
    if (h >= 13 && h <= 23) return `${h}:00`;
    return null;
  }

  // --- Three digits: zero-pad to four ---
  let digits = clean;
  if (digits.length === 3) {
    digits = '0' + digits;
  }

  // --- Four digits: 24h format ---
  if (digits.length === 4) {
    const hours = parseInt(digits.slice(0, 2));
    const mins = parseInt(digits.slice(2));
    if (hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59) {
      if (hasExplicitPeriod) {
        return applyExplicitPeriod(hours, mins, hasPM, hasAM);
      }
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
  }

  return null;
};


// --- Components ---

const TimeDropdown = ({ slots, onSelect, current }: {
  slots: string[];
  onSelect: (val: string) => void;
  current: string;
}) => {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      const container = listRef.current;
      const el = selectedRef.current;
      container.scrollTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    }
  }, []);

  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
      <div ref={listRef} className="max-h-56 overflow-y-auto">
        {slots.map((slot) => (
          <button
            key={slot}
            ref={slot === current ? selectedRef : null}
            type="button"
            onClick={() => onSelect(slot)}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              current === slot
                ? 'bg-blue-100 text-blue-700 font-bold'
                : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            {formatTo12h(slot)}
          </button>
        ))}
      </div>
    </div>
  );
};

const TimeInput = ({ label, value, onChange, slots, activePicker, pickerKey, setActivePicker }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  slots: string[];
  activePicker: string | null;
  pickerKey: string;
  setActivePicker: (val: string | null) => void;
}) => {
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpen = activePicker === pickerKey;

  const handleFocus = () => {
    setIsEditing(true);
    setEditText('');
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editText.trim()) {
      const parsed = smartFormatTime(editText);
      if (parsed) {
        onChange(parsed);
      }
    }
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        setActivePicker(null);
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditText('');
      setIsEditing(false);
      setActivePicker(null);
      (e.target as HTMLInputElement).blur();
    }
  };

  const toggleDropdown = () => {
    if (isOpen) {
      setActivePicker(null);
    } else {
      setActivePicker(pickerKey);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex-1 relative">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isEditing ? editText : formatTo12h(value)}
          onChange={(e) => setEditText(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={isEditing ? 'e.g. 9, 3, 8pm, 930' : ''}
          className={`w-full bg-white border-2 rounded-xl pl-4 pr-10 py-3 text-lg font-medium shadow-sm transition-all outline-none ${
            isOpen || isEditing
              ? 'border-blue-500 ring-4 ring-blue-100'
              : 'border-gray-200 hover:border-gray-300'
          } ${isEditing ? 'font-mono text-gray-500' : ''}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); toggleDropdown(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </div>
      {isOpen && !isEditing && (
        <TimeDropdown
          slots={slots}
          onSelect={(val) => { onChange(val); setActivePicker(null); }}
          current={value}
        />
      )}
    </div>
  );
};

interface SmartTimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
}

const SmartTimeRangePicker = ({ startTime, endTime, onStartTimeChange, onEndTimeChange }: SmartTimeRangePickerProps) => {
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartChange = (newStart: string) => {
    onStartTimeChange(newStart);
    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    if (endMin <= startMin + 29) {
      let newEndMin = startMin + 60;
      if (newEndMin >= 24 * 60) newEndMin -= 24 * 60;
      const newH = Math.floor(newEndMin / 60).toString().padStart(2, '0');
      const newM = (newEndMin % 60).toString().padStart(2, '0');
      onEndTimeChange(`${newH}:${newM}`);
    }
  };

  const handleEndChange = (newEnd: string) => {
    onEndTimeChange(newEnd);
  };

  const endSlots = timeSlots.filter((s) => s > startTime);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-end gap-3">
        <TimeInput
          label="Start"
          value={startTime}
          onChange={handleStartChange}
          slots={timeSlots}
          activePicker={activePicker}
          pickerKey="start"
          setActivePicker={setActivePicker}
        />

        <div className="pb-3 text-gray-300 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-4-4 4 4-4 4"/>
          </svg>
        </div>

        <TimeInput
          label="End"
          value={endTime}
          onChange={handleEndChange}
          slots={endSlots}
          activePicker={activePicker}
          pickerKey="end"
          setActivePicker={setActivePicker}
        />
      </div>

      {/* Duration Badge */}
      <div className="mt-4 flex items-center justify-center">
        <div className="inline-flex items-center gap-3 bg-blue-50 text-blue-700 rounded-full px-6 py-2.5 text-base font-semibold">
          <span>{formatTo12h(startTime)}</span>
          <span className="text-blue-300">&rarr;</span>
          <span>{formatTo12h(endTime)}</span>
          <span className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm font-bold ml-1">
            {getDurationLabel(startTime, endTime)}
          </span>
        </div>
      </div>
    </div>
  );
};

export { SmartTimeRangePicker, getNextFullHour, addHour, formatTo12h, getDurationLabel, smartFormatTime };
export default SmartTimeRangePicker;
