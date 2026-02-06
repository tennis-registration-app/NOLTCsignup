/**
 * ApiTennisService - Backend-connected data service for Registration app
 *
 * This service provides the same interface as the localStorage-based service
 * but uses the backend API for all operations.
 */

import { ApiAdapter } from '@lib/ApiAdapter.js';
import { getRealtimeClient } from '@lib/RealtimeClient.js';
import { normalizeServiceError } from '@lib/errors';
import { logger } from '../../lib/logger.js';
import { createCourtsService } from './modules/courtsService.js';
import { createWaitlistService } from './modules/waitlistService.js';
import { createMembersService } from './modules/membersService.js';
import { createSettingsService } from './modules/settingsService.js';
import { createPurchasesService } from './modules/purchasesService.js';
import { createLifecycleService } from './modules/lifecycleService.js';
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

    // Wire lifecycle service module (WP5-D-closeout)
    this.lifecycleService = createLifecycleService({
      api: this.api,
      setCourtData: (v) => {
        this.courtData = v;
      },
      setWaitlistData: (v) => {
        this.waitlistData = v;
      },
      setSettingsCache: (v) => {
        this.settings = v;
      },
      setMembersCache: (v) => {
        this.membersCache = v;
      },
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
      return await this.lifecycleService.loadInitialData();
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'loadInitialData' });
    }
  }

  async refreshCourtData() {
    try {
      return await this.courtsService.refreshCourtData();
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'refreshCourtData' });
    }
  }

  async refreshWaitlist() {
    try {
      return await this.waitlistService.refreshWaitlist();
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'refreshWaitlist' });
    }
  }

  // ===========================================
  // Court Operations
  // ===========================================

  async getAvailableCourts() {
    try {
      return await this.courtsService.getAvailableCourts();
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'getAvailableCourts' });
    }
  }

  async getAllCourts() {
    try {
      return await this.courtsService.getAllCourts();
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'getAllCourts' });
    }
  }

  async getCourtByNumber(courtNumber) {
    try {
      return await this.courtsService.getCourtByNumber(courtNumber);
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'getCourtByNumber' });
    }
  }

  async assignCourt(courtNumber, playersOrGroup, optionsOrDuration = {}) {
    try {
      return await this.courtsService.assignCourt(courtNumber, playersOrGroup, optionsOrDuration);
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'assignCourt' });
    }
  }

  async clearCourt(courtNumber, options = {}) {
    try {
      return await this.courtsService.clearCourt(courtNumber, options);
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'clearCourt' });
    }
  }

  // ===========================================
  // Ball Purchase Operations
  // ===========================================

  async purchaseBalls(sessionId, accountId, options = {}) {
    try {
      return await this.purchasesService.purchaseBalls(sessionId, accountId, options);
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'purchaseBalls' });
    }
  }

  // ===========================================
  // Waitlist Operations
  // ===========================================

  async getWaitlist() {
    try {
      return await this.waitlistService.getWaitlist();
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'getWaitlist' });
    }
  }

  async addToWaitlist(players, options = {}) {
    try {
      return await this.waitlistService.addToWaitlist(players, options);
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'addToWaitlist' });
    }
  }

  async removeFromWaitlist(waitlistId) {
    try {
      return await this.waitlistService.removeFromWaitlist(waitlistId);
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'removeFromWaitlist' });
    }
  }

  async assignFromWaitlist(waitlistId, courtNumber, options = {}) {
    try {
      return await this.waitlistService.assignFromWaitlist(waitlistId, courtNumber, options);
    } catch (e) {
      throw normalizeServiceError(e, { service: 'ApiTennisService', op: 'assignFromWaitlist' });
    }
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
