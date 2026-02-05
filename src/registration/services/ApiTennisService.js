/**
 * ApiTennisService - Backend-connected data service for Registration app
 *
 * This service provides the same interface as the localStorage-based service
 * but uses the backend API for all operations.
 */

import { ApiAdapter } from '@lib/ApiAdapter.js';
import { getRealtimeClient } from '@lib/RealtimeClient.js';
import { formatCourtTime } from '@lib/dateUtils.js';
import { logger } from '../../lib/logger.js';
import { createCourtsService } from './modules/courtsService.js';
import { createWaitlistService } from './modules/waitlistService.js';
import { createMembersService } from './modules/membersService.js';
import { createSettingsService } from './modules/settingsService.js';

/**
 * ApiTennisService
 *
 * WP7.1: This service is being refactored to extract legacy transformation
 * logic into src/registration/services/legacy/ modules.
 *
 * Public method surface and return shapes will remain unchanged.
 * Canonical shape documentation will be added after extraction (WP7.1.5).
 */

class ApiTennisService {
  constructor(options = {}) {
    this.api = new ApiAdapter({
      deviceId: options.deviceId || 'a0000000-0000-0000-0000-000000000001',
      deviceType: options.deviceType || 'kiosk',
    });

    this.listeners = new Set();
    this.courtData = null;
    this.waitlistData = null;
    this.membersCache = null;
    this.settings = null;

    // Get realtime client
    this.realtimeClient = getRealtimeClient({ debug: options.debug || false });

    // Wire courts service module (WP5-D1)
    this.courtsService = createCourtsService({
      api: this.api,
      notifyListeners: this._notifyListeners.bind(this),
      transformCourts: this._transformCourts.bind(this),
      getCourtData: () => this.courtData,
      setCourtData: (v) => {
        this.courtData = v;
      },
      logger,
    });

    // Wire waitlist service module (WP5-D2, WP5-D4)
    this.waitlistService = createWaitlistService({
      api: this.api,
      notifyListeners: this._notifyListeners.bind(this),
      transformWaitlist: this._transformWaitlist.bind(this),
      getWaitlistData: () => this.waitlistData,
      setWaitlistData: (v) => {
        this.waitlistData = v;
      },
      logger,
      courtsService: this.courtsService,
    });

    // Wire members service module (WP5-D3)
    this.membersService = createMembersService({
      api: this.api,
      getMembersCache: () => this.membersCache,
      setMembersCache: (v) => {
        this.membersCache = v;
      },
    });

    // Wire settings service module (WP5-D3)
    this.settingsService = createSettingsService({
      api: this.api,
      getSettingsCache: () => this.settings,
      setSettingsCache: (v) => {
        this.settings = v;
      },
    });

    // Start realtime subscriptions
    this._setupRealtime();
  }

  // ===========================================
  // Realtime Setup
  // ===========================================

  _setupRealtime() {
    this.realtimeClient.onSessionChange(() => {
      this._notifyListeners('sessions');
      this.refreshCourtData();
    });

    this.realtimeClient.onWaitlistChange(() => {
      this._notifyListeners('waitlist');
      this.refreshWaitlist();
    });

    this.realtimeClient.onBlockChange(() => {
      this._notifyListeners('blocks');
      this.refreshCourtData();
    });
  }

  // ===========================================
  // Event Listeners
  // ===========================================

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(changeType) {
    this.listeners.forEach((cb) => {
      try {
        cb({ type: changeType, timestamp: Date.now() });
      } catch (e) {
        logger.error('ApiService', 'Listener error', e);
      }
    });
  }

  // ===========================================
  // Data Loading
  // ===========================================

  async loadInitialData() {
    try {
      const [courtStatus, waitlist, settings, members] = await Promise.all([
        this.api.getCourtStatus(),
        this.api.getWaitlist(),
        this.api.getSettings(),
        this.api.getMembers(),
      ]);

      this.courtData = courtStatus;
      this.waitlistData = waitlist;
      this.settings = settings;
      this.membersCache = members;

      return {
        courts: this._transformCourts(courtStatus.courts),
        waitlist: this._transformWaitlist(waitlist.waitlist),
        settings: settings.settings,
        operatingHours: settings.operating_hours,
        members: members.members,
      };
    } catch (error) {
      logger.error('ApiService', 'Failed to load initial data', error);
      throw error;
    }
  }

  async refreshCourtData() {
    return this.courtsService.refreshCourtData();
  }

  async refreshWaitlist() {
    return this.waitlistService.refreshWaitlist();
  }

  // ===========================================
  // Data Transformers (API -> Legacy Format)
  // ===========================================

  _transformCourts(apiCourts) {
    if (!apiCourts) return [];

    return apiCourts.map((court) => {
      // Transform session data
      // Note: API returns participants as array of strings (names) or objects
      const session = court.session
        ? {
            id: court.session.id,
            type: court.session.type,
            players: (court.session.participants || []).map((p) => {
              // Handle both string (just name) and object formats
              if (typeof p === 'string') {
                return { id: null, name: p, isGuest: false };
              }
              return {
                id: p.member_id || p.id,
                name: p.display_name || p.guest_name || p.name,
                isGuest: p.type === 'guest',
              };
            }),
            startTime: new Date(court.session.started_at).getTime(),
            endTime: new Date(court.session.scheduled_end_at).getTime(),
            timeRemaining: (court.session.minutes_remaining || 0) * 60 * 1000,
            duration: court.session.duration_minutes,
            // Formatted times in Central Time for display
            startTimeFormatted: formatCourtTime(court.session.started_at),
            endTimeFormatted: formatCourtTime(court.session.scheduled_end_at),
          }
        : null;

      // Transform block data
      const block = court.block
        ? {
            id: court.block.id,
            type: court.block.type,
            title: court.block.title,
            reason: court.block.title,
            startTime: new Date(court.block.starts_at).getTime(),
            endTime: new Date(court.block.ends_at).getTime(),
            // Formatted times in Central Time for display
            startTimeFormatted: formatCourtTime(court.block.starts_at),
            endTimeFormatted: formatCourtTime(court.block.ends_at),
          }
        : null;

      // Determine court availability status
      // - isUnoccupied: No session AND no block - always selectable first
      // - isOvertime: Has session but time expired (timeRemaining <= 0) - selectable when no unoccupied
      // - isActive: Has session with time remaining - never selectable
      // - isBlocked: Has active block - never selectable
      const hasSession = !!court.session;
      const hasBlock = !!court.block;
      const timeRemaining = session?.timeRemaining || 0;

      const isUnoccupied = !hasSession && !hasBlock;
      const isOvertime = hasSession && timeRemaining <= 0;
      const isActive = hasSession && timeRemaining > 0;
      const isBlocked = hasBlock;

      logger.debug('ApiService', `Court ${court.court_number} transform`, {
        hasSession,
        hasBlock,
        apiMinutesRemaining: court.session?.minutes_remaining,
        transformedTimeRemaining: timeRemaining,
        isUnoccupied,
        isOvertime,
        isActive,
        isBlocked,
      });

      // Build legacy-compatible court object
      // Legacy UI expects: court.current.endTime, court.current.players, court.endTime
      return {
        number: court.court_number,
        id: court.court_id,
        name: court.court_name,
        status: court.status,
        // New availability flags
        isUnoccupied, // No session, no block - always selectable first
        isOvertime, // Has session but time expired - conditionally selectable
        isActive, // Has session with time remaining - never selectable
        isBlocked, // Has active block - never selectable
        // Legacy compatibility
        isAvailable: isUnoccupied, // Legacy: true if unoccupied (for backward compat)
        isOccupied: hasSession,
        // New API format
        session,
        block,
        // Legacy format compatibility
        current: session
          ? {
              players: session.players,
              startTime: session.startTime,
              endTime: session.endTime,
              duration: session.duration,
            }
          : null,
        // Also add top-level for some legacy code paths
        players: session?.players || [],
        startTime: session?.startTime || block?.startTime,
        endTime: session?.endTime || block?.endTime,
        blocked: block
          ? {
              startTime: block.startTime,
              endTime: block.endTime,
              reason: block.reason,
            }
          : null,
      };
    });
  }

  _transformWaitlist(apiWaitlist) {
    if (!apiWaitlist) return [];

    return apiWaitlist.map((entry) => ({
      id: entry.id,
      position: entry.position,
      type: entry.group_type,
      players: entry.participants || [],
      joinedAt: new Date(entry.joined_at).getTime(),
      waitTime: (entry.minutes_waiting || 0) * 60 * 1000,
    }));
  }

  // ===========================================
  // Court Operations
  // ===========================================

  async getAvailableCourts() {
    return this.courtsService.getAvailableCourts();
  }

  async getAllCourts() {
    return this.courtsService.getAllCourts();
  }

  async getCourtByNumber(courtNumber) {
    return this.courtsService.getCourtByNumber(courtNumber);
  }

  async assignCourt(courtNumber, playersOrGroup, optionsOrDuration = {}) {
    return this.courtsService.assignCourt(courtNumber, playersOrGroup, optionsOrDuration);
  }

  async clearCourt(courtNumber, options = {}) {
    return this.courtsService.clearCourt(courtNumber, options);
  }

  // ===========================================
  // Ball Purchase Operations
  // ===========================================

  async purchaseBalls(sessionId, accountId, options = {}) {
    logger.debug('ApiService', `Purchasing balls for session: ${sessionId}, account: ${accountId}`);

    const result = await this.api.purchaseBalls(sessionId, accountId, {
      splitBalls: options.split || options.splitBalls || false,
      splitAccountIds: options.splitAccountIds || options.split_account_ids || null,
    });

    return {
      success: result.ok,
      transactions: result.transactions,
      totalCents: result.total_cents,
    };
  }

  // ===========================================
  // Waitlist Operations
  // ===========================================

  async getWaitlist() {
    return this.waitlistService.getWaitlist();
  }

  async addToWaitlist(players, options = {}) {
    return this.waitlistService.addToWaitlist(players, options);
  }

  async removeFromWaitlist(waitlistId) {
    return this.waitlistService.removeFromWaitlist(waitlistId);
  }

  async assignFromWaitlist(waitlistId, courtNumber, options = {}) {
    return this.waitlistService.assignFromWaitlist(waitlistId, courtNumber, options);
  }

  // ===========================================
  // Member Operations
  // ===========================================

  searchMembers(query) {
    return this.membersService.searchMembers(query);
  }

  getMembersByAccount(memberNumber) {
    return this.membersService.getMembersByAccount(memberNumber);
  }

  getAllMembers() {
    return this.membersService.getAllMembers();
  }

  // ===========================================
  // Settings
  // ===========================================

  getSettings() {
    return this.settingsService.getSettings();
  }

  refreshSettings() {
    return this.settingsService.refreshSettings();
  }

  // ===========================================
  // Cleanup
  // ===========================================

  destroy() {
    this.listeners.clear();
    this.realtimeClient.disconnect();
  }
}

// Export singleton factory
let instance = null;

export function getApiTennisService(options = {}) {
  if (!instance) {
    instance = new ApiTennisService(options);
  }
  return instance;
}

export function resetApiTennisService() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

export { ApiTennisService };
export default ApiTennisService;
