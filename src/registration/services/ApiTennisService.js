/**
 * ApiTennisService - Backend-connected data service for Registration app
 *
 * This service provides the same interface as the localStorage-based service
 * but uses the backend API for all operations.
 */

import { ApiAdapter } from '@lib/ApiAdapter.js';
import { getRealtimeClient } from '@lib/RealtimeClient.js';
import { formatCourtTime } from '@lib/dateUtils.js';

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
    this.listeners.forEach(cb => {
      try {
        cb({ type: changeType, timestamp: Date.now() });
      } catch (e) {
        console.error('Listener error:', e);
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
        members: members.members,
      };
    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }

  async refreshCourtData() {
    try {
      this.courtData = await this.api.getCourtStatus(true);
      this._notifyListeners('courts');
      return this._transformCourts(this.courtData.courts);
    } catch (error) {
      console.error('Failed to refresh court data:', error);
      throw error;
    }
  }

  async refreshWaitlist() {
    try {
      this.waitlistData = await this.api.getWaitlist();
      this._notifyListeners('waitlist');
      return this._transformWaitlist(this.waitlistData.waitlist);
    } catch (error) {
      console.error('Failed to refresh waitlist:', error);
      throw error;
    }
  }

  // ===========================================
  // Data Transformers (API -> Legacy Format)
  // ===========================================

  _transformCourts(apiCourts) {
    if (!apiCourts) return [];

    return apiCourts.map(court => {
      // Transform session data
      // Note: API returns participants as array of strings (names) or objects
      const session = court.session ? {
        id: court.session.id,
        type: court.session.type,
        players: (court.session.participants || []).map(p => {
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
      } : null;

      // Transform block data
      const block = court.block ? {
        id: court.block.id,
        type: court.block.type,
        title: court.block.title,
        reason: court.block.title,
        startTime: new Date(court.block.starts_at).getTime(),
        endTime: new Date(court.block.ends_at).getTime(),
        // Formatted times in Central Time for display
        startTimeFormatted: formatCourtTime(court.block.starts_at),
        endTimeFormatted: formatCourtTime(court.block.ends_at),
      } : null;

      // Build legacy-compatible court object
      // Legacy UI expects: court.current.endTime, court.current.players, court.endTime
      return {
        number: court.court_number,
        id: court.court_id,
        name: court.court_name,
        status: court.status,
        isAvailable: court.status === 'available',
        isOccupied: !!court.session,
        isBlocked: !!court.block,
        // New API format
        session,
        block,
        // Legacy format compatibility
        current: session ? {
          players: session.players,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration,
        } : null,
        // Also add top-level for some legacy code paths
        players: session?.players || [],
        startTime: session?.startTime || block?.startTime,
        endTime: session?.endTime || block?.endTime,
        blocked: block ? {
          startTime: block.startTime,
          endTime: block.endTime,
          reason: block.reason,
        } : null,
      };
    });
  }

  _transformWaitlist(apiWaitlist) {
    if (!apiWaitlist) return [];

    return apiWaitlist.map(entry => ({
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
    if (!this.courtData) {
      await this.refreshCourtData();
    }
    return this._transformCourts(this.courtData.courts).filter(c => c.isAvailable);
  }

  async getAllCourts() {
    if (!this.courtData) {
      await this.refreshCourtData();
    }
    return this._transformCourts(this.courtData.courts);
  }

  async getCourtByNumber(courtNumber) {
    const courts = await this.getAllCourts();
    return courts.find(c => c.number === courtNumber);
  }

  async assignCourt(courtNumber, playersOrGroup, optionsOrDuration = {}) {
    // Handle legacy format: assignCourt(courtNumber, group, duration)
    // where group = { players: [...], guests: number }
    let players;
    let options = {};

    if (playersOrGroup && playersOrGroup.players && Array.isArray(playersOrGroup.players)) {
      // Legacy format: { players: [...], guests: number }
      players = playersOrGroup.players;

      // Duration passed as third argument
      if (typeof optionsOrDuration === 'number') {
        options = { duration: optionsOrDuration };
      } else {
        options = optionsOrDuration || {};
      }
    } else if (Array.isArray(playersOrGroup)) {
      // New format: array of players directly
      players = playersOrGroup;
      options = optionsOrDuration || {};
    } else {
      throw new Error('Invalid players format');
    }

    // Log player data for debugging
    console.log('🔍 Players to assign:', JSON.stringify(players, null, 2));

    // Find the court ID from court number
    const courts = await this.getAllCourts();
    const court = courts.find(c => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    // Transform players to API format
    const participants = await Promise.all(players.map(async (player) => {
      console.log('🔍 Processing player:', JSON.stringify(player));

      // Try to get account_id and member UUID from various sources
      let accountId = player.accountId || player.account_id || player.billingAccountId;
      let memberUuid = null;

      // Check if player already has a valid UUID (36 chars with dashes)
      const playerId = player.id || player.memberId || player.member_id;
      const isUuid = playerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);

      if (isUuid) {
        memberUuid = playerId;
        console.log('🔍 Player ID is already a UUID:', memberUuid);
      }

      // If we have a memberNumber, use it to look up the member
      const memberNumber = player.memberNumber || player.clubNumber || player.account_number;
      if (memberNumber && (!accountId || !memberUuid)) {
        try {
          console.log(`🔍 Looking up by member_number: ${memberNumber}`);
          const result = await this.api.getMembersByAccount(String(memberNumber));
          console.log('🔍 getMembersByAccount result:', JSON.stringify(result));

          if (result.members && result.members.length > 0) {
            // Find primary member or first member
            const member = result.members.find(m => m.is_primary) || result.members[0];
            if (!accountId) accountId = member.account_id;
            if (!memberUuid) memberUuid = member.id;
            console.log(`🔍 Found member: ${member.display_name}, UUID: ${member.id}, account: ${member.account_id}`);
          }
        } catch (e) {
          console.warn('Could not look up member by member_number:', e);
        }
      }

      // If still no account_id, try searching by name
      if (!accountId || !memberUuid) {
        const searchName = player.name || player.displayName;
        if (searchName) {
          try {
            console.log(`🔍 Searching by name: ${searchName}`);
            const result = await this.api.getMembers(searchName);
            console.log('🔍 getMembers result:', JSON.stringify(result));

            if (result.members && result.members.length > 0) {
              // Find exact match by name
              const normalizedSearch = searchName.toLowerCase().trim();
              const member = result.members.find(m =>
                m.display_name?.toLowerCase().trim() === normalizedSearch
              ) || result.members[0];

              if (member) {
                if (!accountId) accountId = member.account_id;
                if (!memberUuid) memberUuid = member.id;
                console.log(`🔍 Found by name: ${member.display_name}, UUID: ${member.id}, account: ${member.account_id}`);
              }
            }
          } catch (e) {
            console.warn('Could not look up member by name:', e);
          }
        }
      }

      if (player.isGuest || player.type === 'guest') {
        // For guests, we need an account to charge - use the first member's account
        // This will be set after we process all participants
        return {
          type: 'guest',
          guest_name: player.name || player.displayName || player.guest_name || 'Guest',
          account_id: accountId || '__NEEDS_ACCOUNT__',
          charged_to_account_id: accountId || '__NEEDS_ACCOUNT__',
        };
      } else {
        return {
          type: 'member',
          member_id: memberUuid || playerId, // Use looked-up UUID or fall back to original
          account_id: accountId,
        };
      }
    }));

    // Find a valid account_id from members for any guests that need it
    const memberWithAccount = participants.find(p => p.type === 'member' && p.account_id);
    if (memberWithAccount) {
      participants.forEach(p => {
        if (p.account_id === '__NEEDS_ACCOUNT__') {
          p.account_id = memberWithAccount.account_id;
        }
        if (p.charged_to_account_id === '__NEEDS_ACCOUNT__') {
          p.charged_to_account_id = memberWithAccount.account_id;
        }
      });
    }

    // Final validation
    const missingAccountId = participants.find(p => !p.account_id || p.account_id === '__NEEDS_ACCOUNT__');
    if (missingAccountId) {
      console.error('Participant missing account_id:', missingAccountId);
      throw new Error('Could not determine account_id for participant');
    }

    console.log('🔍 Transformed participants:', JSON.stringify(participants, null, 2));

    // Determine session type
    const sessionType = options.type || options.sessionType ||
      (participants.length <= 2 ? 'singles' : 'doubles');

    const result = await this.api.assignCourt(court.id, sessionType, participants, {
      addBalls: options.addBalls || options.balls || false,
      splitBalls: options.splitBalls || false,
    });

    // Refresh court data
    await this.refreshCourtData();

    return {
      success: true,
      session: result.session,
      court: courtNumber,
    };
  }

  async clearCourt(courtNumber, options = {}) {
    const courts = await this.getAllCourts();
    const court = courts.find(c => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    // Map legacy clearReason to valid API end_reason values
    // Valid API values: 'completed', 'cleared_early', 'admin_override'
    const legacyReason = options.clearReason || options.reason || '';
    let endReason = 'completed';

    if (legacyReason) {
      const reasonLower = String(legacyReason).toLowerCase();
      if (reasonLower.includes('early') || reasonLower.includes('left') || reasonLower.includes('done') || reasonLower === 'cleared') {
        endReason = 'cleared_early';
      } else if (reasonLower.includes('observed') || reasonLower.includes('empty')) {
        endReason = 'completed';
      } else if (reasonLower.includes('admin') || reasonLower.includes('override') || reasonLower.includes('force')) {
        endReason = 'admin_override';
      }
    }

    console.log(`🔍 Clearing court ${courtNumber} with reason: ${endReason} (legacy: ${legacyReason})`);

    const result = await this.api.endSessionByCourt(court.id, endReason);

    // Refresh court data
    await this.refreshCourtData();

    return {
      success: true,
      session: result.session,
    };
  }

  // ===========================================
  // Ball Purchase Operations
  // ===========================================

  async purchaseBalls(sessionId, accountId, options = {}) {
    console.log('🔍 Purchasing balls for session:', sessionId, 'account:', accountId);

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
    if (!this.waitlistData) {
      await this.refreshWaitlist();
    }
    return this._transformWaitlist(this.waitlistData.waitlist);
  }

  async addToWaitlist(players, options = {}) {
    // Transform players to API format
    const participants = players.map(player => {
      if (player.isGuest || player.type === 'guest') {
        return {
          type: 'guest',
          guest_name: player.name || player.guest_name,
          account_id: player.chargedToAccountId || player.account_id,
        };
      } else {
        return {
          type: 'member',
          member_id: player.id || player.member_id,
          account_id: player.accountId || player.account_id,
        };
      }
    });

    const groupType = options.type || options.groupType ||
      (participants.length <= 2 ? 'singles' : 'doubles');

    const result = await this.api.joinWaitlist(groupType, participants);

    // Refresh waitlist
    await this.refreshWaitlist();

    return {
      success: true,
      waitlist: result.waitlist,
    };
  }

  async removeFromWaitlist(waitlistId) {
    // If passed an index (legacy), we need to look up the actual ID
    if (typeof waitlistId === 'number') {
      const waitlist = await this.getWaitlist();
      const entry = waitlist[waitlistId];
      if (!entry) {
        throw new Error(`Waitlist entry at index ${waitlistId} not found`);
      }
      waitlistId = entry.id;
    }

    const result = await this.api.cancelWaitlist(waitlistId);

    // Refresh waitlist
    await this.refreshWaitlist();

    return {
      success: true,
    };
  }

  async assignFromWaitlist(waitlistId, courtNumber, options = {}) {
    // If passed an index (legacy), look up the actual ID
    if (typeof waitlistId === 'number') {
      const waitlist = await this.getWaitlist();
      const entry = waitlist[waitlistId];
      if (!entry) {
        throw new Error(`Waitlist entry at index ${waitlistId} not found`);
      }
      waitlistId = entry.id;
    }

    // Get court ID from court number
    const courts = await this.getAllCourts();
    const court = courts.find(c => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    const result = await this.api.assignFromWaitlist(waitlistId, court.id, {
      addBalls: options.addBalls || options.balls || false,
      splitBalls: options.splitBalls || false,
    });

    // Refresh both
    await Promise.all([this.refreshCourtData(), this.refreshWaitlist()]);

    return {
      success: true,
      session: result.session,
    };
  }

  // ===========================================
  // Member Operations
  // ===========================================

  async searchMembers(query) {
    const result = await this.api.getMembers(query);
    return result.members || [];
  }

  async getMembersByAccount(memberNumber) {
    const result = await this.api.getMembersByAccount(memberNumber);
    return result.members || [];
  }

  async getAllMembers() {
    if (!this.membersCache) {
      const result = await this.api.getMembers();
      this.membersCache = result;
    }
    return this.membersCache.members || [];
  }

  // ===========================================
  // Settings
  // ===========================================

  async getSettings() {
    if (!this.settings) {
      this.settings = await this.api.getSettings();
    }
    return this.settings;
  }

  async refreshSettings() {
    this.settings = await this.api.getSettings(true);
    return this.settings;
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
