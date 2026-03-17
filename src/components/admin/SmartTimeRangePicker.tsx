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


// --- Date formatting ---

const formatDate = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput + 'T12:00:00');
  if (isNaN(date.getTime())) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
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
    <div className="absolute z-50 w-36 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
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

const toISODateString = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput + 'T12:00:00');
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

interface SmartTimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  endManuallySet: boolean;
  onEndManuallySet: (val: boolean) => void;
  selectedDate?: string | Date;
  onDateChange?: (val: Date) => void;
}

const SmartTimeRangePicker = ({ startTime, endTime, onStartTimeChange, onEndTimeChange, endManuallySet, onEndManuallySet, selectedDate, onDateChange }: SmartTimeRangePickerProps) => {
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [editTextStart, setEditTextStart] = useState('');
  const [editTextEnd, setEditTextEnd] = useState('');
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [isEditingEnd, setIsEditingEnd] = useState(false);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
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
        setIsEditingStart(false);
        setIsEditingEnd(false);
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

    if (!endManuallySet) {
      // Auto-set end to start + 1h
      let newEndMin = startMin + 60;
      if (newEndMin >= 24 * 60) newEndMin -= 24 * 60;
      const newH = Math.floor(newEndMin / 60).toString().padStart(2, '0');
      const newM = (newEndMin % 60).toString().padStart(2, '0');
      onEndTimeChange(`${newH}:${newM}`);
    } else if (endMin <= startMin) {
      // Manual lock is set, but start has passed end — override
      let newEndMin = startMin + 60;
      if (newEndMin >= 24 * 60) newEndMin -= 24 * 60;
      const newH = Math.floor(newEndMin / 60).toString().padStart(2, '0');
      const newM = (newEndMin % 60).toString().padStart(2, '0');
      onEndTimeChange(`${newH}:${newM}`);
      onEndManuallySet(false); // Clear the lock
    }
    // else: manual lock set and end is still after start — leave it alone
  };

  const handleEndChange = (newEnd: string) => {
    onEndTimeChange(newEnd);
    onEndManuallySet(true);
  };

  const endSlots = timeSlots.filter((s) => s > startTime);

  // --- Start input handlers ---
  const handleStartFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditingStart(true);
    setEditTextStart(formatTo12h(startTime));
    setTimeout(() => e.target.select(), 0);
    setActivePicker('start');
  };

  const handleStartBlur = () => {
    setIsEditingStart(false);
    if (editTextStart.trim() && editTextStart.trim() !== formatTo12h(startTime)) {
      const parsed = smartFormatTime(editTextStart);
      if (parsed) {
        handleStartChange(parsed);
      }
    }
    setTimeout(() => {
      if (document.activeElement !== startInputRef.current && document.activeElement !== endInputRef.current) {
        setActivePicker(null);
      }
    }, 150);
  };

  const handleStartKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditTextStart('');
      setIsEditingStart(false);
      setActivePicker(null);
      (e.target as HTMLInputElement).blur();
    }
  };

  // --- End input handlers ---
  const handleEndFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditingEnd(true);
    setEditTextEnd(formatTo12h(endTime));
    setTimeout(() => e.target.select(), 0);
    setActivePicker('end');
  };

  const handleEndBlur = () => {
    setIsEditingEnd(false);
    if (editTextEnd.trim() && editTextEnd.trim() !== formatTo12h(endTime)) {
      const parsed = smartFormatTime(editTextEnd);
      if (parsed) {
        handleEndChange(parsed);
      }
    }
    setTimeout(() => {
      if (document.activeElement !== startInputRef.current && document.activeElement !== endInputRef.current) {
        setActivePicker(null);
      }
    }, 150);
  };

  const handleEndKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditTextEnd('');
      setIsEditingEnd(false);
      setActivePicker(null);
      (e.target as HTMLInputElement).blur();
    }
  };

  const isStartActive = activePicker === 'start' || isEditingStart;
  const isEndActive = activePicker === 'end' || isEditingEnd;

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center gap-2">
        {/* Date box */}
        {selectedDate && (
          <div
            className={`relative px-4 py-2.5 text-sm font-medium bg-gray-100 rounded-lg whitespace-nowrap inline-block ${onDateChange ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}
            onClick={onDateChange ? () => dateInputRef.current?.showPicker() : undefined}
          >
            {formatDate(selectedDate)}
            {onDateChange && (
              <input
                ref={dateInputRef}
                type="date"
                value={toISODateString(selectedDate)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.value) {
                    onDateChange(new Date(e.target.value + 'T12:00:00'));
                  }
                }}
                className="absolute inset-0 opacity-0 pointer-events-none"
              />
            )}
          </div>
        )}

        {/* Start time box */}
        <div className="relative">
          <input
            ref={startInputRef}
            type="text"
            className={`px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap w-28 text-center outline-none transition-colors ${
              isStartActive
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'bg-gray-100 hover:bg-gray-200 border-b-2 border-transparent'
            }`}
            value={isEditingStart ? editTextStart : formatTo12h(startTime)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTextStart(e.target.value)}
            onFocus={handleStartFocus}
            onBlur={handleStartBlur}
            onKeyDown={handleStartKeyDown}
          />
          {activePicker === 'start' && (
            <TimeDropdown
              slots={timeSlots}
              onSelect={(val) => { handleStartChange(val); setActivePicker(null); setIsEditingStart(false); }}
              current={startTime}
            />
          )}
        </div>

        {/* Dash */}
        <span className="text-sm text-gray-400">&ndash;</span>

        {/* End time box */}
        <div className="relative">
          <input
            ref={endInputRef}
            type="text"
            className={`px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap w-28 text-center outline-none transition-colors ${
              isEndActive
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'bg-gray-100 hover:bg-gray-200 border-b-2 border-transparent'
            }`}
            value={isEditingEnd ? editTextEnd : formatTo12h(endTime)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTextEnd(e.target.value)}
            onFocus={handleEndFocus}
            onBlur={handleEndBlur}
            onKeyDown={handleEndKeyDown}
          />
          {activePicker === 'end' && (
            <TimeDropdown
              slots={endSlots}
              onSelect={(val) => { handleEndChange(val); setActivePicker(null); setIsEditingEnd(false); }}
              current={endTime}
            />
          )}
        </div>

        {/* Duration label */}
        <span className="ml-2 text-sm text-gray-400">
          {getDurationLabel(startTime, endTime)}
        </span>
      </div>
    </div>
  );
};

export { SmartTimeRangePicker, getNextFullHour, addHour, formatTo12h, getDurationLabel, smartFormatTime };
export default SmartTimeRangePicker;
