/**
 * useAdminPriceFeedback - hook coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useAdminPriceFeedback } from '../../../../../src/registration/ui/adminPriceFeedback/useAdminPriceFeedback';

function createHarness() {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useAdminPriceFeedback();
    useImperativeHandle(ref, () => hook);
    return null;
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<ReturnType<typeof useAdminPriceFeedback>>() as { current: ReturnType<typeof useAdminPriceFeedback> };
  act(() => { root.render(React.createElement(Wrapper, { ref })); });
  return {
    getHook: () => ref.current,
    unmount: () => { act(() => { root.unmount(); }); container.remove(); },
  };
}

describe('useAdminPriceFeedback', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  describe('initial state', () => {
    it('starts with showPriceSuccess=false and empty priceError', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().showPriceSuccess).toBe(false);
      expect(getHook().priceError).toBe('');
      unmount();
    });
  });

  describe('setShowPriceSuccess', () => {
    it('sets showPriceSuccess to true', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowPriceSuccess(true); });
      expect(getHook().showPriceSuccess).toBe(true);
      unmount();
    });

    it('sets showPriceSuccess back to false', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowPriceSuccess(true); });
      act(() => { getHook().setShowPriceSuccess(false); });
      expect(getHook().showPriceSuccess).toBe(false);
      unmount();
    });
  });

  describe('setPriceError', () => {
    it('sets priceError message', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setPriceError('Invalid price'); });
      expect(getHook().priceError).toBe('Invalid price');
      unmount();
    });

    it('clears priceError with empty string', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setPriceError('some error'); });
      act(() => { getHook().setPriceError(''); });
      expect(getHook().priceError).toBe('');
      unmount();
    });
  });

  describe('showPriceSuccessWithClear', () => {
    it('immediately sets showPriceSuccess=true and clears priceError', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setPriceError('old error'); });
      act(() => { getHook().showPriceSuccessWithClear(); });
      expect(getHook().showPriceSuccess).toBe(true);
      expect(getHook().priceError).toBe('');
      unmount();
    });

    it('auto-hides showPriceSuccess after 3000ms', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().showPriceSuccessWithClear(); });
      expect(getHook().showPriceSuccess).toBe(true);
      act(() => { vi.advanceTimersByTime(3000); });
      expect(getHook().showPriceSuccess).toBe(false);
      unmount();
    });

    it('does not hide before 3000ms', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().showPriceSuccessWithClear(); });
      act(() => { vi.advanceTimersByTime(2999); });
      expect(getHook().showPriceSuccess).toBe(true);
      unmount();
    });
  });

  describe('resetAdminPriceFeedback', () => {
    it('clears both showPriceSuccess and priceError', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowPriceSuccess(true); });
      act(() => { getHook().setPriceError('some error'); });
      act(() => { getHook().resetAdminPriceFeedback(); });
      expect(getHook().showPriceSuccess).toBe(false);
      expect(getHook().priceError).toBe('');
      unmount();
    });
  });
});
