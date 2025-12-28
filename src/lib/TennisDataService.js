/**
 * TennisDataService - Main data service for tennis court management
 *
 * @deprecated This is a legacy localStorage-based service.
 * Migrate to API-based TennisBackend (TennisQueries + TennisCommands).
 * Slated for removal once API-only migration completes.
 *
 * Handles CRUD operations for courts, waitlist, and blocks.
 * Currently uses localStorage via window globals (dataStore, Tennis.Storage).
 *
 * Architecture Note:
 * This service uses window globals for backward compatibility with the
 * existing codebase. Future refactoring can inject adapters via constructor.
 */

import { TENNIS_CONFIG } from './config.js';
import { DataValidation } from './DataValidation.js';
import { storageAdapter } from './StorageAdapter.js';

// These globals are set by shared scripts loaded before the React app
// They provide the data layer and event system
const getDataStore = () => window.Tennis?.DataStore || window.DataStore;
const getTennis = () => window.Tennis || {};
const getEvents = () => window.Tennis?.Events;
const getStorage = () => window.Tennis?.Storage;

// Logger - matches App.jsx pattern
const DEBUG = false;
const log = {
  debug: (...a) => { if (DEBUG) console.debug('[TennisDataService]', ...a); },
};

// Import validateGroupCompat from App.jsx scope (will be passed or accessed via window)
const getValidateGroupCompat = () => window.validateGroupCompat || (() => ({ ok: true, errors: [] }));

// Import getCourtBlockStatus from App.jsx scope
const getCourtBlockStatus = () => window.getCourtBlockStatus || (
  (courtNumber) => {
    try {
      const fn = window.Tennis?.Domain?.blocks?.getCourtBlockStatus ||
                 window.getCourtBlockStatus;
      return fn ? fn(courtNumber) : null;
    } catch (e) {
      return null;
    }
  }
);

// Import TennisBusinessLogic reference (will be set after both are loaded)
let _tennisBusinessLogic = null;
const getTennisBusinessLogic = () =>
  _tennisBusinessLogic || window.TennisBusinessLogic || {};

export const setTennisBusinessLogic = (logic) => {
  _tennisBusinessLogic = logic;
};

/**
 * TennisDataService object
 * Manages court assignments, waitlist, and block operations
 */
export const TennisDataService = window.TennisDataService || {
  STORAGE_KEY: TENNIS_CONFIG.STORAGE.KEY,
  COURT_COUNT: TENNIS_CONFIG.COURTS.TOTAL_COUNT,

  getEmptyData() {
    return {
      courts: Array(this.COURT_COUNT).fill(null),
      waitingGroups: [],
      recentlyCleared: []
    };
  },

  async loadData() {
    try {
      const dataStore = getDataStore();
      const data = await dataStore.get(this.STORAGE_KEY);
      if (!data) return this.getEmptyData();

      if (!data || typeof data !== 'object') return this.getEmptyData();

      // Use validation to ensure data integrity
      const sanitized = DataValidation.sanitizeStorageData(data);

      // Ensure recentlyCleared array exists
      if (!sanitized.recentlyCleared) {
        sanitized.recentlyCleared = [];
      }

      return sanitized;
    } catch (error) {
      console.error('Failed to load court data:', error);
      return this.getEmptyData();
    }
  },

  async saveData(data) {
    try {
      const dataStore = getDataStore();
      const Tennis = getTennis();

      // PRE-CALCULATE availability data before saving
      data.calculatedAvailability = {
        waitTimes: await this.calculateWaitTimes(data),
        nextAvailable: await this.calculateNextAvailable(data),
        timestamp: new Date().toISOString()
      };

      log.debug("TennisDataService.saveData - data to save:", {
        courtsCount: data.courts ? data.courts.length : 0,
        waitingGroupsCount: data.waitingGroups ? data.waitingGroups.length : 0,
        recentlyClearedCount: data.recentlyCleared ? data.recentlyCleared.length : 0,
        calculatedWaitTimes: data.calculatedAvailability.waitTimes,
        calculatedNextAvailable: data.calculatedAvailability.nextAvailable.length
      });

      // --- Guard: do not clobber active courts with an empty snapshot ---
      try {
        const now = new Date();
        const current = Tennis.Storage.readDataSafe();
        const currAssigned = (current?.courts || []).filter(c => !!c?.current).length;
        const nextAssigned = (data?.courts || []).filter(c => !!c?.current).length;

        const hasFutureCurrent = (current?.courts || []).some(c => {
          const end = c?.current?.endTime ? new Date(c.current.endTime) : null;
          return end && !isNaN(end) && end > now;
        });

        if (currAssigned > 0 && nextAssigned === 0 && hasFutureCurrent) {
          console.warn('[saveData] Skip write: candidate snapshot has assigned=0 but live data has active courts with future end times');
          Tennis.Events.emitDom('DATA_UPDATED', { key: Tennis.Storage.STORAGE.DATA, data: current });
          Tennis.Events.emitDom('tennisDataUpdate', { key: Tennis.Storage.STORAGE.DATA, data: current });
          return { success: true, skipped: true };
        }
      } catch (e) {
        console.warn('[saveData] Guard check failed:', e?.message);
      }
      // --- End guard ---

      await dataStore.set(this.STORAGE_KEY, data, { immediate: true });
      Tennis.Events.emitDom('tennisDataUpdate', { key: Tennis.Storage.STORAGE.DATA, data });
      return { success: true };
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        return { success: false, error: 'Storage is full. Please clear some browser data.' };
      }
      return { success: false, error: 'Failed to save data. Please try again.' };
    }
  },

  // Service-local validation that tolerates legacy and new APIs
  serviceValidateGroupCompat(group) {
    const playersArr = Array.isArray(group?.players) ? group.players
      : Array.isArray(group) ? group
        : [];
    const guests = group?.guests ?? 0;

    // Use the robust validateGroupCompat function
    const validateGroupCompat = getValidateGroupCompat();
    return validateGroupCompat(playersArr, guests);
  },

  async assignCourt(courtNumber, group, duration) {
    const Tennis = getTennis();
    const DataStore = getDataStore();
    const validateGroupCompat = getValidateGroupCompat();
    const TennisBusinessLogic = getTennisBusinessLogic();

    const groupObj = Array.isArray(group) ? { players: group, guests: 0 } : (group || {});
    let playersArray = Array.isArray(groupObj.players) ? groupObj.players : [];
    const guests = Number.isFinite(groupObj.guests) ? groupObj.guests : 0;

    // Resolve/attach memberId where possible
    try {
      const R = window.Tennis?.Domain?.roster;
      const S = window.Tennis?.Storage;
      const roster = (window.__memberRoster) || S.readJSON('tennisMembers') || S.readJSON('members') || [];
      if (R?.enrichPlayersWithIds) {
        playersArray = R.enrichPlayersWithIds(playersArray, roster);
      }
    } catch (_) {}

    // Validate inputs
    if (!DataValidation.isValidCourtNumber(courtNumber)) {
      return { success: false, error: `Invalid court number. Please select 1-${this.COURT_COUNT}.` };
    }

    const { ok, errors } = this.serviceValidateGroupCompat(groupObj);
    if (!ok) {
      return { success: false, error: (errors && errors.join(', ')) || 'Validation error' };
    }

    if (!DataValidation.isValidDuration(duration)) {
      return { success: false, error: 'Invalid duration. Please select a valid time period.' };
    }

    // Read the fresh snapshot
    const S = window.Tennis?.Storage;
    const next = S?.readDataClone ? S.readDataClone() : S.readDataSafe() || {};

    // Ensure shape
    const courtCount = (window.Tennis?.Config?.Courts?.TOTAL_COUNT) || (next.courts?.length) || 12;
    next.courts = Array.isArray(next.courts) ? next.courts.slice() : Array.from({ length: courtCount }, () => null);
    next.waitingGroups = Array.isArray(next.waitingGroups) ? next.waitingGroups.slice() : [];
    next.recentlyCleared = Array.isArray(next.recentlyCleared) ? next.recentlyCleared.slice() : [];

    // Defensive duplicate-prevention (service)
    try {
      const R = window.Tennis?.Domain?.roster || window.Tennis?.Domain?.Roster;
      if (R && typeof R.checkGroupConflicts === 'function') {
        const conflicts = R.checkGroupConflicts({ data: next, groupPlayers: playersArray });
        if (conflicts.playing.length || conflicts.waiting.length) {
          const messages = [];
          conflicts.playing.forEach(p => {
            messages.push(`${p.name} is already playing on Court ${p.court}`);
          });
          conflicts.waiting.forEach(p => {
            messages.push(`${p.name} is already on the waitlist (position ${p.position})`);
          });
          return { success: false, error: messages.join('\n') };
        }
      }
    } catch (e) {
      // optional: dbg('[assignCourt] roster check failed', e);
    }

    // Compute assignment payload
    const idx = courtNumber - 1;
    const now = new Date();

    // Check if any player in this group recently cleared a court
    const originalEndTime = TennisBusinessLogic.getOriginalEndTimeForGroup?.(playersArray, next.recentlyCleared);

    let end;
    let isTimeLimited = false;
    if (originalEndTime && new Date(originalEndTime) > now) {
      end = new Date(originalEndTime);
      isTimeLimited = true;
      console.log(`Group contains players who recently cleared early. Using original end time: ${end.toLocaleTimeString()}`);
    } else {
      end = new Date(now.getTime() + (duration * 60000));
    }

    const assignment = {
      players: playersArray,
      guests,
      startTime: now.toISOString(),
      endTime: end.toISOString(),
      assignedAt: now.toISOString(),
      duration
    };

    // Preserve other courts; only touch the target index
    const existingCourt = next.courts[idx];
    let replacedGroup = null;

    if (existingCourt?.current) {
      replacedGroup = {
        players: existingCourt.current.players,
        endTime: existingCourt.current.endTime
      };

      // Add to historical games for search functionality (bumped game)
      if (window.APP_UTILS && window.APP_UTILS.addHistoricalGame) {
        console.log('[Registration assignCourt] Adding bumped game to historical storage');
        window.APP_UTILS.addHistoricalGame({
          courtNumber: courtNumber,
          players: existingCourt.current.players,
          startTime: existingCourt.current.startTime,
          endTime: now.toISOString(),
          duration: existingCourt.current.duration,
          clearReason: 'Bumped'
        });
      } else {
        console.warn('[Registration assignCourt] APP_UTILS.addHistoricalGame not available');
      }
    }

    // Set the assignment on target court only
    next.courts[idx] = { ...(existingCourt || {}), current: assignment };

    // Remove the assigned group from waitlist if they were waiting
    const groupMemberIds = playersArray.map(p => p.id);
    next.waitingGroups = next.waitingGroups.filter(waitingGroup => {
      const waitingIds = waitingGroup.players.map(p => p.id);
      return !groupMemberIds.some(id => waitingIds.includes(id));
    });

    // Write via the unified path
    const key = S.STORAGE.DATA;
    const prev = S.readDataSafe ? S.readDataSafe() : JSON.parse(localStorage.getItem(key) || 'null') || {};
    const merged = window.APP_UTILS.preservePromotions(prev, next);

    if (typeof DataStore?.set === 'function') {
      await DataStore.set(key, merged);
    } else {
      S.writeJSON(S.STORAGE.UPDATE_TICK, Date.now());
      if (S.writeJSON) {
        S.writeJSON(key, merged);
      } else {
        localStorage.setItem(key, JSON.stringify(merged));
      }
      window.Tennis?.Events?.emitDom?.('DATA_UPDATED', { key, data: merged });
      window.Tennis?.Events?.emitDom?.('tennisDataUpdate', { key, data: merged });
      window.dispatchEvent(new Event('tennisDataUpdate'));
      window.dispatchEvent(new Event('DATA_UPDATED'));
    }

    return { success: true, replacedGroup: replacedGroup, isTimeLimited };
  },

  convertToNewFormat(court) {
    if (!court) return null;

    if (court.current || court.history) {
      return court;
    }

    if (court.players) {
      return {
        current: {
          players: court.players,
          startTime: court.startTime,
          endTime: court.endTime,
          assignedAt: court.assignedAt,
          duration: court.duration
        },
        history: []
      };
    }

    return null;
  },

  async clearCourt(courtNumber, opts = {}) {
    const Tennis = getTennis();

    // Fresh read & deep clone
    const raw = Tennis.Storage.readDataSafe() || {};
    const data = (typeof structuredClone === 'function')
      ? structuredClone(raw)
      : JSON.parse(JSON.stringify(raw));

    // Normalize arrays and index
    const idx = Math.max(0, (parseInt(courtNumber, 10) || 0) - 1);
    data.courts = Array.isArray(data.courts) ? data.courts : [];
    data.courts[idx] = data.courts[idx] || { history: [] };
    const court = data.courts[idx];
    court.history = Array.isArray(court.history) ? court.history : [];

    if (!court.current) {
      return { success: false, error: `Court ${idx + 1} is already empty.` };
    }

    const now = new Date();
    const cur = court.current;
    const originalEndTime = cur.endTime;
    const end = cur?.endTime ? new Date(cur.endTime) : null;
    if (!end || isNaN(end) || end > now) {
      cur.endTime = now.toISOString();
    }
    court.history.push(cur);
    court.current = null;

    // Add to historical games for search functionality
    if (window.APP_UTILS && window.APP_UTILS.addHistoricalGame) {
      window.APP_UTILS.addHistoricalGame({
        courtNumber: courtNumber,
        players: cur.players,
        startTime: cur.startTime,
        endTime: now.toISOString(),
        duration: cur.duration,
        clearReason: opts.clearReason || 'Cleared'
      });
    }

    // Track recentlyCleared
    data.recentlyCleared = Array.isArray(data.recentlyCleared) ? data.recentlyCleared.slice() : [];

    const recentlyClearedEntry = {
      courtNumber,
      clearedAt: now.toISOString(),
      originalEndTime: originalEndTime,
      players: cur.players || [],
      source: opts.source || 'manual'
    };

    data.recentlyCleared.push(recentlyClearedEntry);

    // Persist via unified path
    const key = Tennis.Storage.STORAGE.DATA;
    const prev = Tennis.Storage.readDataSafe ? Tennis.Storage.readDataSafe() : JSON.parse(localStorage.getItem(key) || 'null') || {};
    const merged = window.APP_UTILS.preservePromotions(prev, data);
    Tennis.DataStore.set(key, merged);
    return { success: true };
  },

  async changeCourt(fromCourtNumber, toCourtNumber, group, duration, originalCourtData) {
    if (fromCourtNumber < 1 || fromCourtNumber > this.COURT_COUNT ||
        toCourtNumber < 1 || toCourtNumber > this.COURT_COUNT) {
      return { success: false, error: `Invalid court number.` };
    }

    const data = await this.loadData();

    if (originalCourtData) {
      data.courts[fromCourtNumber - 1] = originalCourtData;
    } else {
      data.courts[fromCourtNumber - 1] = null;
    }

    const now = new Date();
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + duration);

    const previousCourt = data.courts[toCourtNumber - 1];
    let replacedGroup = null;

    if (previousCourt && new Date(previousCourt.endTime) <= now) {
      replacedGroup = {
        players: previousCourt.players,
        endTime: previousCourt.endTime
      };

      if (previousCourt.players && previousCourt.players.length > 0 && !previousCourt.wasCleared) {
        data.courts[toCourtNumber - 1].endTime = now.toISOString();
        data.courts[toCourtNumber - 1].wasCleared = true;

        const historyResult = await this.saveData(data);
        if (!historyResult.success) {
          return historyResult;
        }

        const updatedData = await this.loadData();
        data.courts = updatedData.courts;
      }
    }

    data.courts[toCourtNumber - 1] = {
      players: group,
      startTime: now,
      endTime: endTime,
      assignedAt: now,
      duration: duration
    };

    const result = await this.saveData(data);

    if (result.success) {
      return {
        success: true,
        replacedGroup: replacedGroup
      };
    }

    return result;
  },

  async addToWaitlistLegacy(group) {
    // Legacy shadow guard - prefer shared service if available
    if (window.TennisDataService?.addToWaitlist && window.TennisDataService !== TennisDataService) {
      return window.TennisDataService.addToWaitlist(group);
    }

    let players = group
      .map(p => ({
        id: String(p.id || '').trim(),
        name: String(p.name || '').trim(),
        memberId: p.memberId,
        ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
        ...(p.sponsor && { sponsor: p.sponsor })
      }))
      .filter(p => p && p.id && p.name);

    // Resolve/attach memberId where possible
    try {
      const R = window.Tennis?.Domain?.roster;
      const S = window.Tennis?.Storage;
      const roster = (window.__memberRoster) || S.readJSON('tennisMembers') || S.readJSON('members') || [];
      if (R?.enrichPlayersWithIds) {
        players = R.enrichPlayersWithIds(players, roster);
      }
    } catch (_) {}

    const guests = group.filter(p => p.isGuest).length;
    const validateGroupCompat = getValidateGroupCompat();

    const validation = validateGroupCompat(players, guests);
    if (!validation.ok) {
      return { success: false, error: validation.errors.join('\n') };
    }

    const data = await this.loadData();

    const enrichedGroup = group.map((p, idx) => ({
      ...p,
      memberId: players[idx]?.memberId || p.memberId
    }));

    data.waitingGroups.push({
      players: enrichedGroup,
      timestamp: new Date()
    });

    return await this.saveData(data);
  },

  async removeFromWaitlist(index) {
    const data = await this.loadData();

    if (index < 0 || index >= data.waitingGroups.length) {
      return { success: false, error: 'Invalid waitlist position.' };
    }

    data.waitingGroups.splice(index, 1);
    return await this.saveData(data);
  },

  async clearAllCourts() {
    const data = await this.loadData();
    data.courts = Array(this.COURT_COUNT).fill(null);
    return await this.saveData(data);
  },

  async clearWaitlist() {
    const data = await this.loadData();
    data.waitingGroups = [];
    return await this.saveData(data);
  },

  async moveCourt(fromCourtNumber, toCourtNumber) {
    if (fromCourtNumber < 1 || fromCourtNumber > this.COURT_COUNT ||
        toCourtNumber < 1 || toCourtNumber > this.COURT_COUNT) {
      return { success: false, error: `Invalid court number.` };
    }

    const data = await this.loadData();

    if (!data.courts[fromCourtNumber - 1]) {
      return { success: false, error: `Court ${fromCourtNumber} is empty.` };
    }

    if (data.courts[toCourtNumber - 1]) {
      return { success: false, error: `Court ${toCourtNumber} is already occupied.` };
    }

    data.courts[toCourtNumber - 1] = data.courts[fromCourtNumber - 1];
    data.courts[fromCourtNumber - 1] = null;

    return await this.saveData(data);
  },

  async resetSystem() {
    return await this.saveData(this.getEmptyData());
  },

  // Court Block Management
  async getCourtBlocks() {
    try {
      const dataStore = getDataStore();
      const blocks = await dataStore.get('courtBlocks');
      return blocks || [];
    } catch (error) {
      console.error('Failed to load court blocks:', error);
      return [];
    }
  },

  async saveCourtBlocks(blocks) {
    try {
      const dataStore = getDataStore();
      const Events = getEvents();

      await dataStore.set('courtBlocks', blocks, { immediate: true });
      if (Events) {
        Events.emitDom(TENNIS_CONFIG.STORAGE.UPDATE_EVENT, {});
      } else {
        window.dispatchEvent(new Event(TENNIS_CONFIG.STORAGE.UPDATE_EVENT));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to save blocks' };
    }
  },

  async addCourtBlock(courtNumber, reason, startTime, endTime) {
    const blocks = await this.getCourtBlocks();

    const filtered = blocks.filter(block => {
      if (block.courtNumber !== courtNumber) return true;
      const blockEnd = new Date(block.endTime);
      const newStart = new Date(startTime);
      return blockEnd <= newStart || new Date(block.startTime) >= new Date(endTime);
    });

    filtered.push({
      id: Date.now(),
      courtNumber,
      reason,
      startTime,
      endTime,
      createdAt: new Date().toISOString()
    });

    return await this.saveCourtBlocks(filtered);
  },

  async removeCourtBlock(blockId) {
    const blocks = await this.getCourtBlocks();
    const filtered = blocks.filter(block => block.id !== blockId);
    return await this.saveCourtBlocks(filtered);
  },

  // For ACTIVE LOGIC - only current/future blocks
  getActiveBlocksForCourt(courtNumber, currentTime = new Date()) {
    const blocks = JSON.parse(localStorage.getItem('courtBlocks') || '[]');
    return blocks
      .filter(block =>
        block.courtNumber === courtNumber &&
        new Date(block.endTime) >= currentTime
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  },

  // For TIMELINE DISPLAY - all blocks for today
  async getAllBlocksForCourt(courtNumber, date = new Date()) {
    const blocks = await this.getCourtBlocks();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return blocks
      .filter(block => {
        if (block.courtNumber !== courtNumber) return false;
        const blockStart = new Date(block.startTime);
        return blockStart >= startOfDay && blockStart <= endOfDay;
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  },

  async getAvailableCourts() {
    console.log('TennisDataService.getAvailableCourts running!');
    const data = await this.loadData();
    const availableCourts = [];
    const courtBlockStatusFn = getCourtBlockStatus();

    for (let index = 0; index < data.courts.length; index++) {
      const court = data.courts[index];
      const courtNumber = index + 1;

      // Check if currently blocked using new system
      const blockStatus = courtBlockStatusFn(courtNumber);
      if (blockStatus && blockStatus.isCurrent) {
        continue;
      }

      let isOccupied = false;

      if (court?.current?.players?.length > 0) {
        isOccupied = true;
      } else if (court?.players?.length > 0) {
        isOccupied = true;
      }

      if (!isOccupied) {
        availableCourts.push(courtNumber);
      }
    }

    console.log('Available courts:', availableCourts);
    return availableCourts;
  },

  async checkDataSize() {
    console.log('=== DATA SIZE CHECK ===');
    const dataStore = getDataStore();

    const blocks = await dataStore.get('courtBlocks');
    if (blocks) {
      const now = new Date();
      const expiredBlocks = blocks.filter(b => new Date(b.endTime) < now);
      console.log(`Court Blocks: ${blocks.length} total (${expiredBlocks.length} expired)`);
    }

    const data = await this.loadData();
    let totalHistory = 0;
    let oldHistory = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    data.courts.forEach((court, i) => {
      if (court && court.history) {
        totalHistory += court.history.length;
        court.history.forEach(session => {
          if (new Date(session.startTime) < sevenDaysAgo) {
            oldHistory++;
          }
        });
      }
    });

    console.log(`Court History: ${totalHistory} total sessions (${oldHistory} older than 7 days)`);
    console.log('===================');
  },

  async cleanupExpiredBlocks() {
    const dataStore = getDataStore();
    const blocks = await dataStore.get('courtBlocks');
    if (!blocks) return;
    const now = new Date();

    const activeBlocks = blocks.filter(block => {
      const blockEnd = new Date(block.endTime);
      return blockEnd > now;
    });

    const removedCount = blocks.length - activeBlocks.length;

    if (removedCount > 0) {
      await dataStore.set('courtBlocks', activeBlocks, { immediate: true });
      console.log(`✅ Cleaned up ${removedCount} expired blocks. ${activeBlocks.length} active blocks remain.`);
    } else {
      console.log('✅ No expired blocks to clean up.');
    }

    return removedCount;
  },

  async calculateWaitTimes(data) {
    if (!data.waitingGroups || data.waitingGroups.length === 0) return [];

    const waitTimes = [];

    for (let index = 0; index < data.waitingGroups.length; index++) {
      const group = data.waitingGroups[index];
      const position = index + 1;
      const waitTime = await this.calculateEstimatedWaitTimeForGroup(position, data.courts, new Date());
      waitTimes.push(waitTime);
    }

    return waitTimes;
  },

  async calculateEstimatedWaitTimeForGroup(position, courts, currentTime) {
    if (!courts || !Array.isArray(courts) || position < 1) return 0;

    log.debug(`Calculating wait time for position ${position} at ${currentTime.toLocaleTimeString()}`);

    const availabilitySlots = [];

    for (let index = 0; index < courts.length; index++) {
      const court = courts[index];
      const courtNumber = index + 1;
      const nextAvailableTime = await this.getCourtNextTrueAvailability(court, courtNumber, currentTime);

      log.debug(`Court ${courtNumber} next available at:`, {
        timestamp: nextAvailableTime,
        localTime: new Date(nextAvailableTime).toLocaleTimeString(),
        minutesFromNow: Math.ceil((nextAvailableTime - currentTime.getTime()) / 60000)
      });

      if (nextAvailableTime > currentTime.getTime()) {
        availabilitySlots.push(nextAvailableTime);
      } else {
        availabilitySlots.push(currentTime.getTime());
      }
    }

    availabilitySlots.sort((a, b) => a - b);

    if (availabilitySlots.length === 0 && position === 1) return 0;

    if (position <= availabilitySlots.length) {
      const waitMinutes = Math.ceil((availabilitySlots[position - 1] - currentTime.getTime()) / 60000);
      return waitMinutes;
    }

    const rounds = Math.ceil(position / courts.length);
    if (availabilitySlots.length > 0) {
      let waitTime = Math.ceil((availabilitySlots[0] - currentTime.getTime()) / 60000);
      waitTime += (rounds - 1) * 75;
      return waitTime;
    }

    const fallbackWait = Math.ceil(((position - 1) / courts.length) * 75);
    return fallbackWait;
  },

  async getCourtNextTrueAvailability(court, courtNumber, currentTime) {
    try {
      const allBlocks = await this.getActiveBlocksForCourt(courtNumber, new Date(0));
      const filteredBlocks = allBlocks
        .filter(block => new Date(block.endTime) > currentTime)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      let checkTime = currentTime.getTime();

      if (court?.current?.endTime) {
        const sessionEndTime = new Date(court.current.endTime).getTime();
        checkTime = Math.max(checkTime, sessionEndTime);
      } else if (court?.endTime) {
        const sessionEndTime = new Date(court.endTime).getTime();
        checkTime = Math.max(checkTime, sessionEndTime);
      }

      for (const block of filteredBlocks) {
        const blockStart = new Date(block.startTime).getTime();
        const blockEnd = new Date(block.endTime).getTime();

        const windowStart = currentTime.getTime();

        if (blockStart < checkTime && blockEnd > windowStart) {
          checkTime = Math.max(checkTime, blockEnd);
        } else if (blockStart >= checkTime) {
          break;
        }
      }

      return checkTime;

    } catch (error) {
      console.error('Error calculating court availability:', error);
      if (court?.current?.endTime) {
        return new Date(court.current.endTime).getTime();
      } else if (court?.endTime) {
        return new Date(court.endTime).getTime();
      }
      return currentTime.getTime();
    }
  },

  async calculateNextAvailable(data) {
    const availableCourts = [];

    if (!data.courts || !Array.isArray(data.courts)) {
      return availableCourts;
    }

    const currentTime = new Date();

    for (let index = 0; index < data.courts.length; index++) {
      const court = data.courts[index];
      const courtNumber = index + 1;
      const nextAvailableTime = await this.getCourtNextTrueAvailability(court, courtNumber, currentTime);

      availableCourts.push({
        courtNumber: courtNumber,
        availableAt: new Date(nextAvailableTime).toISOString()
      });
    }

    return availableCourts.sort((a, b) => new Date(a.availableAt) - new Date(b.availableAt));
  },

  // Primary addToWaitlist method (consolidated from duplicate)
  async addToWaitlist(players, guests = 0) {
    try {
      if (!Array.isArray(players) || players.length === 0) {
        return { success: false, error: 'No players provided' };
      }

      const data = await this.loadData();

      const normalized = players.map((p, idx) => ({
        id: typeof p.id === 'number' ? p.id : Date.now() + idx,
        name: (p.name || '').trim()
      })).filter(p => p.name);

      if (normalized.length === 0) {
        return { success: false, error: 'Invalid player names' };
      }

      // Prevent duplicate join if already waiting
      const alreadyWaiting = (wg) => {
        const waitingIds = (wg.players || []).map(x => x.id).filter(x => typeof x === 'number');
        const waitingNames = (wg.players || []).map(x => (x.name || '').toLowerCase());
        return normalized.some(x =>
          (typeof x.id === 'number' && waitingIds.includes(x.id)) ||
          waitingNames.includes((x.name || '').toLowerCase())
        );
      };
      if ((data.waitingGroups || []).some(alreadyWaiting)) {
        return { success: true, info: 'Already on waitlist' };
      }

      if (!Array.isArray(data.waitingGroups)) data.waitingGroups = [];

      data.waitingGroups.push({
        players: normalized,
        guests: Number.isFinite(guests) ? guests : 0,
        requestedAt: new Date().toISOString()
      });

      const res = await this.saveData(data);
      if (!res?.success) return res;

      return { success: true, count: data.waitingGroups.length };
    } catch (err) {
      console.error('[addToWaitlist] error', err);
      return { success: false, error: 'Failed to join waitlist' };
    }
  },
};

// Export singleton for backward compatibility
export const tennisDataService = TennisDataService;

// Default export
export default TennisDataService;
