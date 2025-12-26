/**
 * @fileoverview TennisQueries - Read operations and subscriptions
 * 
 * All reads go through the /get-board Edge Function.
 * Realtime uses board_change_signals as a trigger to refresh.
 */

import { createClient } from '@supabase/supabase-js';
import { API_CONFIG } from '../../lib/apiConfig.js';

// Feature flag: set to true to test broadcast-only mode (simulates postgres_changes disabled)
const BROADCAST_ONLY_MODE = false;

export class TennisQueries {
  constructor(apiAdapter) {
    this.api = apiAdapter;
    this.supabase = createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.ANON_KEY);
    this.subscription = null;
    this.broadcastSubscription = null;
    this._refreshTimeout = null;
    this._lastBoard = null;
    // Debug counters for verifying one-refresh-per-mutation
    this._signalCount = 0;
    this._refreshCount = 0;
    // Regression guard: track last refresh time to detect double-refreshes
    this._lastRefreshTime = 0;
  }

  /**
   * Get current board state (courts, waitlist, operating hours)
   * @returns {Promise<import('./types').BoardState>}
   */
  async getBoard() {
    console.log('[TennisQueries] getBoard() called');
    const response = await this.api.get('/get-board');
    console.log('[TennisQueries] getBoard response ok:', response.ok, 'courts:', response.courts?.length);

    if (!response.ok) {
      throw new Error(response.message || 'Failed to load board');
    }
    
    // Normalize the response to BoardState
    const board = {
      serverNow: response.serverNow,
      courts: (response.courts || []).map(c => this._normalizeCourt(c)),
      waitlist: (response.waitlist || []).map(w => this._normalizeWaitlistEntry(w)),
      operatingHours: (response.operatingHours || []).map(h => ({
        dayOfWeek: h.day_of_week,
        opensAt: h.opens_at,
        closesAt: h.closes_at,
        isClosed: h.is_closed,
      })),
    };
    
    this._lastBoard = board;
    return board;
  }

  /**
   * Subscribe to board changes
   * Uses board_change_signals table as a lightweight trigger
   * @param {(board: import('./types').BoardState) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribeToBoardChanges(callback) {
    console.log('[TennisQueries] subscribeToBoardChanges called, callback type:', typeof callback);

    // Initial fetch
    console.log('[TennisQueries] Starting initial fetch...');
    this.getBoard()
      .then((board) => {
        console.log('[TennisQueries] Initial fetch resolved:', board?.serverNow, 'courts:', board?.courts?.length);
        return callback?.(board);
      })
      .catch((e) => console.error('[TennisQueries] Initial fetch failed:', e));

    // Subscribe to signals using TWO methods for reliability:
    // 1. postgres_changes - requires database replication to be enabled
    // 2. broadcast - always works, doesn't need database replication
    console.log('📡 Setting up Realtime subscriptions...', BROADCAST_ONLY_MODE ? '(BROADCAST_ONLY_MODE)' : '');

    // Method 1: postgres_changes (database replication) - skip if BROADCAST_ONLY_MODE
    if (!BROADCAST_ONLY_MODE) {
      this.subscription = this.supabase
        .channel('board-signals')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'board_change_signals' },
          (payload) => {
            console.log('📡 [postgres_changes] Signal received:', payload.new?.change_type);
            this._handleSignal(callback, 'postgres_changes');
          }
        )
        .subscribe((status, err) => {
          console.log('📡 [postgres_changes] Status:', status, err ? `Error: ${err.message}` : '');
          if (status === 'SUBSCRIBED') {
            console.log('📡 [postgres_changes] Connected');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('📡 [postgres_changes] Error - may need to enable Replication in Supabase Dashboard');
          }
        });
    } else {
      console.log('📡 [postgres_changes] SKIPPED (BROADCAST_ONLY_MODE enabled)');
    }

    // Method 2: broadcast (more reliable, doesn't need database replication)
    this.broadcastSubscription = this.supabase
      .channel('board-updates')
      .on('broadcast', { event: 'board_changed' }, (payload) => {
        console.log('📡 [broadcast] Signal received:', payload.payload?.change_type);
        this._handleSignal(callback, 'broadcast');
      })
      .subscribe((status, err) => {
        console.log('📡 [broadcast] Status:', status, err ? `Error: ${err.message}` : '');
        if (status === 'SUBSCRIBED') {
          console.log('📡 [broadcast] Connected - ready for real-time updates');
          this._handleSignal(callback, 'broadcast_subscribe');
        }
      });

    // Refresh board when tab becomes visible (handles sleep/wake, tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📡 Tab visible, refreshing board...');
        this._handleSignal(callback, 'visibility_change');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Return unsubscribe function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (this.subscription) {
        this.supabase.removeChannel(this.subscription);
        this.subscription = null;
      }
      if (this.broadcastSubscription) {
        this.supabase.removeChannel(this.broadcastSubscription);
        this.broadcastSubscription = null;
      }
      if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
        this._refreshTimeout = null;
      }
    };
  }

  /**
   * Handle a signal by debouncing and refreshing
   * @private
   */
  _handleSignal(callback, source = 'unknown') {
    this._signalCount++;
    const signalId = this._signalCount;

    // Debounce rapid signals
    if (this._refreshTimeout) {
      console.log(`📡 [debounce] Signal #${signalId} from ${source} - SUPPRESSED (pending refresh)`);
      clearTimeout(this._refreshTimeout);
    } else {
      console.log(`📡 [debounce] Signal #${signalId} from ${source} - scheduling refresh`);
    }

    this._refreshTimeout = setTimeout(async () => {
      this._refreshCount++;
      const now = Date.now();
      const timeSinceLastRefresh = now - this._lastRefreshTime;

      // Regression guard: warn if refresh happens within 500ms of last refresh
      if (this._lastRefreshTime > 0 && timeSinceLastRefresh < 500) {
        console.warn(`⚠️ [regression] Double refresh detected! Only ${timeSinceLastRefresh}ms since last refresh. Signals: ${this._signalCount}, Refreshes: ${this._refreshCount}`);
      }

      this._lastRefreshTime = now;
      console.log(`📡 [refresh] Executing refresh #${this._refreshCount} (signals received: ${this._signalCount})`);

      try {
        const board = await this.getBoard();
        callback(board);
      } catch (error) {
        console.error('Failed to refresh board:', error);
      }
    }, 100);
  }

  /**
   * Force refresh the board
   * @returns {Promise<import('./types').BoardState>}
   */
  async refresh() {
    return this.getBoard();
  }

  /**
   * Get last fetched board (for synchronous access)
   * @returns {import('./types').BoardState | null}
   */
  getLastBoard() {
    return this._lastBoard;
  }

  /**
   * Normalize court data from API to CourtState
   * @private
   * @param {Object} c - Raw court from API
   * @returns {import('./types').CourtState}
   */
  _normalizeCourt(c) {
    const hasSession = !!c.session_id;
    const hasBlock = !!c.block_id;
    const minutesRemaining = c.minutes_remaining ?? null;

    // Compute availability flags for UI compatibility
    const isUnoccupied = !hasSession && !hasBlock;
    const isOvertime = hasSession && minutesRemaining !== null && minutesRemaining <= 0;
    const isActive = hasSession && minutesRemaining !== null && minutesRemaining > 0;
    const isBlocked = hasBlock;
    const isOccupied = hasSession;

    return {
      id: c.court_id,  // UUID for commands
      number: c.court_number,
      status: c.status,
      // Availability flags for UI
      isUnoccupied,
      isOvertime,
      isActive,
      isBlocked,
      isOccupied,
      // Session data
      session: hasSession ? {
        id: c.session_id,
        courtNumber: c.court_number,
        participants: (c.participants || []).map(p => ({
          memberId: p.member_id,
          displayName: p.display_name,
          isGuest: p.is_guest || false,
        })),
        groupType: c.session_type || c.group_type,
        startedAt: c.started_at,
        scheduledEndAt: c.scheduled_end_at,
        minutesRemaining: minutesRemaining,
      } : null,
      // Block data
      block: hasBlock ? {
        id: c.block_id,
        courtNumber: c.court_number,
        reason: c.block_title || c.block_reason,
        endTime: c.block_ends_at || c.block_end_time,
      } : null,
      // Legacy compatibility: add players array and timing at top level
      players: hasSession
        ? (c.participants || []).map(p => ({
            id: p.member_id,
            name: p.display_name || 'Unknown',
            member_id: p.member_id,
          }))
        : [],
      // Top-level timing for Admin CourtStatusGrid compatibility
      endTime: c.scheduled_end_at,
      startTime: c.started_at,
      current: hasSession
        ? {
            players: (c.participants || []).map(p => ({
              id: p.member_id,
              name: p.display_name || 'Unknown',
              member_id: p.member_id,
            })),
            endTime: c.scheduled_end_at,
            startTime: c.started_at,
          }
        : null,
    };
  }

  /**
   * Normalize waitlist entry from API to WaitlistEntry
   * @private
   * @param {Object} w - Raw waitlist entry from API
   * @returns {import('./types').WaitlistEntry}
   */
  _normalizeWaitlistEntry(w) {
    return {
      id: w.id,
      position: w.position,
      participants: (w.participants || []).map(p => 
        typeof p === 'string' 
          ? { displayName: p, memberId: null, isGuest: false }
          : {
              memberId: p.member_id,
              displayName: p.display_name || p.guest_name,
              isGuest: p.is_guest || false,
            }
      ),
      groupType: w.group_type,
      joinedAt: w.joined_at,
      minutesWaiting: w.minutes_waiting,
    };
  }
}

export default TennisQueries;
