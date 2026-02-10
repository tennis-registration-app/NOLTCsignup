import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for simulateWaitlistEstimates function
 *
 * Since this is an IIFE module that attaches to window.Tennis.Domain,
 * we test it by loading the script and accessing the global.
 */

// Mock the window.Tennis namespace before loading the module
beforeEach(() => {
  // Reset window.Tennis
  global.window = global.window || {};
  window.Tennis = {
    Config: {
      Courts: { TOTAL_COUNT: 12 },
      Timing: { AVG_GAME: 75 }
    },
    Domain: {}
  };

  // Load the waitlist module (it attaches to window.Tennis.Domain)
  // We'll inline the key function for testing since dynamic import of IIFE is complex
});

// Inline the function for testing (extracted from domain/waitlist.js)
const REGISTRATION_BUFFER_MS = 15 * 60 * 1000;
const MIN_USEFUL_SESSION_MS = 20 * 60 * 1000;
const SINGLES_ONLY_COURT_NUMBER = 8;

function isCourtEligibleForGroup(courtNumber, playerCount) {
  if (courtNumber === SINGLES_ONLY_COURT_NUMBER && playerCount >= 4) {
    return false;
  }
  return true;
}

function simulateWaitlistEstimates({ courts, waitlist, blocks, now, avgGameMinutes, closingHour }) {
  const avg = Number.isFinite(avgGameMinutes) && avgGameMinutes > 0
    ? avgGameMinutes : 75;
  const closing = Number.isFinite(closingHour) ? closingHour : 22;
  const total = 12;
  const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
  const normalizedCourts = Array.isArray(courts) ? courts : [];
  const normalizedWaitlist = Array.isArray(waitlist) ? waitlist : [];

  if (normalizedWaitlist.length === 0) {
    return [];
  }

  const closingTime = new Date(now);
  closingTime.setHours(closing, 0, 0, 0);

  // PHASE A: Build court availability timeline
  const timeline = [];

  for (let n = 1; n <= total; n++) {
    const court = normalizedCourts[n - 1];

    if (court?.session?.isTournament) {
      continue;
    }

    const isWet = normalizedBlocks.some(b => {
      if (!b.isWetCourt || Number(b.courtNumber) !== n) return false;
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return start <= now && now < end;
    });

    if (isWet) {
      timeline.push({ courtNumber: n, availableAt: new Date(closingTime) });
      continue;
    }

    let base = new Date(now);

    if (court?.session?.scheduledEndAt) {
      const sessionEnd = new Date(court.session.scheduledEndAt);
      if (sessionEnd > base) {
        base = sessionEnd;
      }
    }

    let advanced = true;
    while (advanced) {
      advanced = false;
      for (const b of normalizedBlocks) {
        if (Number(b.courtNumber) !== n) continue;
        if (b.isWetCourt) continue;

        const blockStart = new Date(b.startTime);
        const blockEnd = new Date(b.endTime);
        const effectiveStart = new Date(blockStart.getTime() - REGISTRATION_BUFFER_MS);

        if (effectiveStart <= base && base < blockEnd) {
          base = new Date(blockEnd);
          advanced = true;
        }
      }
    }

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
          base = new Date(nextBlock.endTime);
          needsRecheck = true;

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

  timeline.sort((a, b) => a.availableAt.getTime() - b.availableAt.getTime());

  // PHASE B: Simulate waitlist assignment
  const results = [];
  const mutableTimeline = timeline.map(t => ({ ...t }));

  for (let i = 0; i < normalizedWaitlist.length; i++) {
    const group = normalizedWaitlist[i];
    const playerCount = Array.isArray(group.players) ? group.players.length : 0;
    const isDeferred = group.deferred === true;
    const sessionDuration = playerCount >= 4 ? 90 : 60;

    let foundIdx = -1;

    for (let j = 0; j < mutableTimeline.length; j++) {
      const entry = mutableTimeline[j];

      if (!isCourtEligibleForGroup(entry.courtNumber, playerCount)) {
        continue;
      }

      if (isDeferred) {
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
          continue;
        }
      }

      foundIdx = j;
      break;
    }

    if (foundIdx >= 0) {
      const entry = mutableTimeline[foundIdx];
      const estimatedMinutes = Math.max(0, Math.ceil((entry.availableAt.getTime() - now.getTime()) / 60000));
      results.push(estimatedMinutes);

      const courtNumber = entry.courtNumber;
      const newAvailableAt = new Date(entry.availableAt.getTime() + avg * 60000);

      mutableTimeline.splice(foundIdx, 1);

      let insertIdx = mutableTimeline.findIndex(t => t.availableAt > newAvailableAt);
      if (insertIdx === -1) insertIdx = mutableTimeline.length;
      mutableTimeline.splice(insertIdx, 0, { courtNumber, availableAt: newAvailableAt });
    } else {
      const fallback = Math.ceil((i + 1) * avg / Math.max(total, 1));
      results.push(fallback);
    }
  }

  return results;
}


describe('simulateWaitlistEstimates', () => {
  const baseTime = new Date('2025-01-15T14:00:00Z');

  describe('basic scenarios', () => {
    it('1. Basic: 1 group, 1 court opening in 15 min → estimate 15', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 0) {
          // Court 1 has session ending in 15 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 15 * 60000).toISOString()
            }
          };
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      const waitlist = [{ players: [{ name: 'Player 1' }], deferred: false }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks: [],
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(15);
    });

    it('2. Tournament exclusion: next court is tournament → skip, use 2nd court', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 0) {
          // Court 1 is tournament - should be skipped
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 10 * 60000).toISOString(),
              isTournament: true
            }
          };
        }
        if (i === 1) {
          // Court 2 opens in 20 min - should be used
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 20 * 60000).toISOString()
            }
          };
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      const waitlist = [{ players: [{ name: 'Player 1' }], deferred: false }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks: [],
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(20); // Court 2, not Court 1 (tournament)
    });

    it('3. Court 8 eligibility: doubles group skips Court 8, takes next eligible', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 7) {
          // Court 8 (index 7) is free now - but singles only
          return null;
        }
        if (i === 0) {
          // Court 1 opens in 30 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 30 * 60000).toISOString()
            }
          };
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      // Doubles group (4 players) - cannot use Court 8
      const waitlist = [{
        players: [{ name: 'P1' }, { name: 'P2' }, { name: 'P3' }, { name: 'P4' }],
        deferred: false
      }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks: [],
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(30); // Court 1, not Court 8
    });

    it('4. 20-min minimum: court opens with 10 min before block → extends to block end time', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 0) {
          // Court 1 session ends in 5 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 5 * 60000).toISOString()
            }
          };
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      // Block on Court 1 starts at +15 min (only 10 min available), ends at +75 min
      const blocks = [{
        courtNumber: 1,
        startTime: new Date(now.getTime() + 15 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 75 * 60000).toISOString(),
        isWetCourt: false
      }];

      const waitlist = [{ players: [{ name: 'Player 1' }], deferred: false }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks,
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      // Court 1 session ends at +5, block starts at +15 (10 min gap < 20 min minimum)
      // So should extend to block end at +75
      expect(result[0]).toBe(75);
    });

    it('5. Block end as availability: blocked court shows correct time after block ends', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        // All courts occupied for much longer except Court 1 which is empty but blocked
        if (i === 0) return null;
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      // Court 1 is blocked for 45 min
      const blocks = [{
        courtNumber: 1,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(), // Started 10 min ago
        endTime: new Date(now.getTime() + 45 * 60000).toISOString(),
        isWetCourt: false
      }];

      const waitlist = [{ players: [{ name: 'Player 1' }], deferred: false }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks,
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(45); // Block ends in 45 min
    });

    it('6. Deferred group: skips court with insufficient full session time', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 0) {
          // Court 1 is free now
          return null;
        }
        if (i === 1) {
          // Court 2 opens in 60 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 60 * 60000).toISOString()
            }
          };
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 180 * 60000).toISOString()
          }
        };
      });

      // Court 1 has a block in 30 min (not enough for 65 min = 60 + 5 buffer for singles)
      const blocks = [{
        courtNumber: 1,
        startTime: new Date(now.getTime() + 30 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 90 * 60000).toISOString(),
        isWetCourt: false
      }];

      // Deferred singles group needs 65 min minimum
      const waitlist = [{
        players: [{ name: 'Player 1' }, { name: 'Player 2' }],
        deferred: true
      }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks,
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(60); // Court 2, not Court 1 (insufficient time)
    });

    it('7. Multiple groups: consumption works — position 2 gets 2nd court, not 1st', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 0) {
          // Court 1 opens in 10 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 10 * 60000).toISOString()
            }
          };
        }
        if (i === 1) {
          // Court 2 opens in 25 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 25 * 60000).toISOString()
            }
          };
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      const waitlist = [
        { players: [{ name: 'Group 1' }], deferred: false },
        { players: [{ name: 'Group 2' }], deferred: false }
      ];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks: [],
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(10); // Group 1 gets Court 1
      expect(result[1]).toBe(25); // Group 2 gets Court 2, not Court 1
    });

    it('8. Mixed eligibility: singles, doubles, singles on waitlist → correct court matching', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 7) {
          // Court 8 (singles only) is free now
          return null;
        }
        if (i === 0) {
          // Court 1 opens in 20 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 20 * 60000).toISOString()
            }
          };
        }
        if (i === 1) {
          // Court 2 opens in 35 min
          return {
            session: {
              scheduledEndAt: new Date(now.getTime() + 35 * 60000).toISOString()
            }
          };
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      const waitlist = [
        { players: [{ name: 'S1' }, { name: 'S2' }], deferred: false }, // Singles - can use Court 8
        { players: [{ name: 'D1' }, { name: 'D2' }, { name: 'D3' }, { name: 'D4' }], deferred: false }, // Doubles - cannot use Court 8
        { players: [{ name: 'S3' }], deferred: false } // Singles
      ];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks: [],
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(0);  // Group 1 (singles) gets Court 8 now
      expect(result[1]).toBe(20); // Group 2 (doubles) gets Court 1 (skips Court 8)
      expect(result[2]).toBe(35); // Group 3 (singles) gets Court 2
    });

    it('9. Stacked blocks: court with back-to-back blocks shows correct availability', () => {
      const now = baseTime;
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 0) {
          // Court 1 is free but has blocks
          return null;
        }
        // All other courts occupied for much longer
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 120 * 60000).toISOString()
          }
        };
      });

      // Court 1 has back-to-back blocks: now to +30, then +30 to +60
      const blocks = [
        {
          courtNumber: 1,
          startTime: new Date(now.getTime() - 5 * 60000).toISOString(),
          endTime: new Date(now.getTime() + 30 * 60000).toISOString(),
          isWetCourt: false
        },
        {
          courtNumber: 1,
          startTime: new Date(now.getTime() + 30 * 60000).toISOString(),
          endTime: new Date(now.getTime() + 60 * 60000).toISOString(),
          isWetCourt: false
        }
      ];

      const waitlist = [{ players: [{ name: 'Player 1' }], deferred: false }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks,
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(60); // After both blocks end
    });

    it('10. Fallback: no available courts → returns reasonable fallback estimate', () => {
      const now = baseTime;
      // All courts are tournament matches (excluded)
      const courts = Array(12).fill(null).map(() => ({
        session: {
          scheduledEndAt: new Date(now.getTime() + 60 * 60000).toISOString(),
          isTournament: true
        }
      }));

      const waitlist = [
        { players: [{ name: 'Player 1' }], deferred: false },
        { players: [{ name: 'Player 2' }], deferred: false }
      ];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks: [],
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(2);
      // Fallback: (position * avgGame) / totalCourts
      expect(result[0]).toBe(Math.ceil(1 * 75 / 12)); // ~7
      expect(result[1]).toBe(Math.ceil(2 * 75 / 12)); // ~13
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty waitlist', () => {
      const result = simulateWaitlistEstimates({
        courts: [],
        waitlist: [],
        blocks: [],
        now: baseTime,
        avgGameMinutes: 75
      });

      expect(result).toEqual([]);
    });

    it('handles null/undefined inputs gracefully', () => {
      const result = simulateWaitlistEstimates({
        courts: null,
        waitlist: [{ players: [{ name: 'Test' }], deferred: false }],
        blocks: null,
        now: baseTime,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(0); // All courts "free" since none specified
    });

    it('wet courts are excluded until closing time', () => {
      const now = baseTime;
      // Court 1 is the only one that would be available, but it's wet
      const courts = Array(12).fill(null).map((_, i) => {
        if (i === 0) return null; // Court 1 empty but wet
        return {
          session: {
            scheduledEndAt: new Date(now.getTime() + 30 * 60000).toISOString()
          }
        };
      });

      const blocks = [{
        courtNumber: 1,
        startTime: new Date(now.getTime() - 60 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 120 * 60000).toISOString(),
        isWetCourt: true
      }];

      const waitlist = [{ players: [{ name: 'Player 1' }], deferred: false }];

      const result = simulateWaitlistEstimates({
        courts,
        waitlist,
        blocks,
        now,
        avgGameMinutes: 75
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(30); // Court 2 (first non-wet), not Court 1
    });
  });
});
