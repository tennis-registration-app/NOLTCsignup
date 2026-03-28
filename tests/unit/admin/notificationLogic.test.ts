import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createShowNotification } from '../../../src/admin/hooks/notificationLogic.js';

describe('notificationLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createShowNotification', () => {
    it('calls setNotification with exact { message, type } shape', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
        timeoutMs: 3000,
      });

      showNotification('test message', 'success');

      // Assert exact shape - no extra keys
      expect(mockSetNotification).toHaveBeenCalledWith({
        message: 'test message',
        type: 'success',
      });

      // Verify no extra keys in the call
      const callArg = mockSetNotification.mock.calls[0][0];
      expect(Object.keys(callArg)).toEqual(['message', 'type']);
    });

    it('defaults type to "info" when not provided', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
      });

      showNotification('info message');

      expect(mockSetNotification).toHaveBeenCalledWith({
        message: 'info message',
        type: 'info',
      });
    });

    it('preserves custom type values', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
      });

      showNotification('error message', 'error');
      expect(mockSetNotification).toHaveBeenCalledWith({
        message: 'error message',
        type: 'error',
      });

      showNotification('warning message', 'warning');
      expect(mockSetNotification).toHaveBeenCalledWith({
        message: 'warning message',
        type: 'warning',
      });
    });

    it('auto-dismisses after 3000ms (default)', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
        timeoutMs: 3000,
      });

      showNotification('test', 'info');

      // Initial call sets notification
      expect(mockSetNotification).toHaveBeenCalledTimes(1);

      // Advance time by 3000ms
      vi.advanceTimersByTime(3000);

      // Auto-dismiss called with null
      expect(mockSetNotification).toHaveBeenCalledTimes(2);
      expect(mockSetNotification).toHaveBeenLastCalledWith(null);
    });

    it('calls addTimer with timeout ID and "timeout" type', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
        timeoutMs: 3000,
      });

      showNotification('test', 'info');

      // addTimer should be called with a timeout ID and 'timeout'
      // Note: with fake timers, setTimeout returns an object, not a number
      expect(mockAddTimer).toHaveBeenCalledTimes(1);
      expect(mockAddTimer.mock.calls[0][1]).toBe('timeout');
    });

    it('respects custom timeoutMs', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
        timeoutMs: 5000,
      });

      showNotification('test', 'info');

      // Advance 3000ms - should NOT dismiss yet
      vi.advanceTimersByTime(3000);
      expect(mockSetNotification).toHaveBeenCalledTimes(1);

      // Advance to 5000ms total - should dismiss
      vi.advanceTimersByTime(2000);
      expect(mockSetNotification).toHaveBeenCalledTimes(2);
      expect(mockSetNotification).toHaveBeenLastCalledWith(null);
    });

    it('does NOT cancel prior timeouts on rapid calls (behavior parity)', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
        timeoutMs: 3000,
      });

      // Call twice quickly
      showNotification('first', 'info');
      showNotification('second', 'info');

      // addTimer should be called twice (once per call)
      expect(mockAddTimer).toHaveBeenCalledTimes(2);

      // Both notifications set
      expect(mockSetNotification).toHaveBeenNthCalledWith(1, {
        message: 'first',
        type: 'info',
      });
      expect(mockSetNotification).toHaveBeenNthCalledWith(2, {
        message: 'second',
        type: 'info',
      });

      // Advance 3000ms - BOTH timeouts fire
      vi.advanceTimersByTime(3000);

      // setNotification called 4 times total:
      // 1. first notification
      // 2. second notification
      // 3. null from first timeout
      // 4. null from second timeout
      expect(mockSetNotification).toHaveBeenCalledTimes(4);
    });

    it('returns undefined (no return value)', () => {
      const mockSetNotification = vi.fn();
      const mockAddTimer = vi.fn((id) => id);

      const showNotification = createShowNotification({
        setNotification: mockSetNotification,
        addTimer: mockAddTimer,
      });

      const result = showNotification('test', 'info');
      expect(result).toBeUndefined();
    });
  });
});
