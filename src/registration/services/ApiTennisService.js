/**
 * ApiTennisService - Backend-connected data service for Registration app
 *
 * This service provides the same interface as the localStorage-based service
 * but uses the backend API for all operations.
 */

import { ApiAdapter } from '@lib/ApiAdapter.js';
import { getRealtimeClient } from '@lib/RealtimeClient.js';
import { logger } from '../../lib/logger.js';
import { createCourtsService } from './modules/courtsService.js';
import { createWaitlistService } from './modules/waitlistService.js';
import { createMembersService } from './modules/membersService.js';
import { createSettingsService } from './modules/settingsService.js';
import { createPurchasesService } from './modules/purchasesService.js';
import { transformCourts } from './legacy/courtTransforms.js';
import { transformWaitlist } from './legacy/waitlistTransforms.js';

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

    // Wire courts service module (WP5-D1, WP5-D9)
    this.courtsService = createCourtsService({
      api: this.api,
      notifyListeners: this._notifyListeners.bind(this),
      transformCourts: (courts) => transformCourts(courts, { logger }),
      getCourtData: () => this.courtData,
      setCourtData: (v) => {
        this.courtData = v;
      },
      logger,
    });

    // Wire waitlist service module (WP5-D2, WP5-D4, WP5-D9)
    this.waitlistService = createWaitlistService({
      api: this.api,
      notifyListeners: this._notifyListeners.bind(this),
      transformWaitlist,
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

    // Wire purchases service module (WP5-D7a)
    this.purchasesService = createPurchasesService({
      api: this.api,
      logger,
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
        courts: transformCourts(courtStatus.courts, { logger }),
        waitlist: transformWaitlist(waitlist.waitlist),
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
    return this.purchasesService.purchaseBalls(sessionId, accountId, options);
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
