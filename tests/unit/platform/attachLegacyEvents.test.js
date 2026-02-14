/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  legacyEvents,
  MessageTypes,
  onDom,
  emitDom,
} from '../../../src/platform/attachLegacyEvents.js';

describe('attachLegacyEvents', () => {
  test('MessageTypes has exact IIFE values', () => {
    expect(MessageTypes.REGISTER).toBe('register');
    expect(MessageTypes.SUCCESS).toBe('registration:success');
    expect(MessageTypes.HIGHLIGHT).toBe('highlight');
  });

  test('legacyEvents exports all required functions', () => {
    expect(typeof legacyEvents.onDom).toBe('function');
    expect(typeof legacyEvents.emitDom).toBe('function');
    expect(typeof legacyEvents.onMessage).toBe('function');
    expect(typeof legacyEvents.emitMessage).toBe('function');
    expect(legacyEvents.MessageTypes).toBe(MessageTypes);
    expect(typeof legacyEvents.debug.getLog).toBe('function');
    expect(typeof legacyEvents.debug.clearLog).toBe('function');
    expect(typeof legacyEvents.debug.isEnabled).toBe('function');
  });

  test('window.Tennis.Events is set correctly', () => {
    expect(window.Tennis.Events).toBe(legacyEvents);
  });

  describe('emitDom/onDom round-trip', () => {
    let handler;
    let unsubscribe;

    beforeEach(() => {
      handler = vi.fn();
    });

    afterEach(() => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });

    test('onDom receives CustomEvent with detail', () => {
      unsubscribe = onDom('testEvent', handler);

      emitDom('testEvent', { foo: 'bar' });

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomEvent);
      expect(event.detail).toEqual({ foo: 'bar' });
    });

    test('unsubscribe removes listener', () => {
      unsubscribe = onDom('testEvent2', handler);

      // Emit before unsubscribe
      emitDom('testEvent2', { count: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Emit after unsubscribe - should not trigger handler
      emitDom('testEvent2', { count: 2 });
      expect(handler).toHaveBeenCalledTimes(1);

      // Prevent double cleanup
      unsubscribe = null;
    });

    test('handler receives full Event object (not just detail)', () => {
      unsubscribe = onDom('fullEventTest', handler);

      emitDom('fullEventTest', { data: 123 });

      const event = handler.mock.calls[0][0];
      expect(event.type).toBe('fullEventTest');
      expect(event.detail).toEqual({ data: 123 });
    });
  });

  describe('debug utilities', () => {
    test('debug.isEnabled returns boolean', () => {
      expect(typeof legacyEvents.debug.isEnabled()).toBe('boolean');
    });

    test('debug.getLog returns array', () => {
      expect(Array.isArray(legacyEvents.debug.getLog())).toBe(true);
    });

    test('debug.clearLog clears the log', () => {
      legacyEvents.debug.clearLog();
      expect(legacyEvents.debug.getLog()).toEqual([]);
    });
  });
});
