import React, { useRef, useEffect, useState, useCallback } from 'react';

// === Utilities (from prototype, verbatim) ===

const OPERATING_START = 6;
const OPERATING_END = 21;

function generateTimeSlots() {
  const slots: Array<{ hour: number; minute: number; label: string; value: number }> = [];
  for (let h = OPERATING_START; h <= OPERATING_END; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === OPERATING_END && m > 0) break;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
      slots.push({ hour: h, minute: m, label, value: h * 60 + m });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function getNowSlot() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const rounded = Math.ceil(m / 30) * 30;
  const totalMin = h * 60 + (rounded >= 60 ? 60 : rounded);
  const slot = TIME_SLOTS.find((s) => s.value >= totalMin);
  return slot || TIME_SLOTS[TIME_SLOTS.length - 1];
}

function formatDuration(startVal: number | null, endVal: number | null) {
  if (startVal == null || endVal == null || endVal <= startVal) return null;
  const diff = endVal - startVal;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// === ScrollPicker component (from prototype, verbatim) ===

type TimeSlot = { hour: number; minute: number; label: string; value: number };

/**
 * @param {Object} props
 * @param {Array<{value: number, label: string, hour: number, minute: number}>} props.slots
 * @param {number|null} props.selectedValue
 * @param {(slot: {value: number, label: string, hour: number, minute: number}) => void} props.onChange
 * @param {string} props.label
 * @param {((slot: {value: number, label: string, hour: number, minute: number}) => boolean)} [props.filterFn]
 */
function ScrollPicker({ slots, selectedValue, onChange, label, filterFn = undefined }: { slots: TimeSlot[]; selectedValue: number | null; onChange: (slot: TimeSlot) => void; label: string; filterFn?: (slot: TimeSlot) => boolean }) {
  const listRef = useRef(null as HTMLDivElement | null);
  const itemRefs = useRef({} as Record<number, HTMLDivElement | null>);
  const filtered = filterFn ? slots.filter(filterFn) : slots;

  useEffect(() => {
    if (selectedValue != null && itemRefs.current[selectedValue]) {
      const timer = setTimeout(() => {
        const item = itemRefs.current[selectedValue];
        if (item) {
          item.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedValue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '0 1 112px', minWidth: '90px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#64748b',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      <div
        ref={listRef}
        style={{
          height: '220px',
          overflowY: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          background: '#fff',
        }}
      >
        {filtered.map((slot) => {
          const isSelected = slot.value === selectedValue;
          return (
            <div
              key={slot.value}
              ref={(el) => {
                itemRefs.current[slot.value] = el;
              }}
              onClick={() => onChange(slot)}
              style={{
                padding: '5px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? '#fff' : '#334155',
                background: isSelected ? '#3b82f6' : 'transparent',
                borderRadius: isSelected ? '6px' : '0',
                margin: isSelected ? '2px 4px' : '0 4px',
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              {slot.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === Clock SVG icon (inline, matches prototype) ===

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// === Arrow SVG icon for summary bar ===

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: 'middle' }}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// === Main TimeScrollPicker (prototype logic, verbatim) ===

/**
 * @param {Object} props
 * @param {(startSlot: {value: number, label: string, hour: number, minute: number} | null, endSlot: {value: number, label: string, hour: number, minute: number} | null) => void} props.onTimeChange
 * @param {number|null} [props.initialStartValue] - Initial start slot value (minutes)
 * @param {number|null} [props.initialEndValue] - Initial end slot value (minutes)
 * @param {boolean} [props.isToday] - Whether to show "Start Now" button
 */
export function TimeScrollPicker({
  onTimeChange,
  initialStartValue,
  initialEndValue,
  isToday = true,
}: {
  onTimeChange: (startSlot: TimeSlot | null, endSlot: TimeSlot | null) => void;
  initialStartValue?: number | null;
  initialEndValue?: number | null;
  isToday?: boolean;
}) {
  const [startSlot, setStartSlot] = useState(() => {
    if (initialStartValue != null) {
      return TIME_SLOTS.find((s) => s.value === initialStartValue) || null;
    }
    return null;
  });
  const [endSlot, setEndSlot] = useState(() => {
    if (initialEndValue != null) {
      return TIME_SLOTS.find((s) => s.value === initialEndValue) || null;
    }
    return null;
  });
  const [endManuallySet, setEndManuallySet] = useState(false);

  // Sync from parent when initialStartValue/initialEndValue change (e.g. template selection)
  useEffect(() => {
    if (initialStartValue != null) {
      const found = TIME_SLOTS.find((s) => s.value === initialStartValue) || null;
      setStartSlot(found);
    } else {
      setStartSlot(null);
    }
  }, [initialStartValue]);

  useEffect(() => {
    if (initialEndValue != null) {
      const found = TIME_SLOTS.find((s) => s.value === initialEndValue) || null;
      setEndSlot(found);
    } else {
      setEndSlot(null);
    }
  }, [initialEndValue]);

  const findSlotPlus1Hr = useCallback((slot: TimeSlot) => {
    const target = slot.value + 60;
    return TIME_SLOTS.find((s) => s.value >= target) || TIME_SLOTS[TIME_SLOTS.length - 1];
  }, []);

  const handleStartChange = useCallback(
    (slot: TimeSlot) => {
      setStartSlot(slot);

      if (!endManuallySet || !endSlot) {
        // Auto-set end to +1hr
        const autoEnd = findSlotPlus1Hr(slot);
        setEndSlot(autoEnd);
        onTimeChange(slot, autoEnd);
      } else if (endSlot && endSlot.value <= slot.value) {
        // Start moved past manual end — reset
        const autoEnd = findSlotPlus1Hr(slot);
        setEndSlot(autoEnd);
        setEndManuallySet(false);
        onTimeChange(slot, autoEnd);
      } else {
        onTimeChange(slot, endSlot);
      }
    },
    [endManuallySet, endSlot, findSlotPlus1Hr, onTimeChange]
  );

  const handleEndChange = useCallback(
    (slot: TimeSlot) => {
      setEndSlot(slot);
      setEndManuallySet(true);
      onTimeChange(startSlot, slot);
    },
    [startSlot, onTimeChange]
  );

  const handleStartNow = useCallback(() => {
    const nowSlot = getNowSlot();
    setStartSlot(nowSlot);

    if (!endManuallySet || !endSlot) {
      const autoEnd = findSlotPlus1Hr(nowSlot);
      setEndSlot(autoEnd);
      onTimeChange(nowSlot, autoEnd);
    } else if (endSlot && endSlot.value <= nowSlot.value) {
      const autoEnd = findSlotPlus1Hr(nowSlot);
      setEndSlot(autoEnd);
      setEndManuallySet(false);
      onTimeChange(nowSlot, autoEnd);
    } else {
      onTimeChange(nowSlot, endSlot);
    }
  }, [endManuallySet, endSlot, findSlotPlus1Hr, onTimeChange]);

  const durationText = formatDuration(
    startSlot ? startSlot.value : null,
    endSlot ? endSlot.value : null
  );

  const endFilterFn = useCallback(
    (slot: TimeSlot) => (startSlot ? slot.value > startSlot.value : true),
    [startSlot]
  );

  return (
    <div
      style={{
        maxWidth: '340px',
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        background: '#fff',
      }}
    >
      {/* Start Now button */}
      {isToday && (
        <button
          onClick={handleStartNow}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            background: '#eff6ff',
            color: '#2563eb',
            cursor: 'pointer',
            marginBottom: '14px',
          }}
        >
          <ClockIcon />
          Start Now
        </button>
      )}

      {/* Pickers row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', justifyContent: 'center' }}>
        <ScrollPicker
          slots={TIME_SLOTS}
          selectedValue={startSlot ? startSlot.value : null}
          onChange={handleStartChange}
          label="Start Time"
        />
        <ScrollPicker
          slots={TIME_SLOTS}
          selectedValue={endSlot ? endSlot.value : null}
          onChange={handleEndChange}
          label="End Time"
          filterFn={endFilterFn}
        />
      </div>

      {/* Duration summary bar — always visible for visual stability */}
      {startSlot && endSlot && durationText ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {startSlot.label}
            <ArrowIcon />
            {endSlot.label}
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#16a34a',
              background: '#dcfce7',
              padding: '4px 12px',
              borderRadius: '20px',
            }}
          >
            {durationText}
          </span>
        </div>
      ) : (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Select start and end times</span>
        </div>
      )}
    </div>
  );
}

// Export utilities for use by the adapter layer
export { TIME_SLOTS, getNowSlot };
