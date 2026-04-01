/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  legacyEvents,
  MessageTypes,
  onDom,
  emitDom,
  onMessage,
  emitMessage,
  debug,
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

  test('(window.Tennis as any).Events is set correctly', () => {
    expect((window.Tennis as any).Events).toBe(legacyEvents);
  });

  describe('emitDom/onDom round-trip', () => {
    let handler: ReturnType<typeof vi.fn>;
    let unsubscribe: (() => void) | null;

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
      unsubscribe = onDom('testEvent', handler as any);

      emitDom('testEvent', { foo: 'bar' });

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event).toBeInstanceOf(CustomEvent);
      expect(event.detail).toEqual({ foo: 'bar' });
    });

    test('unsubscribe removes listener', () => {
      unsubscribe = onDom('testEvent2', handler as any);

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
      unsubscribe = onDom('fullEventTest', handler as any);

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

  // ── onMessage / emitMessage ─────────────────────────────────
  describe('onMessage/emitMessage', () => {
    let handler: ReturnType<typeof vi.fn>;
    let unsubscribe: (() => void) | null;

    beforeEach(() => {
      handler = vi.fn();
    });

    afterEach(() => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });

    test('onMessage receives postMessage events', () => {
      unsubscribe = onMessage(handler as any);

      // Dispatch a message event
      const event = new MessageEvent('message', {
        data: { type: 'test', payload: 42 },
        origin: 'http://localhost',
      });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].data).toEqual({ type: 'test', payload: 42 });
    });

    test('onMessage unsubscribe removes listener', () => {
      unsubscribe = onMessage(handler as any);

      window.dispatchEvent(new MessageEvent('message', { data: { type: 'a' } }));
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      unsubscribe = null;

      window.dispatchEvent(new MessageEvent('message', { data: { type: 'b' } }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('onMessage filters by targetOrigin when specified', () => {
      unsubscribe = onMessage(handler as any, 'http://allowed.com');

      // Wrong origin — should be filtered
      const wrongOrigin = new MessageEvent('message', {
        data: { type: 'wrong' },
        origin: 'http://notallowed.com',
      });
      window.dispatchEvent(wrongOrigin);
      expect(handler).not.toHaveBeenCalled();

      // Correct origin
      const rightOrigin = new MessageEvent('message', {
        data: { type: 'right' },
        origin: 'http://allowed.com',
      });
      window.dispatchEvent(rightOrigin);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('onMessage with wildcard origin accepts all', () => {
      unsubscribe = onMessage(handler as any, '*');

      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'any' }, origin: 'http://anything.com' })
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('emitMessage sends postMessage to target', () => {
      const target = { postMessage: vi.fn() };
      emitMessage(target as any, { type: 'hello', data: 123 }, 'http://target.com');
      expect(target.postMessage).toHaveBeenCalledWith(
        { type: 'hello', data: 123 },
        'http://target.com'
      );
    });

    test('emitMessage defaults to wildcard origin', () => {
      const target = { postMessage: vi.fn() };
      emitMessage(target as any, { type: 'test' });
      expect(target.postMessage).toHaveBeenCalledWith({ type: 'test' }, '*');
    });

    test('emitMessage handles null target gracefully', () => {
      // Should not throw
      expect(() => emitMessage(null as any, { type: 'test' })).not.toThrow();
    });

    test('emitMessage handles target without postMessage', () => {
      expect(() => emitMessage({} as any, { type: 'test' })).not.toThrow();
    });
  });

  // ── debug exports ──────────────────────────────────────────
  describe('debug direct exports', () => {
    test('debug.getLog returns array', () => {
      expect(Array.isArray(debug.getLog())).toBe(true);
    });

    test('debug.clearLog works', () => {
      debug.clearLog();
      expect(debug.getLog()).toEqual([]);
    });

    test('debug.isEnabled returns boolean', () => {
      expect(typeof debug.isEnabled()).toBe('boolean');
    });
  });
});
