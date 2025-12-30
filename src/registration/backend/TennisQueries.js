/**
 * @fileoverview TennisQueries - Read operations and subscriptions
 *
 * All reads go through the /get-board Edge Function.
 * Realtime uses board_change_signals as a trigger to refresh.
 *
 * Uses the normalize layer for consistent Domain objects.
 */

import { createClient } from '@supabase/supabase-js';
import { API_CONFIG } from '../../lib/apiConfig.js';
import { normalizeBoard } from '../../lib/normalize/index.js';
import { validateBoardResponse, validateBoard } from '../../lib/schemas/index.js';
import { logger } from '../../lib/logger.js';

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
   * Returns pure Domain Board. UI components consume Domain objects directly.
   *
   * @returns {Promise<import('../../lib/types/domain.js').Board>}
   */
  async getBoard() {
    logger.debug('TennisQueries', 'getBoard() called');
    const response = await this.api.get('/get-board');
    logger.debug('TennisQueries', 'getBoard response', {
      ok: response.ok,
      courts: response.courts?.length,
    });

    if (!response.ok) {
      throw new Error(response.message || 'Failed to load board');
    }

    // Validate API envelope
    const envelopeResult = validateBoardResponse(response);
    if (!envelopeResult.success) {
      logger.warn('TennisQueries', 'Invalid API envelope', envelopeResult.error);
    }

    // Normalize to Domain using the normalize layer
    const board = normalizeBoard(response);

    // Validate Domain (log errors but don't throw)
    const domainResult = validateBoard(board);
    if (!domainResult.success) {
      logger.warn('TennisQueries', 'Domain validation issues', domainResult.error);
    }

    // Store raw response for legacy adapter (temporary)
    board._raw = response;

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
        console.log(
          '[TennisQueries] Initial fetch resolved:',
          board?.serverNow,
          'courts:',
          board?.courts?.length
        );
        return callback?.(board);
      })
      .catch((e) => console.error('[TennisQueries] Initial fetch failed:', e));

    // Subscribe to signals using TWO methods for reliability:
    // 1. postgres_changes - requires database replication to be enabled
    // 2. broadcast - always works, doesn't need database replication
    console.log(
      '📡 Setting up Realtime subscriptions...',
      BROADCAST_ONLY_MODE ? '(BROADCAST_ONLY_MODE)' : ''
    );

    // Method 1: postgres_changes (database replication) - skip if BROADCAST_ONLY_MODE
    if (!BROADCAST_ONLY_MODE) {
      this.subscription = this.supabase
        .channel('board-signals')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'board_change_signals' },
          (payload) => {
            console.log('📡 [postgres_changes] Signal received:', payload.new?.change_type);
            console.log('[DEBUG] postgres_changes full payload:', payload);
            this._handleSignal(callback, 'postgres_changes');
          }
        )
        .subscribe((status, err) => {
          console.log('📡 [postgres_changes] Status:', status, err ? `Error: ${err.message}` : '');
          if (status === 'SUBSCRIBED') {
            console.log('📡 [postgres_changes] Connected');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn(
              '📡 [postgres_changes] Error - may need to enable Replication in Supabase Dashboard'
            );
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
        console.log('[DEBUG] broadcast full payload:', payload);
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

    // Periodic refresh to catch expired blocks (every 30 seconds)
    // Blocks don't trigger database signals when they expire naturally
    const BLOCK_EXPIRY_POLL_INTERVAL = 30000; // 30 seconds
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        console.log('📡 [poll] Checking for expired blocks...');
        this._handleSignal(callback, 'block_expiry_poll');
      }
    }, BLOCK_EXPIRY_POLL_INTERVAL);

    // Return unsubscribe function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
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
      console.log(
        `📡 [debounce] Signal #${signalId} from ${source} - SUPPRESSED (pending refresh)`
      );
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
        console.warn(
          `⚠️ [regression] Double refresh detected! Only ${timeSinceLastRefresh}ms since last refresh. Signals: ${this._signalCount}, Refreshes: ${this._refreshCount}`
        );
      }

      this._lastRefreshTime = now;
      console.log(
        `📡 [refresh] Executing refresh #${this._refreshCount} (signals received: ${this._signalCount})`
      );

      try {
        const board = await this.getBoard();
        console.log('[DEBUG] Refetched board after signal:', {
          serverNow: board?.serverNow,
          courtsWithBlocks: board?.courts?.filter((c) => c.block).length,
          wetBlocks: board?.courts?.filter((c) => c.block?.reason?.toLowerCase().includes('wet'))
            .length,
        });
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
}

export default TennisQueries;
