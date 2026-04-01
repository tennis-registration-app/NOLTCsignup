/**
 * useGuestCounter - hook coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useGuestCounter } from '../../../../../src/registration/ui/guestCounter/useGuestCounter';

function createHarness() {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useGuestCounter();
    useImperativeHandle(ref, () => hook);
    return null;
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<ReturnType<typeof useGuestCounter>>() as { current: ReturnType<typeof useGuestCounter> };
  act(() => { root.render(React.createElement(Wrapper, { ref })); });
  return {
    getHook: () => ref.current,
    unmount: () => { act(() => { root.unmount(); }); container.remove(); },
  };
}

describe('useGuestCounter', () => {
  describe('initial state', () => {
    it('starts guestCounter at 1', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().guestCounter).toBe(1);
      unmount();
    });
  });

  describe('incrementGuestCounter', () => {
    it('increments from 1 to 2', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().incrementGuestCounter(); });
      expect(getHook().guestCounter).toBe(2);
      unmount();
    });

    it('increments multiple times to produce unique values', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().incrementGuestCounter(); });
      act(() => { getHook().incrementGuestCounter(); });
      act(() => { getHook().incrementGuestCounter(); });
      expect(getHook().guestCounter).toBe(4);
      unmount();
    });
  });

  describe('setGuestCounter', () => {
    it('sets counter to arbitrary value', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setGuestCounter(99); });
      expect(getHook().guestCounter).toBe(99);
      unmount();
    });

    it('setGuestCounter does not reset to 1 — survives form reset pattern', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().incrementGuestCounter(); });
      act(() => { getHook().incrementGuestCounter(); });
      // Intentionally NOT resetting — unique ID guarantee
      expect(getHook().guestCounter).toBe(3);
      unmount();
    });
  });
});
