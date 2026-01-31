import React from 'react';
import { Calendar } from './Icons';

/**
 * ReservedCourtsPanel - Display panel for scheduled court blocks
 * Shows today's upcoming reserved court times
 */
export function ReservedCourtsPanel({ items, className, title = 'Reserved Courts' }) {
  // Format time range compactly: "8:00-9:00 AM" instead of "8:00 AM – 9:00 AM"
  const fmtRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const sTime = s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const eTime = e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    // If same AM/PM, omit from start time
    const sAmPm = s.getHours() >= 12 ? 'PM' : 'AM';
    const eAmPm = e.getHours() >= 12 ? 'PM' : 'AM';
    if (sAmPm === eAmPm) {
      return `${sTime.replace(/ (AM|PM)/, '')}-${eTime}`;
    }
    return `${sTime}-${eTime}`;
  };

  return (
    <section id="reserved-courts-root" className={className}>
      <h3
        className={`courtboard-text-xl font-bold mb-3 flex items-center ${
          !items || items.length === 0 ? 'text-gray-400' : 'text-blue-300'
        }`}
      >
        <Calendar className={`mr-3 ${!items || items.length === 0 ? 'icon-grey' : ''}`} size={24} />
        {title}
      </h3>

      {!items || items.length === 0 ? (
        <div className="text-center mt-8">
          <p className="text-gray-400 reserved-courts-empty">No scheduled blocks today</p>
        </div>
      ) : (
        <ul className="mt-2 space-y-1 reserved-courts-text text-gray-300 text-lg">
          {items.slice(0, 8).map((it, i) => (
            <li key={`${it.key || i}`} className="flex justify-between gap-2">
              <span className="font-medium text-gray-200 flex-shrink-0">
                {it.courts.join(', ')}
              </span>
              <span className="text-gray-400 text-right">
                {fmtRange(it.start, it.end)} ({it.label}){it.warning ? ' ⚠️' : ''}
              </span>
            </li>
          ))}
          {items.length > 8 && (
            <li className="courtboard-text-xs text-gray-500 mt-1">+{items.length - 8} more…</li>
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * Helper function to normalize block data
 */
function normalizeBlock(raw) {
  const reasonRaw =
    raw.reason ||
    raw.title ||
    (raw.eventDetails && (raw.eventDetails.title || raw.eventDetails.type)) ||
    '';
  const reason = String(reasonRaw).trim().toUpperCase();

  const start = raw.startTime ? new Date(raw.startTime) : null;
  let end = raw.endTime ? new Date(raw.endTime) : null;
  if (!end && start && (raw.duration || raw.duration === 0)) {
    end = new Date(start);
    end.setMinutes(end.getMinutes() + Number(raw.duration || 60));
  }

  let courts = [];
  if (Array.isArray(raw.courts)) courts = courts.concat(raw.courts);
  if (raw.eventDetails && Array.isArray(raw.eventDetails.courts))
    courts = courts.concat(raw.eventDetails.courts);
  if (Number.isFinite(raw.courtNumber)) courts.push(raw.courtNumber);

  courts = Array.from(new Set(courts.filter(Number.isFinite))).sort((a, b) => a - b);
  if (!start || !end || courts.length === 0) {
    return null;
  }
  return { courts, start, end, reason };
}

/**
 * Select and format reserved items from blocks for display
 */
export function selectReservedItemsFromBlocks(blocks, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const normalized = (blocks || []).map(normalizeBlock).filter(Boolean);
  const todayFuture = normalized
    .filter((b) => b.end > now && b.start <= endOfToday)
    .map((b) => ({ ...b, end: b.end > endOfToday ? endOfToday : b.end }))
    .sort((a, b) => a.start - b.start);

  const byKey = new Map();
  for (const b of todayFuture) {
    const k = `${b.reason}|${b.start.toISOString()}|${b.end.toISOString()}`;
    if (!byKey.has(k)) byKey.set(k, { ...b, courts: new Set(b.courts) });
    else b.courts.forEach((c) => byKey.get(k).courts.add(c));
  }

  return Array.from(byKey.values()).map((v) => ({
    key: `${v.reason}|${v.start.getTime()}|${v.end.getTime()}`,
    courts: Array.from(v.courts).sort((a, b) => a - b),
    start: v.start,
    end: v.end,
    label: v.reason || 'RESERVED',
    warning:
      v.start.getTime() - now.getTime() <= 60 * 60 * 1000 && v.start.getTime() - now.getTime() > 0,
  }));
}
