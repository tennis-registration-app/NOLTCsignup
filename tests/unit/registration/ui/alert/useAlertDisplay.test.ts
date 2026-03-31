/**
 * useAlertDisplay - hook coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useAlertDisplay } from '../../../../../src/registration/ui/alert/useAlertDisplay';

function createHarness(options = {}) {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useAlertDisplay(options);
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
    unmount: () => { act(() => { root.unmount(); }); container.remove(); },
  };
}

describe('useAlertDisplay', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  describe('initial state', () => {
    it('starts with showAlert=false and empty alertMessage', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().showAlert).toBe(false);
      expect(getHook().alertMessage).toBe('');
      unmount();
    });
  });

  describe('setShowAlert', () => {
    it('sets showAlert to true', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowAlert(true); });
      expect(getHook().showAlert).toBe(true);
      unmount();
    });

    it('sets showAlert to false', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowAlert(true); });
      act(() => { getHook().setShowAlert(false); });
      expect(getHook().showAlert).toBe(false);
      unmount();
    });
  });

  describe('setAlertMessage', () => {
    it('sets alertMessage without affecting showAlert', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setAlertMessage('Court 3 closed'); });
      expect(getHook().alertMessage).toBe('Court 3 closed');
      expect(getHook().showAlert).toBe(false);
      unmount();
    });
  });

  describe('showAlertMessage', () => {
    it('shows alert with message immediately', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().showAlertMessage('Error occurred'); });
      expect(getHook().showAlert).toBe(true);
      expect(getHook().alertMessage).toBe('Error occurred');
      unmount();
    });

    it('auto-hides alert after default 3000ms', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().showAlertMessage('Temp message'); });
      act(() => { vi.advanceTimersByTime(3000); });
      expect(getHook().showAlert).toBe(false);
      unmount();
    });

    it('does not hide before 3000ms', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().showAlertMessage('Temp message'); });
      act(() => { vi.advanceTimersByTime(2999); });
      expect(getHook().showAlert).toBe(true);
      unmount();
    });

    it('respects custom alertDurationMs', () => {
      const { getHook, unmount } = createHarness({ alertDurationMs: 1000 });
      act(() => { getHook().showAlertMessage('Quick message'); });
      act(() => { vi.advanceTimersByTime(1000); });
      expect(getHook().showAlert).toBe(false);
      unmount();
    });

    it('preserves alertMessage after auto-hide (only visibility changes)', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().showAlertMessage('Remembered'); });
      act(() => { vi.advanceTimersByTime(3000); });
      expect(getHook().alertMessage).toBe('Remembered');
      expect(getHook().showAlert).toBe(false);
      unmount();
    });
  });

  describe('resetAlertDisplay', () => {
    it('clears both showAlert and alertMessage', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().showAlertMessage('Error'); });
      act(() => { getHook().resetAlertDisplay(); });
      expect(getHook().showAlert).toBe(false);
      expect(getHook().alertMessage).toBe('');
      unmount();
    });
  });
});
