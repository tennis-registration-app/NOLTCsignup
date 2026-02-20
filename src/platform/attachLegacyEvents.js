/**
 * Legacy back-compat adapter for Events functions
 * Maps ESM event functions to IIFE window.Tennis.Events shape
 *
 * Delete this file when <script src="shared/events.js"> is removed from HTML files
 */

import { logger } from '../lib/logger.js';

// Circular debug log for tracking events
class CircularDebugLog {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.events = [];
    this.enabled = false;

    // Check for debug mode
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        this.enabled = params.get('debug') === '1';
      } catch {
        // Ignore errors in SSR or test environments
      }
    }
  }

  add(type, eventName, data) {
    if (!this.enabled) return;

    const entry = {
      timestamp: new Date().toISOString(),
      type: type,
      eventName: eventName,
      data: data,
    };

    this.events.push(entry);

    // Keep only last N events
    if (this.events.length > this.maxSize) {
      this.events.shift();
    }

    logger.debug('Tennis.Events', `${type}: ${eventName}`, data);
  }

  getAll() {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}

// Create debug log instance
const debugLog = new CircularDebugLog(10);

// Message types constants - exact values from IIFE
const MessageTypes = {
  REGISTER: 'register',
  SUCCESS: 'registration:success',
  HIGHLIGHT: 'highlight',
};

/**
 * Add DOM event listener (CustomEvent wrapper)
 * @param {string} eventName - Event name to listen for
 * @param {Function} handler - Event handler (receives full Event object)
 * @param {Object} options - addEventListener options
 * @returns {Function} Unsubscribe function
 */
function onDom(eventName, handler, options) {
  if (typeof window === 'undefined') return () => {};

  try {
    // @ts-ignore — custom event name
    window.addEventListener(eventName, handler, options);
    debugLog.add('DOM_LISTENER_ADDED', eventName, { hasOptions: !!options });
  } catch (e) {
    console.error('Error adding DOM event listener:', e);
  }

  // Return unsubscribe function
  return function () {
    try {
      // @ts-ignore — custom event name
      window.removeEventListener(eventName, handler, options);
      debugLog.add('DOM_LISTENER_REMOVED', eventName, null);
    } catch {
      // Ignore cleanup errors
    }
  };
}

/**
 * Emit DOM CustomEvent
 * @param {string} eventName - Event name to dispatch
 * @param {*} detail - Event detail payload
 */
function emitDom(eventName, detail) {
  if (typeof window === 'undefined') return;

  try {
    const event = new CustomEvent(eventName, { detail: detail });
    window.dispatchEvent(event);
    debugLog.add('DOM_EVENT_EMITTED', eventName, detail);
  } catch (e) {
    console.error('Error emitting DOM event:', e);
  }
}

/**
 * Add postMessage listener
 * @param {Function} handler - Message handler (receives full MessageEvent)
 * @param {string} targetOrigin - Origin filter ('*' for any)
 * @returns {Function} Unsubscribe function
 */
function onMessage(handler, targetOrigin = '*') {
  if (typeof window === 'undefined') return () => {};

  const wrappedHandler = function (event) {
    // Security check if origin specified
    if (targetOrigin !== '*' && event.origin !== targetOrigin) {
      return;
    }

    debugLog.add('MESSAGE_RECEIVED', event.data?.type || 'unknown', event.data);
    handler(event);
  };

  try {
    window.addEventListener('message', wrappedHandler);
    debugLog.add('MESSAGE_LISTENER_ADDED', 'message', { targetOrigin });
  } catch (e) {
    console.error('Error adding message listener:', e);
  }

  // Return unsubscribe function
  return function () {
    try {
      window.removeEventListener('message', wrappedHandler);
      debugLog.add('MESSAGE_LISTENER_REMOVED', 'message', null);
    } catch {
      // Ignore cleanup errors
    }
  };
}

/**
 * Send postMessage to target
 * @param {Window} target - Target window (e.g., iframe.contentWindow)
 * @param {Object} message - Message to send
 * @param {string} targetOrigin - Target origin ('*' for any)
 */
function emitMessage(target, message, targetOrigin = '*') {
  try {
    if (!target || !target.postMessage) {
      throw new Error('Invalid target for postMessage');
    }

    target.postMessage(message, targetOrigin);
    debugLog.add('MESSAGE_SENT', message.type || 'unknown', message);
  } catch (e) {
    console.error('Error sending message:', e);
  }
}

// Debug utilities
const debug = {
  getLog: function () {
    return debugLog.getAll();
  },

  clearLog: function () {
    debugLog.clear();
  },

  isEnabled: function () {
    return debugLog.enabled;
  },
};

// Assemble the legacy Events object
const legacyEvents = {
  MessageTypes,
  onDom,
  emitDom,
  onMessage,
  emitMessage,
  debug,
};

// Attach to window.Tennis.Events
if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.Events = legacyEvents;
}

export { legacyEvents, MessageTypes, onDom, emitDom, onMessage, emitMessage, debug };
