/**
 * ApiAdapter - Connects frontend to NOLTC Backend Edge Functions
 *
 * This adapter replaces LocalStorageAdapter for production use.
 * All data operations go through the Supabase Edge Functions.
 *
 * Dual Error Contract
 * -------------------
 * Private methods (_get, _post): Throw AppError on failure. Used by legacy
 * domain methods (assignCourt, getCourtStatus, etc.) that expect exceptions.
 *
 * Public methods (get, post): Return raw response including { ok: false } on
 * failure. Used by TennisBackend facade (TennisCommands, TennisQueries,
 * TennisDirectory). Callers MUST check response.ok before consuming data.
 */

import { API_CONFIG, ENDPOINTS, getDeviceContext } from './apiConfig';
import { AppError, ErrorCategories, mapResponseToCategory } from './errors/index';
import { logger } from './logger';

export class ApiAdapter {
  baseUrl: string;
  anonKey: string;
  deviceId: string;
  deviceType: string;
  cacheTTL: number;
  _cache: {
    courtStatus: unknown;
    courtStatusTime: number;
    settings: unknown;
    settingsTime: number;
    members: unknown;
    membersTime: number;
    [key: string]: unknown;
  };

  constructor(options: {
    baseUrl?: string;
    anonKey?: string;
    deviceId?: string;
    deviceType?: string;
    cacheTTL?: number;
  } = {}) {
    this.baseUrl = options.baseUrl || API_CONFIG.BASE_URL;
    this.anonKey = options.anonKey || API_CONFIG.ANON_KEY;
    this.deviceId = options.deviceId || API_CONFIG.DEVICE_ID;
    this.deviceType = options.deviceType || API_CONFIG.DEVICE_TYPE;

    // Cache for reducing API calls
    this._cache = {
      courtStatus: null,
      courtStatusTime: 0,
      settings: null,
      settingsTime: 0,
      members: null,
      membersTime: 0,
    };

    // Cache TTL in milliseconds
    this.cacheTTL = options.cacheTTL || 5000; // 5 seconds default
  }

  // ===========================================
  // HTTP Helper
  // ===========================================

  async _fetch(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      Authorization: `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new AppError({
          category: ErrorCategories.NETWORK,
          code: 'API_ERROR',
          message: data.error || 'API request failed',
          details: data,
        });
      }

      return data;
    } catch (error) {
      logger.error('ApiAdapter', `API Error [${endpoint}]`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError({
        category: ErrorCategories.NETWORK,
        code: 'FETCH_FAILED',
        message: error.message || 'Network request failed',
        details: { originalError: error },
      });
    }
  }

  async _get(endpoint: string, params: Record<string, string | number> = {}) {
    const strParams: Record<string, string> = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const queryString = new URLSearchParams(strParams).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this._fetch(url, { method: 'GET' });
  }

  async _post(endpoint: string, body: Record<string, unknown> = {}) {
    // Automatically add device info to all POST requests
    const bodyWithDevice = {
      ...body,
      device_id: this.deviceId,
      device_type: this.deviceType,
    };

    return this._fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(bodyWithDevice),
    });
  }

  // ===========================================
  // Public HTTP Methods (for TennisBackend)
  // ===========================================

  /**
   * Generic GET request (returns raw response, doesn't throw on ok:false)
   * @param {string} endpoint - API endpoint path (e.g., '/get-board')
   * @returns {Promise<Object>} Response data with { ok, ... }
   */
  async get(endpoint) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      logger.debug('ApiAdapter', 'GET', endpoint);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      logger.debug('ApiAdapter', 'GET response ok', data.ok);
      if (!data.ok) {
        return {
          ...data,
          error: {
            category: mapResponseToCategory(data.code),
            code: data.code || 'API_ERROR',
            message: data.message || data.error || 'Request failed',
          },
        };
      }
      return data;
    } catch (err) {
      return {
        ok: false,
        message: err.message || 'Network request failed',
        error: {
          category: ErrorCategories.NETWORK,
          code: 'FETCH_FAILED',
          message: err.message || 'Network request failed',
        },
      };
    }
  }

  /**
   * Generic POST request with device info auto-added (returns raw response)
   * @param {string} endpoint - API endpoint path (e.g., '/assign-court')
   * @param {Object} body - Request body
   * @returns {Promise<Object>} Response data with { ok, ... }
   */
  async post(endpoint, body = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      // Evaluate device context at request time (not module load time)
      const { deviceId, deviceType } = getDeviceContext();
      const bodyWithDevice = {
        ...body,
        device_id: deviceId,
        device_type: deviceType,
      };
      logger.debug('ApiAdapter', `POST ${endpoint}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyWithDevice),
      });
      const data = await response.json();
      if (!data.ok) {
        logger.error('ApiAdapter', `POST ${endpoint} failed`, data);
        return {
          ...data,
          error: {
            category: mapResponseToCategory(data.code),
            code: data.code || 'API_ERROR',
            message: data.message || data.error || 'Request failed',
          },
        };
      }
      return data;
    } catch (err) {
      return {
        ok: false,
        message: err.message || 'Network request failed',
        error: {
          category: ErrorCategories.NETWORK,
          code: 'FETCH_FAILED',
          message: err.message || 'Network request failed',
        },
      };
    }
  }

  // ===========================================
  // Cache Helpers
  // ===========================================

  _isCacheValid(cacheKey: string) {
    const time = this._cache[cacheKey + 'Time'] as number | null;
    return time && Date.now() - time < this.cacheTTL;
  }

  _setCache(cacheKey: string, data: unknown) {
    this._cache[cacheKey] = data;
    this._cache[cacheKey + 'Time'] = Date.now();
  }

  clearCache() {
    this._cache = {
      courtStatus: null,
      courtStatusTime: 0,
      settings: null,
      settingsTime: 0,
      members: null,
      membersTime: 0,
    };
  }

  // ===========================================
  // Read Operations
  // ===========================================

  async getCourtStatus(forceRefresh = false) {
    if (!forceRefresh && this._isCacheValid('courtStatus')) {
      return this._cache.courtStatus;
    }

    const result = await this._get(ENDPOINTS.GET_COURT_STATUS);
    this._setCache('courtStatus', result);
    return result;
  }

  async getWaitlist() {
    return this._get(ENDPOINTS.GET_WAITLIST);
  }

  async getMembers(search = '') {
    const params: Record<string, string> = search ? { search } : {};
    return this._get(ENDPOINTS.GET_MEMBERS, params);
  }

  async getMembersByAccount(memberNumber) {
    return this._get(ENDPOINTS.GET_MEMBERS, { member_number: memberNumber });
  }

  async getSettings(forceRefresh = false) {
    if (!forceRefresh && this._isCacheValid('settings')) {
      return this._cache.settings;
    }

    const result = await this._get(ENDPOINTS.GET_SETTINGS);
    this._setCache('settings', result);
    return result;
  }

  async getSessionHistory(options: { dateStart?: string; dateEnd?: string; courtNumber?: number; memberName?: string; limit?: number } = {}) {
    const params: Record<string, string | number> = {};
    if (options.dateStart) params.date_start = options.dateStart;
    if (options.dateEnd) params.date_end = options.dateEnd;
    if (options.courtNumber) params.court_number = options.courtNumber;
    if (options.memberName) params.member_name = options.memberName;
    if (options.limit) params.limit = options.limit;

    return this._get(ENDPOINTS.GET_SESSION_HISTORY, params);
  }

  async getTransactions(options: { dateStart?: string; dateEnd?: string; type?: string; memberNumber?: string; limit?: number } = {}) {
    const params: Record<string, string | number> = {};
    if (options.dateStart) params.date_start = options.dateStart;
    if (options.dateEnd) params.date_end = options.dateEnd;
    if (options.type) params.type = options.type;
    if (options.memberNumber) params.member_number = options.memberNumber;
    if (options.limit) params.limit = options.limit;

    return this._get(ENDPOINTS.GET_TRANSACTIONS, params);
  }

  // ===========================================
  // Court Operations
  // ===========================================

  async assignCourt(courtId: string, sessionType: string, participants: unknown, options: { addBalls?: boolean; splitBalls?: boolean; latitude?: number; longitude?: number } = {}) {
    const body: Record<string, unknown> = {
      court_id: courtId,
      session_type: sessionType,
      participants: participants,
      add_balls: options.addBalls || false,
      split_balls: options.splitBalls || false,
    };

    // Add location for mobile devices
    if (this.deviceType === 'mobile' && options.latitude && options.longitude) {
      body.latitude = options.latitude;
      body.longitude = options.longitude;
    }

    const result = await this._post(ENDPOINTS.ASSIGN_COURT, body);
    this.clearCache(); // Invalidate cache after mutation
    return result;
  }

  async endSession(sessionId, endReason = 'completed') {
    const result = await this._post(ENDPOINTS.END_SESSION, {
      session_id: sessionId,
      end_reason: endReason,
    });
    this.clearCache();
    return result;
  }

  async endSessionByCourt(courtId, endReason = 'completed') {
    const result = await this._post(ENDPOINTS.END_SESSION, {
      court_id: courtId,
      end_reason: endReason,
    });
    this.clearCache();
    return result;
  }

  async purchaseBalls(sessionId: string, accountId: string, options: { splitBalls?: boolean; splitAccountIds?: string[] | null } = {}) {
    return this._post(ENDPOINTS.PURCHASE_BALLS, {
      session_id: sessionId,
      account_id: accountId,
      split_balls: options.splitBalls || false,
      split_account_ids: options.splitAccountIds || null,
    });
  }

  // ===========================================
  // Waitlist Operations
  // ===========================================

  async joinWaitlist(groupType: string, participants: unknown, options: { latitude?: number; longitude?: number } = {}) {
    const body: Record<string, unknown> = {
      group_type: groupType,
      participants: participants,
    };

    // Add location for mobile devices
    if (this.deviceType === 'mobile' && options.latitude && options.longitude) {
      body.latitude = options.latitude;
      body.longitude = options.longitude;
    }

    return this._post(ENDPOINTS.JOIN_WAITLIST, body);
  }

  async cancelWaitlist(waitlistId) {
    return this._post(ENDPOINTS.CANCEL_WAITLIST, {
      waitlist_id: waitlistId,
    });
  }

  async assignFromWaitlist(waitlistId: string, courtId: string, options: { addBalls?: boolean; splitBalls?: boolean } = {}) {
    const result = await this._post(ENDPOINTS.ASSIGN_FROM_WAITLIST, {
      waitlist_id: waitlistId,
      court_id: courtId,
      add_balls: options.addBalls || false,
      split_balls: options.splitBalls || false,
    });
    this.clearCache();
    return result;
  }

  // ===========================================
  // Block Operations
  // ===========================================

  async createBlock(courtId: string, blockType: string, title: string, startsAt: string, endsAt: string, options: { isRecurring?: boolean; recurrenceRule?: string | null } = {}) {
    const result = await this._post(ENDPOINTS.CREATE_BLOCK, {
      court_id: courtId,
      block_type: blockType,
      title: title,
      starts_at: startsAt,
      ends_at: endsAt,
      is_recurring: options.isRecurring || false,
      recurrence_rule: options.recurrenceRule || null,
    });
    this.clearCache();
    return result;
  }

  async cancelBlock(blockId) {
    const result = await this._post(ENDPOINTS.CANCEL_BLOCK, {
      block_id: blockId,
    });
    this.clearCache();
    return result;
  }

  // ===========================================
  // Admin Operations
  // ===========================================

  async updateSettings(settings) {
    const result = await this._post(ENDPOINTS.UPDATE_SETTINGS, {
      settings: settings,
    });
    this._cache.settings = null; // Invalidate settings cache
    this._cache.settingsTime = 0;
    return result;
  }

  async updateOperatingHours(hours) {
    const result = await this._post(ENDPOINTS.UPDATE_SETTINGS, {
      operating_hours: hours,
    });
    this._cache.settings = null;
    this._cache.settingsTime = 0;
    return result;
  }

  async setOperatingHoursOverride(override) {
    const result = await this._post(ENDPOINTS.UPDATE_SETTINGS, {
      operating_hours_override: override,
    });
    this._cache.settings = null;
    this._cache.settingsTime = 0;
    return result;
  }

  async deleteOperatingHoursOverride(date) {
    const result = await this._post(ENDPOINTS.UPDATE_SETTINGS, {
      delete_override: date,
    });
    this._cache.settings = null;
    this._cache.settingsTime = 0;
    return result;
  }

  async exportTransactions(dateStart: string, dateEnd: string, options: { includeAlreadyExported?: boolean } = {}) {
    return this._post(ENDPOINTS.EXPORT_TRANSACTIONS, {
      date_range_start: dateStart,
      date_range_end: dateEnd,
      include_already_exported: options.includeAlreadyExported || false,
    });
  }

  async aiAssistant({ prompt, mode = 'draft', actions_token = null, confirm_destructive = false }: { prompt: string; mode?: string; actions_token?: string | null; confirm_destructive?: boolean }) {
    const body: Record<string, unknown> = {
      prompt,
      mode,
      device_id: this.deviceId,
      device_type: this.deviceType,
    };

    if (actions_token) {
      body.actions_token = actions_token;
    }

    if (confirm_destructive) {
      body.confirm_destructive = confirm_destructive;
    }

    return this._post(ENDPOINTS.AI_ASSISTANT, body);
  }

  // ===========================================
  // Legacy Compatibility Layer
  // ===========================================
  // These methods provide compatibility with existing code
  // that expects the LocalStorageAdapter interface

  async read(key) {
    // Map legacy keys to API calls
    if (key === 'tennisData' || key === 'TENNIS_DATA') {
      return this._getLegacyDataFormat();
    }
    logger.warn('ApiAdapter', `read() called with unknown key: ${key}`);
    return null;
  }

  async write(key, data) {
    // For now, log a warning - writes should use specific methods
    logger.warn('ApiAdapter', `write() called - use specific methods instead. Key: ${key}`);
    return data;
  }

  async getData() {
    return this._getLegacyDataFormat();
  }

  async saveData(data) {
    logger.warn('ApiAdapter', 'saveData() called - use specific methods instead');
    return data;
  }

  // Convert API response to legacy data format for compatibility
  async _getLegacyDataFormat() {
    const [courtStatus, waitlist, settings] = await Promise.all([
      this.getCourtStatus(),
      this.getWaitlist(),
      this.getSettings(),
    ]);

    // Transform to match legacy tennisData structure
    const courts =
      courtStatus.courts?.map((court) => ({
        number: court.court_number,
        id: court.court_id,
        status: court.status,
        session: court.session
          ? {
              id: court.session.id,
              type: court.session.type,
              players: court.session.participants,
              startTime: court.session.started_at,
              endTime: court.session.scheduled_end_at,
              timeRemaining: court.session.minutes_remaining * 60 * 1000,
            }
          : null,
        block: court.block,
      })) || [];

    const waitlistEntries =
      waitlist.waitlist?.map((entry) => ({
        id: entry.id,
        position: entry.position,
        type: entry.group_type,
        players: entry.participants,
        joinedAt: entry.joined_at,
        waitTime: entry.minutes_waiting * 60 * 1000,
      })) || [];

    return {
      courts,
      waitlist: waitlistEntries,
      settings: settings.settings,
      operatingHours: settings.operating_hours,
      lastUpdated: courtStatus.timestamp,
    };
  }
}

// Default export for easy importing
export default ApiAdapter;
