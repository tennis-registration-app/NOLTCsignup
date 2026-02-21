/**
 * Tennis Availability Domain Module
 *
 * Handles court availability calculations, free/occupied status, and selection logic.
 * Ported from domain/availability.js IIFE.
 */

// Registration buffer: treat blocks as starting this many minutes earlier
const REGISTRATION_BUFFER_MINUTES = 15;
const REGISTRATION_BUFFER_MS = REGISTRATION_BUFFER_MINUTES * 60 * 1000;

// ============================================================
// Internal Helper Functions
// ============================================================

/**
 * Helper for robust date handling
 * @param {Date|string} d - Date or string to coerce
 * @returns {Date} Valid Date object
 */
function coerceDate(d) {
  // Accept Date or string; never NaN
  if (d instanceof Date) return d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Check if session is in overtime
 * @param {Object} session - Session object with scheduledEndAt
 * @param {Date} now - Current time
 * @returns {boolean} True if session is overtime
 */
function isOvertime(session, now) {
  // Domain format: session.scheduledEndAt
  if (!session?.scheduledEndAt) return false;
  return coerceDate(session.scheduledEndAt) <= now; // strict "ended before or at now"
}

/**
 * Normalize blocks array
 * @param {Array} arr - Blocks array
 * @returns {Array} Normalized array
 */
function normalizeBlocks(arr) {
  return Array.isArray(arr) ? arr : [];
}

/**
 * Check if block is active at current time
 * @param {Object} b - Block object
 * @param {Date} now - Current time
 * @returns {boolean} True if block is active
 */
function isBlockActiveNow(b, now) {
  if (!b) return false;
  const st = new Date(b.startTime ?? b.start);
  const et = new Date(b.endTime ?? b.end);
  return (
    st instanceof Date &&
    !isNaN(st.getTime()) &&
    et instanceof Date &&
    !isNaN(et.getTime()) &&
    st <= now &&
    now < et
  );
}

/**
 * Check if block is active (alias for isBlockActiveNow)
 * @param {Object} b - Block object
 * @param {Date} now - Current time
 * @returns {boolean} True if block is active
 */
function isActiveBlock(b, now) {
  if (!b) return false;
  const st = new Date(b.startTime ?? b.start);
  const et = new Date(b.endTime ?? b.end);
  return (
    st instanceof Date &&
    !isNaN(st.getTime()) &&
    et instanceof Date &&
    !isNaN(et.getTime()) &&
    st <= now &&
    now < et
  );
}

// ============================================================
// Exported Functions
// ============================================================

/**
 * Get list of free courts based on current data, time, blocks, and wet conditions
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {number[]} Array of free court numbers
 */
function getFreeCourts({ data, now, blocks = [], wetSet = new Set() }) {
  if (!data || !data.courts || !Array.isArray(data.courts)) {
    throw new Error('Invalid data or courts array provided');
  }

  // Use hardened normalization
  now = coerceDate(now);
  blocks = normalizeBlocks(blocks);
  wetSet = wetSet instanceof Set ? wetSet : new Set();

  const freeCourts = [];

  for (let i = 0; i < data.courts.length; i++) {
    const courtNumber = i + 1;
    const court = data.courts[i];

    // Check if court is wet
    if (wetSet.has(courtNumber)) {
      continue;
    }

    // Check if court is occupied (has any active session, regardless of timing)
    let isOccupied = false;
    if (court) {
      // Domain format: court.session indicates an active session
      if (court.session) {
        // Any active session means the court is not free for new assignment
        // This includes both active sessions and overtime sessions
        isOccupied = true;
      }
    }

    if (isOccupied) {
      continue;
    }

    // Check if court is currently blocked using hardened date handling
    const isBlocked = blocks.some((block) => {
      const courtNum = Number(block.courtNumber || block.court);
      if (!courtNum || courtNum !== courtNumber) return false;

      const blockStart = coerceDate(block.startTime || block.start);
      const blockEnd = coerceDate(block.endTime || block.end);

      return blockStart <= now && now < blockEnd;
    });

    if (isBlocked) {
      continue;
    }

    // Court is free
    freeCourts.push(courtNumber);
  }

  return freeCourts;
}

/**
 * Check if a court has a block conflict within the required time window
 * @param {Object} params - Parameters
 * @param {number} params.courtNumber - Court number
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {number} params.requiredMinutes - Required minutes
 * @returns {boolean} True if conflict exists
 */
function hasSoonBlockConflict({ courtNumber, now, blocks = [], requiredMinutes = 60 }) {
  if (typeof courtNumber !== 'number' || courtNumber < 1) {
    throw new Error('Invalid court number provided');
  }
  if (!now || !(now instanceof Date)) {
    throw new Error('Invalid current time provided');
  }
  if (!Array.isArray(blocks)) {
    throw new Error('Blocks must be an array');
  }
  if (typeof requiredMinutes !== 'number' || requiredMinutes <= 0) {
    throw new Error('Required minutes must be a positive number');
  }

  const requiredEndTime = new Date(now.getTime() + requiredMinutes * 60 * 1000);

  return blocks.some((block) => {
    if (block.courtNumber !== courtNumber) return false;

    const blockStart = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);

    // Check if block overlaps with our required time window
    // Block conflicts if:
    // 1. Block starts before our session ends AND block ends after our session starts
    return blockStart < requiredEndTime && blockEnd > now;
  });
}

/**
 * getNextFreeTimes({ data, now, blocks, wetSet }) -> Date[]
 * Returns an array of length Tennis.Config.Courts.TOTAL_COUNT (1-indexed → index n-1),
 * where each entry is the earliest Date that court n is free.
 * Rules:
 *  - Coerce any stored times with new Date(...)
 *  - If court is in wetSet, treat as unavailable until 10pm closing
 *  - Start base = now
 *  - If the court is occupied and session.scheduledEndAt > base, set base = session.scheduledEndAt
 *  - While there exists a block for this court where block.startTime <= base < block.endTime,
 *    set base = block.endTime (and re-check; blocks can be adjacent/stacked)
 *  - Result for court n is that base
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {Date[]} Array of next free times per court
 */
function getNextFreeTimes({ data, now, blocks, wetSet }) {
  const total = window.Tennis?.Config?.Courts?.TOTAL_COUNT ?? 12;
  const out = new Array(total);
  const byCourt = (blocks || []).map((b) => ({
    courtNumber: Number(b.courtNumber),
    start: new Date(b.startTime),
    end: new Date(b.endTime),
  }));
  // Normalize wetSet
  const wet = wetSet instanceof Set ? wetSet : new Set();

  for (let n = 1; n <= total; n++) {
    // If court is wet, treat as unavailable until 10pm closing
    if (wet.has(n)) {
      const closingTime = new Date(now);
      closingTime.setHours(22, 0, 0, 0); // 10pm closing
      out[n - 1] = closingTime;
      continue;
    }

    let base = new Date(now);
    const c = data?.courts?.[n - 1];
    // Domain format: session.scheduledEndAt
    if (c?.session?.scheduledEndAt) {
      const end = new Date(c.session.scheduledEndAt);
      if (end > base) base = end;
    }
    // advance through overlapping blocks (with registration buffer)
    let advanced = true;
    while (advanced) {
      advanced = false;
      for (const b of byCourt) {
        if (b.courtNumber !== n) continue;
        // overlap when (b.start - buffer) <= base < b.end
        // This treats blocks as starting 15 min earlier for availability purposes
        const effectiveStart = new Date(b.start.getTime() - REGISTRATION_BUFFER_MS);
        if (effectiveStart <= base && base < b.end) {
          base = new Date(b.end);
          advanced = true;
        }
      }
    }
    out[n - 1] = base;
  }
  return out;
}

/**
 * Returns an object shape without mutating inputs.
 * { free:number[], occupied:number[], wet:number[], overtime:number[], meta:{ total:number, overtimeCount:number } }
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {Object} Free courts info
 */
function getFreeCourtsInfo({ data, now, blocks, wetSet }) {
  const total = window.Tennis?.Config?.Courts?.TOTAL_COUNT ?? 12;
  const all = Array.from({ length: total }, (_, i) => i + 1);

  // Normalize inputs for consistent handling
  now = coerceDate(now);
  blocks = normalizeBlocks(blocks);
  wetSet = wetSet instanceof Set ? wetSet : new Set();

  const free = [];
  const overtime = [];
  const wet = Array.from(wetSet).sort((a, b) => a - b);

  // Process each court individually for deterministic classification
  for (let i = 0; i < (data?.courts?.length || 0); i++) {
    const n = i + 1;

    // if blocked/wet, skip it from free/overtime classification entirely
    const isWet = wetSet.has(n);
    const isBlocked = blocks.some((b) => {
      const courtNum = Number(b.courtNumber || b.court);
      if (!courtNum || courtNum !== n) return false;
      const start = coerceDate(b.startTime || b.start);
      const end = coerceDate(b.endTime || b.end);
      return start <= now && now < end;
    });

    if (isWet || isBlocked) continue;

    const court = data.courts[i];
    // Domain format: court.session
    const session = court?.session;

    if (!session) {
      free.push(n);
      continue;
    }

    if (isOvertime(session, now) && !session.isTournament) {
      overtime.push(n);
    }
    // If not overtime and has session, it's occupied (not free or overtime)
  }

  const freeSet = new Set(free);
  const occupied = all
    .filter((n) => !freeSet.has(n) && !overtime.includes(n) && !wet.includes(n))
    .sort((a, b) => a - b);

  return {
    free: free.sort((a, b) => a - b),
    occupied,
    wet,
    overtime: overtime.sort((a, b) => a - b),
    meta: { total, overtimeCount: overtime.length },
  };
}

/**
 * Get selectable courts (free first, then overtime if no free)
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {number[]} Array of selectable court numbers
 */
function getSelectableCourts({ data, now, blocks, wetSet }) {
  const info = getFreeCourtsInfo({ data, now, blocks, wetSet });

  // Active, non-wet blocks set (by courtNumber)
  const activeBlocked = new Set(
    (blocks || [])
      .filter((b) => isBlockActiveNow(b, now))
      .filter((b) => !b.isWetCourt) // wet handled by wetSet already
      .map((b) => b.courtNumber)
  );

  // 1) If any true free courts exist, they are the selectable set
  const free = (info.free || []).filter((n) => !activeBlocked.has(n));
  if (free.length > 0) {
    return free;
  }

  // 2) Otherwise, overtime courts become selectable (still exclude wet/blocked)
  const overtime = (info.overtime || []).filter(
    (n) => !activeBlocked.has(n) && !(info.wet || []).includes(n)
  );
  return overtime;
}

/**
 * Get court statuses with detailed information
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @param {Array} [params.upcomingBlocks] - Upcoming blocks for usability check
 * @returns {Object[]} Array of court status objects
 */
function getCourtStatuses({ data, now, blocks, wetSet, upcomingBlocks = [] }) {
  const info = getFreeCourtsInfo({ data, now, blocks, wetSet });

  // sets for quick lookup
  const S = (arr) => new Set(Array.isArray(arr) ? arr : []);
  const freeSet = S(info.free);
  const occSet = S(info.occupied);
  const overtimeSet = S(info.overtime);
  const wetSetLocal = S(info.wet); // prefer info.wet (already honors blocks + timing)

  // active non-wet blocks
  const activeBlocked = new Set(
    (blocks || [])
      .filter((b) => isActiveBlock(b, now))
      .filter((b) => !b.isWetCourt)
      .map((b) => b.courtNumber)
  );

  // selection policy: free first, else overtime
  const hasTrueFree = freeSet.size > 0;

  // Check if any free court has >= 20 min of usable time before next block
  const MIN_USEFUL_MS = 20 * 60 * 1000;
  const hasUsableFree =
    hasTrueFree &&
    [...freeSet].some((courtNum) => {
      if (!upcomingBlocks || upcomingBlocks.length === 0) return true;
      const nextBlock = upcomingBlocks.find(
        (b) =>
          Number(b.courtNumber || b.court) === courtNum && new Date(b.startTime || b.start) > now
      );
      if (!nextBlock) return true;
      return (
        new Date(nextBlock.startTime || nextBlock.start).getTime() - now.getTime() >= MIN_USEFUL_MS
      );
    });

  const total = (data?.courts || []).length || info.meta?.total || 0;
  const out = [];
  for (let n = 1; n <= total; n++) {
    const isWet = wetSetLocal.has(n);
    const isBlocked = activeBlocked.has(n);
    const isFree = freeSet.has(n);
    const isOvertimeFlag = overtimeSet.has(n);
    const isOccupied = occSet.has(n);

    // precedence for a single status label
    let status = 'free';
    let blockedLabel = null;
    let blockedEnd = null;

    if (isWet) status = 'wet';
    else if (isBlocked) {
      status = 'blocked';
      // Find the active block for this court
      const activeBlock = (blocks || []).find(
        (b) => b.courtNumber === n && isActiveBlock(b, now) && !b.isWetCourt
      );
      if (activeBlock) {
        const b = activeBlock;
        blockedLabel = b.label || b.title || b.templateName || b.reason || b.type || 'Blocked';
        blockedEnd = b.endTime || b.end || b.until || null;
      }
    } else if (isOvertimeFlag) status = 'overtime';
    else if (isOccupied) status = 'occupied';
    else if (isFree) status = 'free';

    // Tournament courts past end time display as overtime (dark blue)
    // but are excluded from availability lists
    const court = data.courts[n - 1];
    const isTournament = court?.session?.isTournament ?? false;
    if (
      status === 'occupied' &&
      isTournament &&
      court?.session?.scheduledEndAt &&
      new Date(court.session.scheduledEndAt) <= now
    ) {
      status = 'overtime';
    }

    // strict selectable policy: free OR overtime (when no usable free exists)
    // Tournament overtime courts are NEVER selectable (they play until completion)
    const selectable =
      !isWet &&
      !isBlocked &&
      (status === 'free' || (status === 'overtime' && !hasUsableFree && !isTournament));

    // selectable reason for styling
    const selectableReason = selectable ? (status === 'free' ? 'free' : 'overtime_fallback') : null;

    const courtStatus = {
      courtNumber: n,
      status,
      selectable,
      selectableReason,
      isWet,
      isBlocked,
      isFree,
      isOvertime: isOvertimeFlag,
      isOccupied,
    };

    // Add blocked-specific fields if applicable
    if (status === 'blocked') {
      courtStatus.blockedLabel = blockedLabel;
      courtStatus.blockedEnd = blockedEnd;
    }

    out.push(courtStatus);
  }
  return out;
}

/**
 * Get selectable courts for assignment (stricter - no overtime bumping)
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {number[]} Array of assignable court numbers
 */
function getSelectableCourtsForAssignment({ data, now, blocks, wetSet }) {
  // Use existing selectable logic but enforce stricter rules for assignment
  const selectable = getSelectableCourts({ data, now, blocks, wetSet });

  // For assignment, only allow truly free courts (no overtime bumping)
  const info = getFreeCourtsInfo({ data, now, blocks, wetSet });
  const trulyFree = info.free || [];

  // Filter selectable to only include truly free courts
  return selectable.filter((n) => trulyFree.includes(n));
}

/**
 * Check if a court can be assigned
 * @param {number} courtNumber - Court number to check
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {boolean} True if court can be assigned
 */
function canAssignToCourt(courtNumber, { data, now, blocks, wetSet }) {
  const assignable = getSelectableCourtsForAssignment({ data, now, blocks, wetSet });
  return assignable.includes(courtNumber);
}

/**
 * Strict selectable API - canonical source of truth
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {number[]} Array of strictly selectable court numbers
 */
function getSelectableCourtsStrict({ data, now, blocks = [], wetSet = new Set() }) {
  const info = getFreeCourtsInfo({ data, now, blocks, wetSet });
  const free = info.free || [];
  const overtime = info.overtime || [];

  return free.length > 0 ? free : overtime;
}

/**
 * Returns true only if there is NOTHING the user can select
 * (neither free nor overtime courts). This preserves the policy
 * that overtime courts are selectable when free courts are exhausted.
 * @param {Object} params - Parameters
 * @param {Object} params.data - Court data
 * @param {Date} params.now - Current time
 * @param {Array} params.blocks - Block array
 * @param {Set} params.wetSet - Set of wet court numbers
 * @returns {boolean} True if waitlist join should be allowed
 */
function shouldAllowWaitlistJoin({ data, now, blocks = [], wetSet = new Set() }) {
  const strict = getSelectableCourtsStrict({ data, now, blocks, wetSet });
  return (
    (strict && typeof (/** @type {any} */ (strict).size) === 'number'
      ? /** @type {any} */ (strict).size
      : strict.length || 0) === 0
  );
}

// ============================================================
// API Object
// ============================================================

const availability = {
  // From object literal
  getFreeCourts,
  hasSoonBlockConflict,
  // Direct assignment
  getNextFreeTimes,
  // From self-attach extension
  getFreeCourtsInfo,
  getSelectableCourts,
  getCourtStatuses,
  getSelectableCourtsForAssignment,
  canAssignToCourt,
  getSelectableCourtsStrict,
  shouldAllowWaitlistJoin,
};

// ============================================================
// Legacy Window Attachment
// ============================================================

if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.Domain = window.Tennis.Domain || {};
  window.Tennis.Domain.availability = availability;
  window.Tennis.Domain.Availability = availability;
}

// ============================================================
// Exports
// ============================================================

export { availability };

// Also export individual functions for future direct imports
export {
  getFreeCourts,
  hasSoonBlockConflict,
  getNextFreeTimes,
  getFreeCourtsInfo,
  getSelectableCourts,
  getCourtStatuses,
  getSelectableCourtsForAssignment,
  canAssignToCourt,
  getSelectableCourtsStrict,
  shouldAllowWaitlistJoin,
};
