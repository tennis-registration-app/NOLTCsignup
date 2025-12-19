/**
 * Supabase Realtime Client for NOLTC
 *
 * Provides live updates for court status, waitlist changes, and session events.
 * Uses Supabase Realtime to subscribe to database changes.
 *
 * @example
 * import { RealtimeClient } from './RealtimeClient.js';
 *
 * const realtime = new RealtimeClient();
 *
 * // Subscribe to court status changes
 * realtime.onCourtChange((payload) => {
 *   console.log('Court changed:', payload);
 * });
 *
 * // Subscribe to waitlist changes
 * realtime.onWaitlistChange((payload) => {
 *   console.log('Waitlist changed:', payload);
 * });
 *
 * // Clean up when done
 * realtime.disconnect();
 */

import { createClient } from '@supabase/supabase-js';
import { API_CONFIG } from './apiConfig.js';

/**
 * Realtime subscription client for live database updates
 */
export class RealtimeClient {
  constructor(options = {}) {
    this.supabase = createClient(
      API_CONFIG.SUPABASE_URL,
      API_CONFIG.ANON_KEY,
      {
        realtime: {
          params: {
            eventsPerSecond: options.eventsPerSecond || 10,
          },
        },
      }
    );

    this.channels = new Map();
    this.callbacks = {
      courts: [],
      sessions: [],
      waitlist: [],
      blocks: [],
      settings: [],
    };

    // Debug mode
    this.debug = options.debug || false;
  }

  /**
   * Log debug messages
   */
  _log(...args) {
    if (this.debug) {
      console.log('[RealtimeClient]', ...args);
    }
  }

  /**
   * Subscribe to a table with callback
   */
  _subscribeToTable(table, event, callback) {
    const channelName = `${table}-changes`;

    // Create channel if it doesn't exist
    if (!this.channels.has(channelName)) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: event || '*',
            schema: 'public',
            table: table,
          },
          (payload) => {
            this._log(`${table} change:`, payload);
            // Call all registered callbacks for this table
            const callbacks = this.callbacks[table] || [];
            callbacks.forEach(cb => cb(payload));
          }
        )
        .subscribe((status) => {
          this._log(`${table} subscription status:`, status);
        });

      this.channels.set(channelName, channel);
    }

    // Add callback to the list
    if (!this.callbacks[table]) {
      this.callbacks[table] = [];
    }
    this.callbacks[table].push(callback);

    // Return unsubscribe function
    return () => {
      const idx = this.callbacks[table].indexOf(callback);
      if (idx > -1) {
        this.callbacks[table].splice(idx, 1);
      }
    };
  }

  /**
   * Subscribe to court status changes
   * Fires when courts table is updated (active status, etc.)
   */
  onCourtChange(callback) {
    return this._subscribeToTable('courts', '*', callback);
  }

  /**
   * Subscribe to session changes
   * Fires when sessions are created, updated, or ended
   */
  onSessionChange(callback) {
    return this._subscribeToTable('sessions', '*', callback);
  }

  /**
   * Subscribe to waitlist changes
   * Fires when waitlist entries are added, updated, or removed
   */
  onWaitlistChange(callback) {
    return this._subscribeToTable('waitlist', '*', callback);
  }

  /**
   * Subscribe to block changes
   * Fires when court blocks are created, updated, or cancelled
   */
  onBlockChange(callback) {
    return this._subscribeToTable('blocks', '*', callback);
  }

  /**
   * Subscribe to settings changes
   * Fires when system settings are updated
   */
  onSettingsChange(callback) {
    return this._subscribeToTable('system_settings', '*', (payload) => {
      // Map to 'settings' callback list
      callback(payload);
    });
  }

  /**
   * Subscribe to all court-related changes (courts, sessions, blocks)
   * Useful for the CourtBoard display
   */
  onCourtBoardUpdate(callback) {
    const unsubCourts = this.onCourtChange(callback);
    const unsubSessions = this.onSessionChange(callback);
    const unsubBlocks = this.onBlockChange(callback);

    // Return combined unsubscribe
    return () => {
      unsubCourts();
      unsubSessions();
      unsubBlocks();
    };
  }

  /**
   * Subscribe to all changes (for admin dashboard)
   */
  onAnyChange(callback) {
    const unsubs = [
      this.onCourtChange(callback),
      this.onSessionChange(callback),
      this.onWaitlistChange(callback),
      this.onBlockChange(callback),
      this.onSettingsChange(callback),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }

  /**
   * Get connection status
   */
  getStatus() {
    const statuses = {};
    this.channels.forEach((channel, name) => {
      statuses[name] = channel.state;
    });
    return statuses;
  }

  /**
   * Check if connected to any channels
   */
  isConnected() {
    return this.channels.size > 0 &&
      Array.from(this.channels.values()).some(ch => ch.state === 'joined');
  }

  /**
   * Disconnect from all channels
   */
  disconnect() {
    this._log('Disconnecting all channels');
    this.channels.forEach((channel, name) => {
      this.supabase.removeChannel(channel);
      this._log(`Removed channel: ${name}`);
    });
    this.channels.clear();

    // Clear all callbacks
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = [];
    });
  }

  /**
   * Reconnect all channels
   */
  reconnect() {
    this._log('Reconnecting...');
    this.channels.forEach((channel) => {
      channel.subscribe();
    });
  }
}

/**
 * Singleton instance for convenience
 */
let realtimeInstance = null;

export function getRealtimeClient(options = {}) {
  if (!realtimeInstance) {
    realtimeInstance = new RealtimeClient(options);
  }
  return realtimeInstance;
}

/**
 * Reset singleton (useful for testing)
 */
export function resetRealtimeClient() {
  if (realtimeInstance) {
    realtimeInstance.disconnect();
    realtimeInstance = null;
  }
}

export default RealtimeClient;
