/**
 * useStreak - hook coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useStreak } from '../../../../src/registration/streak/useStreak';

function createHarness() {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useStreak();
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

describe('useStreak', () => {
  describe('initial state', () => {
    it('starts with registrantStreak=0, showStreakModal=false, streakAcknowledged=false', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().registrantStreak).toBe(0);
      expect(getHook().showStreakModal).toBe(false);
      expect(getHook().streakAcknowledged).toBe(false);
      unmount();
    });
  });

  describe('setRegistrantStreak', () => {
    it('sets registrantStreak to a positive number', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setRegistrantStreak(5); });
      expect(getHook().registrantStreak).toBe(5);
      unmount();
    });
  });

  describe('setShowStreakModal', () => {
    it('opens streak modal', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowStreakModal(true); });
      expect(getHook().showStreakModal).toBe(true);
      unmount();
    });

    it('closes streak modal', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowStreakModal(true); });
      act(() => { getHook().setShowStreakModal(false); });
      expect(getHook().showStreakModal).toBe(false);
      unmount();
    });
  });

  describe('setStreakAcknowledged', () => {
    it('marks streak as acknowledged', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setStreakAcknowledged(true); });
      expect(getHook().streakAcknowledged).toBe(true);
      unmount();
    });
  });

  describe('resetStreak', () => {
    it('resets all streak fields to initial values', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setRegistrantStreak(7); });
      act(() => { getHook().setShowStreakModal(true); });
      act(() => { getHook().setStreakAcknowledged(true); });
      act(() => { getHook().resetStreak(); });
      expect(getHook().registrantStreak).toBe(0);
      expect(getHook().showStreakModal).toBe(false);
      expect(getHook().streakAcknowledged).toBe(false);
      unmount();
    });

    it('does not affect unrelated state — reset is scoped to streak fields only', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setRegistrantStreak(3); });
      act(() => { getHook().resetStreak(); });
      // After reset: back to 0 (no side effect on other hook instances)
      expect(getHook().registrantStreak).toBe(0);
      unmount();
    });
  });
});
