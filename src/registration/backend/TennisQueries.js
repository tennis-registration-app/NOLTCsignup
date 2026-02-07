/**
 * @fileoverview TennisQueries - Read operations and subscriptions
 *
 * All reads go through the /get-board Edge Function.
 * Realtime uses board_change_signals as a trigger to refresh.
 *
 * Uses the normalize layer for consistent Domain objects.
 */

import { normalizeBoard } from '../../lib/normalize/index.js';
import { validateBoardResponse, validateBoard } from '../../lib/schemas/index.js';
import { logger } from '../../lib/logger.js';

export class TennisQueries {
  constructor(apiAdapter) {
    this.api = apiAdapter;
    this._refreshTimeout = null;
    this._lastBoard = null;
    // Debug counters for verifying one-refresh-per-mutation
    this._signalCount = 0;
    this._refreshCount = 0;
    // Regression guard: track last refresh time to detect double-refreshes
    this._lastRefreshTime = 0;
    // E2E test mode: skip polling when ?e2e=1
    this.isE2ETest =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('e2e') === '1';
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
   * Uses polling and visibility-based refresh for state updates.
   * @param {(board: import('./types').BoardState) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribeToBoardChanges(callback, options = {}) {
    // E2E test mode: skip polling, just fetch once
    if (this.isE2ETest) {
      logger.debug('TennisQueries', 'E2E mode: skipping polling subscription');
      this.getBoard().then((board) => {
        if (board) callback(board);
      });
      return () => {}; // No-op unsubscribe
    }

    logger.debug(
      'TennisQueries',
      `subscribeToBoardChanges called, callback type: ${typeof callback}`
    );

    // Initial fetch
    logger.debug('TennisQueries', 'Starting initial fetch...');
    this.getBoard()
      .then((board) => {
        logger.debug(
          'TennisQueries',
          `Initial fetch resolved: ${board?.serverNow}, courts: ${board?.courts?.length}`
        );
        return callback?.(board);
      })
      .catch((e) => logger.error('TennisQueries', 'Initial fetch failed', e));

    // Refresh board when tab becomes visible (handles sleep/wake, tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.debug('TennisQueries', 'Tab visible, refreshing data...');
        this._handleSignal(callback, 'visibility_change');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic refresh to catch expired blocks (default: every 30 seconds)
    // Blocks don't trigger database signals when they expire naturally
    const BLOCK_EXPIRY_POLL_INTERVAL = 30000; // 30 seconds
    const pollMs = options.pollIntervalMs || BLOCK_EXPIRY_POLL_INTERVAL;
    const backupMs = options.pollIntervalMs
      ? Math.max(options.pollIntervalMs, BLOCK_EXPIRY_POLL_INTERVAL)
      : 60000; // default backup: 60 seconds
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        logger.debug('TennisQueries', '[poll] Checking for expired blocks...');
        this._handleSignal(callback, 'block_expiry_poll');
      }
    }, pollMs);

    // Periodic refresh as backup (never faster than 30s)
    // Ensures state stays fresh on always-visible displays
    const backupPollInterval = setInterval(() => {
      if (!document.hidden) {
        logger.debug('TennisQueries', '[backup-poll] Periodic refresh...');
        this._handleSignal(callback, 'backup_poll');
      }
    }, backupMs);

    // Return unsubscribe function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
      clearInterval(backupPollInterval);
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
      logger.debug(
        'TennisQueries',
        `[debounce] Signal #${signalId} from ${source} - SUPPRESSED (pending refresh)`
      );
      clearTimeout(this._refreshTimeout);
    } else {
      logger.debug(
        'TennisQueries',
        `[debounce] Signal #${signalId} from ${source} - scheduling refresh`
      );
    }

    this._refreshTimeout = setTimeout(async () => {
      this._refreshCount++;
      const now = Date.now();
      const timeSinceLastRefresh = now - this._lastRefreshTime;

      // Regression guard: warn if refresh happens within 500ms of last refresh
      if (this._lastRefreshTime > 0 && timeSinceLastRefresh < 500) {
        logger.warn(
          'TennisQueries',
          `[regression] Double refresh detected! Only ${timeSinceLastRefresh}ms since last refresh. Signals: ${this._signalCount}, Refreshes: ${this._refreshCount}`
        );
      }

      this._lastRefreshTime = now;
      logger.debug(
        'TennisQueries',
        `[refresh] Executing refresh #${this._refreshCount} (signals received: ${this._signalCount})`
      );

      try {
        const board = await this.getBoard();
        callback(board);
      } catch (error) {
        logger.error('TennisQueries', 'Failed to refresh board', error);
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
   * Get frequent partners for a member
   * @param {string} memberNumber - The member number to get partners for
   * @returns {Promise<{ok: boolean, partners: Array<{member_id: string, display_name: string, member_number: string, play_count: number}>}>}
   */
  async getFrequentPartners(memberId) {
    logger.debug('TennisQueries', 'getFrequentPartners called', { memberId });
    const response = await this.api.post('/get-frequent-partners', {
      member_id: memberId,
    });
    logger.debug('TennisQueries', 'getFrequentPartners response', {
      ok: response.ok,
      count: response.partners?.length,
    });
    return response;
  }
}

export default TennisQueries;
