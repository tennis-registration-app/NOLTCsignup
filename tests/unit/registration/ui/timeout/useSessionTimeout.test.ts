/**
 * useSessionTimeout - hook coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../../../../../src/lib', () => ({ TENNIS_CONFIG: { TIMING: { SESSION_WARNING_MS: 90000, SESSION_TIMEOUT_MS: 120000 } } }));

import { useSessionTimeout } from '../../../../../src/registration/ui/timeout/useSessionTimeout';

function makeDeps(overrides = {}) {
  return {
    currentScreen: 'group',
    setLastActivity: vi.fn(),
    showAlertMessage: vi.fn(),
    onTimeout: vi.fn(),
    ...overrides,
  };
}

function createHarness(deps) {
  let currentDeps = deps;
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useSessionTimeout(currentDeps);
    useImperativeHandle(ref, () => hook);
    return null;
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef();
  act(() => { root.render(React.createElement(Wrapper, { ref })); });
  return {
    getHook: () => ref.current,
    rerender: (newDeps) => {
      currentDeps = { ...currentDeps, ...newDeps };
      act(() => { root.render(React.createElement(Wrapper, { ref })); });
    },
    unmount: () => { act(() => { root.unmount(); }); container.remove(); },
  };
}

describe('useSessionTimeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  describe('initial state', () => {
    it('returns showTimeoutWarning = false on mount', () => {
      const deps = makeDeps();
      const { getHook, unmount } = createHarness(deps);
      expect(getHook().showTimeoutWarning).toBe(false);
      unmount();
    });

    it('calls setLastActivity on mount when screen is group', () => {
      const deps = makeDeps();
      const { unmount } = createHarness(deps);
      expect(deps.setLastActivity).toHaveBeenCalledWith(expect.any(Number));
      unmount();
    });
  });

  describe('non-group screen', () => {
    it('does NOT call setLastActivity when currentScreen is not group', () => {
      const deps = makeDeps({ currentScreen: 'home' });
      const { unmount } = createHarness(deps);
      expect(deps.setLastActivity).not.toHaveBeenCalled();
      unmount();
    });

    it('does NOT show warning after SESSION_WARNING_MS on non-group screen', () => {
      const deps = makeDeps({ currentScreen: 'home' });
      const { getHook, unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(90000); });
      expect(getHook().showTimeoutWarning).toBe(false);
      unmount();
    });

    it('does NOT call onTimeout after SESSION_TIMEOUT_MS on non-group screen', () => {
      const deps = makeDeps({ currentScreen: 'admin' });
      const { unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(120000); });
      expect(deps.onTimeout).not.toHaveBeenCalled();
      unmount();
    });
  });

  describe('warning timer', () => {
    it('sets showTimeoutWarning = true after SESSION_WARNING_MS', () => {
      const deps = makeDeps();
      const { getHook, unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(90000); });
      expect(getHook().showTimeoutWarning).toBe(true);
      unmount();
    });

    it('does NOT show warning before SESSION_WARNING_MS elapses', () => {
      const deps = makeDeps();
      const { getHook, unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(89999); });
      expect(getHook().showTimeoutWarning).toBe(false);
      unmount();
    });
  });

  describe('timeout timer', () => {
    it('calls showAlertMessage after SESSION_TIMEOUT_MS', () => {
      const deps = makeDeps();
      const { unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(120000); });
      expect(deps.showAlertMessage).toHaveBeenCalledWith('Session timed out due to inactivity');
      unmount();
    });

    it('calls onTimeout after SESSION_TIMEOUT_MS', () => {
      const deps = makeDeps();
      const { unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(120000); });
      expect(deps.onTimeout).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('does NOT call onTimeout before SESSION_TIMEOUT_MS elapses', () => {
      const deps = makeDeps();
      const { unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(119999); });
      expect(deps.onTimeout).not.toHaveBeenCalled();
      unmount();
    });
  });

  describe('activity resets timers', () => {
    it('resets showTimeoutWarning to false on click after warning shown', () => {
      const deps = makeDeps();
      const { getHook, unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(90000); });
      expect(getHook().showTimeoutWarning).toBe(true);
      act(() => { window.dispatchEvent(new MouseEvent('click')); });
      expect(getHook().showTimeoutWarning).toBe(false);
      unmount();
    });

    it('prevents timeout when click resets timer before SESSION_TIMEOUT_MS', () => {
      const deps = makeDeps();
      const { unmount } = createHarness(deps);
      act(() => {
        vi.advanceTimersByTime(100000);
        window.dispatchEvent(new MouseEvent('click'));
      });
      act(() => { vi.advanceTimersByTime(119999); });
      expect(deps.onTimeout).not.toHaveBeenCalled();
      unmount();
    });

    it('fires timeout after full SESSION_TIMEOUT_MS following activity reset', () => {
      const deps = makeDeps();
      const { unmount } = createHarness(deps);
      act(() => {
        vi.advanceTimersByTime(100000);
        window.dispatchEvent(new MouseEvent('click'));
      });
      act(() => { vi.advanceTimersByTime(120000); });
      expect(deps.onTimeout).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('responds to touchstart events as activity', () => {
      const deps = makeDeps();
      const { getHook, unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(90000); });
      expect(getHook().showTimeoutWarning).toBe(true);
      act(() => { window.dispatchEvent(new TouchEvent('touchstart')); });
      expect(getHook().showTimeoutWarning).toBe(false);
      unmount();
    });

    it('responds to keypress events as activity', () => {
      const deps = makeDeps();
      const { getHook, unmount } = createHarness(deps);
      act(() => { vi.advanceTimersByTime(90000); });
      expect(getHook().showTimeoutWarning).toBe(true);
      act(() => { window.dispatchEvent(new KeyboardEvent('keypress', { key: 'a' })); });
      expect(getHook().showTimeoutWarning).toBe(false);
      unmount();
    });
  });

  describe('cleanup', () => {
    it('clears timers on unmount - no timeout fires afterwards', () => {
      const deps = makeDeps();
      const { unmount } = createHarness(deps);
      unmount();
      act(() => { vi.advanceTimersByTime(120000); });
      expect(deps.onTimeout).not.toHaveBeenCalled();
    });

    it('clears timers when screen changes away from group', () => {
      const deps = makeDeps({ currentScreen: 'group' });
      const { rerender, unmount } = createHarness(deps);
      rerender({ currentScreen: 'home' });
      act(() => { vi.advanceTimersByTime(120000); });
      expect(deps.onTimeout).not.toHaveBeenCalled();
      unmount();
    });
  });
});
