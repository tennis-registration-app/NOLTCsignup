/**
 * useRegistrationUiState — hook coverage
 *
 * Tests: initial state values derived from TENNIS_CONFIG, setCurrentScreen
 * navigation wrapper (calls logger + updates state), individual setters.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../../../../../src/lib/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useRegistrationUiState } from '../../../../../src/registration/appHandlers/state/useRegistrationUiState';
import { logger } from '../../../../../src/lib/logger';

const CONSTANTS = { MEMBER_COUNT: 100, MEMBER_ID_START: 1000 };

function createHarness(constants = CONSTANTS) {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useRegistrationUiState({ CONSTANTS: constants });
    useImperativeHandle(ref, () => hook);
    return null;
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef();
  act(() => { root.render(React.createElement(Wrapper, { ref })); });
  return {
    getHook: () => ref.current as ReturnType<typeof useRegistrationUiState>,
    unmount: () => { act(() => { root.unmount(); }); container.remove(); },
  };
}

describe('useRegistrationUiState', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('initial state', () => {
    it('starts on home screen', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().currentScreen).toBe('home');
      unmount();
    });

    it('initialises data.courts as array of 12 nulls', () => {
      const { getHook, unmount } = createHarness();
      const { courts } = getHook().data;
      expect(Array.isArray(courts)).toBe(true);
      expect(courts).toHaveLength(12);
      courts.forEach((c) => expect(c).toBeNull());
      unmount();
    });

    it('initialises data.waitlist as empty array', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().data.waitlist).toEqual([]);
      unmount();
    });

    it('initialises data.blocks as empty array', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().data.blocks).toEqual([]);
      unmount();
    });

    it('initialises availableCourts as empty array', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().availableCourts).toEqual([]);
      unmount();
    });

    it('initialises operatingHours as null', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().operatingHours).toBeNull();
      unmount();
    });

    it('initialises showSuccess as false', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().showSuccess).toBe(false);
      unmount();
    });

    it('initialises courtToMove as null', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().courtToMove).toBeNull();
      unmount();
    });

    it('initialises ballPriceInput as empty string', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().ballPriceInput).toBe('');
      unmount();
    });

    it('initialises ballPriceCents to 500 (TENNIS_BALLS=5.0 * 100)', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().ballPriceCents).toBe(500);
      unmount();
    });

    it('currentTime is a Date instance', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().currentTime).toBeInstanceOf(Date);
      unmount();
    });
  });

  describe('setCurrentScreen', () => {
    it('updates currentScreen to the new value', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setCurrentScreen('group'); });
      expect(getHook().currentScreen).toBe('group');
      unmount();
    });

    it('logs navigation transition via logger.info', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setCurrentScreen('admin', 'button-click'); });
      expect(logger.info).toHaveBeenCalledWith('NAV', expect.stringContaining('admin'));
      unmount();
    });

    it('defaults source to "unknown" when not provided', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setCurrentScreen('success'); });
      expect(logger.info).toHaveBeenCalledWith('NAV', expect.stringContaining('unknown'));
      unmount();
    });

    it('can navigate multiple times sequentially', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setCurrentScreen('group'); });
      act(() => { getHook().setCurrentScreen('court'); });
      act(() => { getHook().setCurrentScreen('success'); });
      expect(getHook().currentScreen).toBe('success');
      unmount();
    });
  });

  describe('setShowSuccess', () => {
    it('sets showSuccess to true', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowSuccess(true); });
      expect(getHook().showSuccess).toBe(true);
      unmount();
    });

    it('sets showSuccess back to false', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setShowSuccess(true); });
      act(() => { getHook().setShowSuccess(false); });
      expect(getHook().showSuccess).toBe(false);
      unmount();
    });
  });

  describe('setCourtToMove', () => {
    it('sets courtToMove to a number', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setCourtToMove(3); });
      expect(getHook().courtToMove).toBe(3);
      unmount();
    });

    it('clears courtToMove back to null', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setCourtToMove(3); });
      act(() => { getHook().setCourtToMove(null); });
      expect(getHook().courtToMove).toBeNull();
      unmount();
    });
  });

  describe('setBallPriceCents', () => {
    it('updates ballPriceCents to a new value', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setBallPriceCents(650); });
      expect(getHook().ballPriceCents).toBe(650);
      unmount();
    });
  });

  describe('setBallPriceInput', () => {
    it('updates ballPriceInput string', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setBallPriceInput('6.50'); });
      expect(getHook().ballPriceInput).toBe('6.50');
      unmount();
    });
  });

  describe('setAvailableCourts', () => {
    it('updates availableCourts list', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setAvailableCourts([1, 3, 5]); });
      expect(getHook().availableCourts).toEqual([1, 3, 5]);
      unmount();
    });
  });

  describe('setData', () => {
    it('replaces data with a new object', () => {
      const { getHook, unmount } = createHarness();
      const newData = {
        courts: [{ id: 1 }, null],
        waitlist: [{ id: 'w1' }],
        blocks: [],
        upcomingBlocks: undefined,
        recentlyCleared: [],
      };
      act(() => { getHook().setData(newData as any); });
      expect(getHook().data.waitlist).toHaveLength(1);
      expect(getHook().data.courts[0]).toEqual({ id: 1 });
      unmount();
    });
  });

  describe('returned surface', () => {
    it('exports all expected keys', () => {
      const { getHook, unmount } = createHarness();
      const keys = Object.keys(getHook()).sort();
      const expected = [
        'availableCourts', 'ballPriceCents', 'ballPriceInput', 'courtToMove',
        'currentScreen', 'currentTime', 'data', 'operatingHours', 'setAvailableCourts',
        'setBallPriceCents', 'setBallPriceInput', 'setCourtToMove', 'setCurrentScreen',
        'setCurrentTime', 'setData', 'setIsUserTyping', 'setLastActivity',
        'setOperatingHours', 'setShowSuccess', 'showSuccess',
      ].sort();
      expect(keys).toEqual(expected);
      unmount();
    });
  });
});
