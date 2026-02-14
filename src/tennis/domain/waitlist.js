/**
 * Tennis Waitlist Domain Module
 *
 * Handles waitlist group validation, wait time estimation, and simulation.
 * Ported from domain/waitlist.js IIFE.
 */

import { waitlistSignature } from '../../lib/storage.js';

// Constants for simulation
const REGISTRATION_BUFFER_MS = 15 * 60 * 1000; // 15 minutes
const MIN_USEFUL_SESSION_MS = 20 * 60 * 1000; // 20 minutes
const SINGLES_ONLY_COURT_NUMBER = 8;

// ============================================================
// Object Literal Methods
// ============================================================

/**
 * Validate that a group is properly formed
 * @param {Array} group - Array of player objects
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateGroup(group) {
  if (!Array.isArray(group)) {
    return { valid: false, error: 'Group must be an array' };
  }

  if (group.length === 0) {
    return { valid: false, error: 'Group cannot be empty' };
  }

  if (group.length > 4) {
    return { valid: false, error: 'Group cannot have more than 4 players' };
  }

  // Validate each player
  for (let i = 0; i < group.length; i++) {
    const player = group[i];

    if (!player || typeof player !== 'object') {
      return { valid: false, error: `Player ${i + 1} is invalid` };
    }

    if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
      return { valid: false, error: `Player ${i + 1} must have a valid name` };
    }

    // ID is optional - we can work with just names
    // if (!player.id || typeof player.id !== 'string') {
    //   return { valid: false, error: `Player ${i + 1} must have a valid ID` };
    // }
  }

  // Check for duplicate players (by ID if available, otherwise by normalized name)
  const playerKeys = group.map((p) => {
    if (p.id) return `id:${p.id}`;
    return `name:${p.name.trim().toLowerCase()}`;
  });
  const uniqueKeys = new Set(playerKeys);
  if (playerKeys.length !== uniqueKeys.size) {
    return { valid: false, error: 'Duplicate players are not allowed in the same group' };
  }

  return { valid: true };
}

/**
 * Estimate wait time in minutes for a group at a specific position
 * @param {Object} params - Parameters
 * @param {number} params.position - Position in waitlist
 * @param {Array} params.courts - Court array
 * @param {Date} params.now - Current time
 * @param {number} params.avgGame - Average game time in minutes
 * @returns {number} Estimated wait in minutes
 */
function estimateWaitMinutes({ position, courts = [], now, avgGame = 75 }) {
  if (typeof position !== 'number' || position < 1) {
    throw new Error('Position must be a positive number');
  }
  if (!Array.isArray(courts)) {
    throw new Error('Courts must be an array');
  }
  if (!now || !(now instanceof Date)) {
    throw new Error('Invalid current time provided');
  }
  if (typeof avgGame !== 'number' || avgGame <= 0) {
    throw new Error('Average game time must be a positive number');
  }

  // If first in line, check for immediate availability
  if (position === 1) {
    // Count courts that will be available soon
    const availabilityTimes = [];

    for (let i = 0; i < courts.length; i++) {
      const court = courts[i];

      if (!court) {
        // Court is currently free
        return 0;
      }

      let endTime = null;

      // Check new structure (court.current)
      if (court.current && court.current.endTime) {
        endTime = new Date(court.current.endTime);
      }
      // Check old structure (court.endTime)
      else if (court.endTime) {
        endTime = new Date(court.endTime);
      }

      if (endTime && endTime > now) {
        const waitMinutes = Math.ceil((endTime.getTime() - now.getTime()) / (60 * 1000));
        availabilityTimes.push(waitMinutes);
      } else {
        // Court should be available now (may be overtime)
        return 0;
      }
    }

    // Return shortest wait time
    return availabilityTimes.length > 0 ? Math.min(...availabilityTimes) : 0;
  }

  // For positions beyond first, estimate based on court turnover
  const totalCourts = Math.max(courts.length, 1);
  const rounds = Math.ceil(position / totalCourts);
  const baseWait = (rounds - 1) * avgGame;

  // Add estimated wait for current games to finish
  let averageCurrentWait = 0;
  let occupiedCourts = 0;

  for (let i = 0; i < courts.length; i++) {
    const court = courts[i];

    if (court) {
      let endTime = null;

      // Check new structure (court.current)
      if (court.current && court.current.endTime) {
        endTime = new Date(court.current.endTime);
      }
      // Check old structure (court.endTime)
      else if (court.endTime) {
        endTime = new Date(court.endTime);
      }

      if (endTime && endTime > now) {
        const waitMinutes = Math.ceil((endTime.getTime() - now.getTime()) / (60 * 1000));
        averageCurrentWait += waitMinutes;
        occupiedCourts++;
      }
    }
  }

  if (occupiedCourts > 0) {
    averageCurrentWait = averageCurrentWait / occupiedCourts;
  } else {
    averageCurrentWait = 0;
  }

  return Math.max(0, Math.ceil(baseWait + averageCurrentWait));
}

// ============================================================
// Standalone Functions
// ============================================================

/**
 * estimateWaitForPositions({
 *   positions,            // array of positive integers: [1,2,3,...]
 *   currentFreeCount,     // number of courts free "now"
 *   nextFreeTimes,        // Date[] length = Config.Courts.TOTAL_COUNT (index n-1 -> court n)
 *   avgGameMinutes        // optional; default Tennis.Config.Timing.AVG_GAME
 * }) -> number[]          // minutes until playable for each position (rounded up, >= 0)
 *
 * Method: simulate court availability with a min-heap of next-available times.
 *   - Build an array of times:
 *       * push `now` for each currently free court (currentFreeCount times)
 *       * for remaining courts, push the corresponding nextFreeTimes[i]
 *   - For each seat in 1..max(positions):
 *       * pop the earliest time `t`
 *       * ETA for that seat is max(0, ceil((t - now)/60000))
 *       * push back `t + avgGameMinutes`
 *   - Return ETAs indexed by order of `positions`
 */
function estimateWaitForPositions({ positions, currentFreeCount, nextFreeTimes, avgGameMinutes }) {
  const now = new Date();
  const avg =
    Number.isFinite(avgGameMinutes) && avgGameMinutes > 0
      ? Math.floor(avgGameMinutes)
      : window.Tennis?.Config?.Timing?.AVG_GAME || 75;
  const total = window.Tennis?.Config?.Courts?.TOTAL_COUNT || nextFreeTimes?.length || 12;
  const times = [];

  // Build array of court availability times
  // First, add 'now' for each currently free court
  for (let i = 0; i < Math.min(currentFreeCount, total); i++) {
    times.push(now);
  }

  // Then add the actual next free times for all courts
  // We need ALL courts in the times array, not just occupied ones
  if (nextFreeTimes && Array.isArray(nextFreeTimes)) {
    for (let courtIdx = 0; courtIdx < total; courtIdx++) {
      const nextFreeTime = nextFreeTimes[courtIdx] ? new Date(nextFreeTimes[courtIdx]) : now;

      // Skip courts we already added as "free now"
      // Free courts should have nextFreeTime = now, but occupied courts have future times
      if (nextFreeTime > now) {
        times.push(nextFreeTime);
      }
    }
  }

  // If we don't have enough times, pad with 'now'
  while (times.length < total) {
    times.push(now);
  }
  // simple min-heap via array ops (n is small)
  const popMinIdx = () => {
    let mi = 0;
    for (let i = 1; i < times.length; i++) if (times[i] < times[mi]) mi = i;
    return mi;
  };
  const maxP = Math.max(...positions);
  const seatTimes = new Array(maxP);
  for (let seat = 0; seat < maxP; seat++) {
    const i = popMinIdx();
    const t = times[i];
    seatTimes[seat] = new Date(t);
    // advance that court by one average game
    times[i] = new Date(t.getTime() + avg * 60000);
  }
  return positions.map((p) => {
    const t = seatTimes[p - 1] || now;
    const diff = Math.max(0, t.getTime() - now.getTime());
    return Math.ceil(diff / 60000);
  });
}

/**
 * Check if a court is eligible for a group of the given size.
 * Court 8 is singles-only and rejects groups of 4+ players.
 * @param {number} courtNumber
 * @param {number} playerCount
 * @returns {boolean}
 */
function isCourtEligibleForGroup(courtNumber, playerCount) {
  if (courtNumber === SINGLES_ONLY_COURT_NUMBER && playerCount >= 4) {
    return false;
  }
  return true;
}

/**
 * simulateWaitlistEstimates - Proper simulation of waitlist wait times
 *
 * @param {Object} params
 * @param {Array} params.courts - Court[] (length 12, court state objects)
 * @param {Array} params.waitlist - Array<{ players: [], deferred: boolean }>
 * @param {Array} params.blocks - Array<{ courtNumber, startTime, endTime, isWetCourt }>
 * @param {Date} params.now - Current time
 * @param {number} [params.avgGameMinutes=75] - Average game duration
 * @param {number} [params.closingHour=22] - Club closing hour (for wet court fallback)
 * @returns {number[]} - Estimated minutes for each waitlist position
 */
function simulateWaitlistEstimates({ courts, waitlist, blocks, now, avgGameMinutes, closingHour }) {
  const avg =
    Number.isFinite(avgGameMinutes) && avgGameMinutes > 0
      ? avgGameMinutes
      : window.Tennis?.Config?.Timing?.AVG_GAME || 75;
  const closing = Number.isFinite(closingHour) ? closingHour : 22;
  const total = window.Tennis?.Config?.Courts?.TOTAL_COUNT || 12;
  const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
  const normalizedCourts = Array.isArray(courts) ? courts : [];
  const normalizedWaitlist = Array.isArray(waitlist) ? waitlist : [];

  if (normalizedWaitlist.length === 0) {
    return [];
  }

  // Build closing time for wet court fallback
  const closingTime = new Date(now);
  closingTime.setHours(closing, 0, 0, 0);

  // PHASE A: Build court availability timeline
  const timeline = [];

  for (let n = 1; n <= total; n++) {
    const court = normalizedCourts[n - 1];

    // Skip tournament courts - they have no predictable end time
    if (court?.session?.isTournament) {
      continue;
    }

    // Check if court is currently wet
    const isWet = normalizedBlocks.some((b) => {
      if (!b.isWetCourt || Number(b.courtNumber) !== n) return false;
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return start <= now && now < end;
    });

    if (isWet) {
      // Wet courts available at closing time (effectively removed from pool)
      timeline.push({ courtNumber: n, availableAt: new Date(closingTime) });
      continue;
    }

    // Start with base = now
    let base = new Date(now);

    // If court has active session, advance to scheduledEndAt
    if (court?.session?.scheduledEndAt) {
      const sessionEnd = new Date(court.session.scheduledEndAt);
      if (sessionEnd > base) {
        base = sessionEnd;
      }
    }

    // Walk through overlapping blocks (with 15-min registration buffer)
    // Keep advancing until no more overlapping blocks
    let advanced = true;
    while (advanced) {
      advanced = false;
      for (const b of normalizedBlocks) {
        if (Number(b.courtNumber) !== n) continue;
        if (b.isWetCourt) continue; // Wet already handled above

        const blockStart = new Date(b.startTime);
        const blockEnd = new Date(b.endTime);
        const effectiveStart = new Date(blockStart.getTime() - REGISTRATION_BUFFER_MS);

        if (effectiveStart <= base && base < blockEnd) {
          base = new Date(blockEnd);
          advanced = true;
        }
      }
    }

    // Check minimum useful session (20 min)
    // Find next block after base
    let needsRecheck = true;
    while (needsRecheck) {
      needsRecheck = false;

      let nextBlock = null;
      let nextBlockStart = Infinity;

      for (const b of normalizedBlocks) {
        if (Number(b.courtNumber) !== n) continue;
        if (b.isWetCourt) continue;

        const blockStart = new Date(b.startTime);
        if (blockStart > base && blockStart.getTime() < nextBlockStart) {
          nextBlock = b;
          nextBlockStart = blockStart.getTime();
        }
      }

      if (nextBlock) {
        const usableMs = nextBlockStart - base.getTime();
        if (usableMs < MIN_USEFUL_SESSION_MS) {
          // Not enough time - advance past this block
          base = new Date(nextBlock.endTime);
          needsRecheck = true;

          // Re-walk overlapping blocks from new base
          let advancedAgain = true;
          while (advancedAgain) {
            advancedAgain = false;
            for (const b of normalizedBlocks) {
              if (Number(b.courtNumber) !== n) continue;
              if (b.isWetCourt) continue;

              const blockStart = new Date(b.startTime);
              const blockEnd = new Date(b.endTime);
              const effectiveStart = new Date(blockStart.getTime() - REGISTRATION_BUFFER_MS);

              if (effectiveStart <= base && base < blockEnd) {
                base = new Date(blockEnd);
                advancedAgain = true;
              }
            }
          }
        }
      }
    }

    timeline.push({ courtNumber: n, availableAt: base });
  }

  // Sort timeline by availableAt ascending
  timeline.sort((a, b) => a.availableAt.getTime() - b.availableAt.getTime());

  // PHASE B: Simulate waitlist assignment
  const results = [];
  const mutableTimeline = timeline.map((t) => ({ ...t }));

  for (let i = 0; i < normalizedWaitlist.length; i++) {
    const group = normalizedWaitlist[i];
    const playerCount = Array.isArray(group.players) ? group.players.length : 0;
    const isDeferred = group.deferred === true;
    const sessionDuration = playerCount >= 4 ? 90 : 60;

    // Find earliest eligible court
    let foundIdx = -1;

    for (let j = 0; j < mutableTimeline.length; j++) {
      const entry = mutableTimeline[j];

      // Check Court 8 eligibility
      if (!isCourtEligibleForGroup(entry.courtNumber, playerCount)) {
        continue;
      }

      // For deferred groups, check full session time available
      if (isDeferred) {
        // Find next block for this court after availableAt
        let nextBlockStart = Infinity;
        for (const b of normalizedBlocks) {
          if (Number(b.courtNumber) !== entry.courtNumber) continue;
          if (b.isWetCourt) continue;

          const blockStart = new Date(b.startTime);
          if (blockStart > entry.availableAt && blockStart.getTime() < nextBlockStart) {
            nextBlockStart = blockStart.getTime();
          }
        }

        const requiredMs = (sessionDuration + 5) * 60 * 1000;
        const availableMs = nextBlockStart - entry.availableAt.getTime();

        if (availableMs < requiredMs) {
          continue; // Not enough time for deferred group
        }
      }

      foundIdx = j;
      break;
    }

    if (foundIdx >= 0) {
      const entry = mutableTimeline[foundIdx];
      const estimatedMinutes = Math.max(
        0,
        Math.ceil((entry.availableAt.getTime() - now.getTime()) / 60000)
      );
      results.push(estimatedMinutes);

      // Remove this entry and re-insert with new availability
      const courtNumber = entry.courtNumber;
      const newAvailableAt = new Date(entry.availableAt.getTime() + avg * 60000);

      mutableTimeline.splice(foundIdx, 1);

      // Insert in sorted position
      let insertIdx = mutableTimeline.findIndex((t) => t.availableAt > newAvailableAt);
      if (insertIdx === -1) insertIdx = mutableTimeline.length;
      mutableTimeline.splice(insertIdx, 0, { courtNumber, availableAt: newAvailableAt });
    } else {
      // Fallback: rough estimate when no court found
      const fallback = Math.ceil(((i + 1) * avg) / Math.max(total, 1));
      results.push(fallback);
    }
  }

  return results;
}

// ============================================================
// Build Waitlist Object (exactly as IIFE does)
// ============================================================

const Waitlist = {
  validateGroup,
  estimateWaitMinutes,
};
Waitlist.estimateWaitForPositions = estimateWaitForPositions;
Waitlist.simulateWaitlistEstimates = simulateWaitlistEstimates;
Waitlist.signature = waitlistSignature;

// ============================================================
// Legacy Window Attachment
// ============================================================

if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.Domain = window.Tennis.Domain || {};

  // Primary attachment
  window.Tennis.Domain.Waitlist = Waitlist;

  // Backward compat - lowercase alias with merged methods
  // Replicate IIFE exactly: create waitlist as reference
  // to Waitlist, then add/merge methods
  const api =
    window.Tennis.Domain.waitlist ||
    (window.Tennis.Domain.waitlist = window.Tennis.Domain.Waitlist || {});

  api.estimateWaitForPositions = api.estimateWaitForPositions || estimateWaitForPositions;

  if (!api.estimateWaitMinutes) {
    api.estimateWaitMinutes = function ({
      position = 1,
      currentFreeCount,
      nextFreeTimes,
      avgGameMinutes,
    }) {
      return estimateWaitForPositions({
        positions: [position],
        currentFreeCount,
        nextFreeTimes,
        avgGameMinutes,
      })[0];
    };
  }
}

// ============================================================
// Exports
// ============================================================

export {
  Waitlist,
  validateGroup,
  estimateWaitMinutes,
  estimateWaitForPositions,
  simulateWaitlistEstimates,
};
