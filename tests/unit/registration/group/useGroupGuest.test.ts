/**
 * useGroupGuest -- hook coverage
 *
 * Tests initial state, all setters, composite handlers
 * (handleCancelGuest, handleSelectSponsor, handleRemovePlayer),
 * and reset functions (resetGuestForm vs resetGroup distinction).
 *
 * Uses React 18 createRoot harness (same pattern as useMemberSearch.test.ts).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useGroupGuest } from '../../../../src/registration/group/useGroupGuest';

// Harness

function createHarness() {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useGroupGuest();
    useImperativeHandle(ref, () => hook);
    return null;
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef();

  act(() => {
    root.render(React.createElement(Wrapper, { ref }));
  });

  return ref;
}

// Tests

describe('useGroupGuest', () => {
  let ref;

  beforeEach(() => {
    ref = createHarness();
  });

  // Initial state

  describe('initial state', () => {
    it('currentGroup defaults to empty array', () => {
      expect(ref.current.currentGroup).toEqual([]);
    });

    it('guestName defaults to empty string', () => {
      expect(ref.current.guestName).toBe('');
    });

    it('guestSponsor defaults to empty string', () => {
      expect(ref.current.guestSponsor).toBe('');
    });

    it('showGuestForm defaults to false', () => {
      expect(ref.current.showGuestForm).toBe(false);
    });

    it('showGuestNameError defaults to false', () => {
      expect(ref.current.showGuestNameError).toBe(false);
    });

    it('showSponsorError defaults to false', () => {
      expect(ref.current.showSponsorError).toBe(false);
    });
  });

  // Setters

  describe('setters', () => {
    it('setCurrentGroup updates currentGroup', () => {
      const players = [{ id: '1', name: 'Alice' }];
      act(() => { ref.current.setCurrentGroup(players); });
      expect(ref.current.currentGroup).toEqual(players);
    });

    it('setGuestName updates guestName', () => {
      act(() => { ref.current.setGuestName('Bob Guest'); });
      expect(ref.current.guestName).toBe('Bob Guest');
    });

    it('setGuestSponsor updates guestSponsor', () => {
      act(() => { ref.current.setGuestSponsor('1234'); });
      expect(ref.current.guestSponsor).toBe('1234');
    });

    it('setShowGuestForm updates showGuestForm', () => {
      act(() => { ref.current.setShowGuestForm(true); });
      expect(ref.current.showGuestForm).toBe(true);
    });

    it('setShowGuestNameError updates showGuestNameError', () => {
      act(() => { ref.current.setShowGuestNameError(true); });
      expect(ref.current.showGuestNameError).toBe(true);
    });

    it('setShowSponsorError updates showSponsorError', () => {
      act(() => { ref.current.setShowSponsorError(true); });
      expect(ref.current.showSponsorError).toBe(true);
    });
  });

  // handleRemovePlayer

  describe('handleRemovePlayer', () => {
    it('removes player at the given index', () => {
      const players = [{ id: '1' }, { id: '2' }, { id: '3' }];
      act(() => { ref.current.setCurrentGroup(players); });
      act(() => { ref.current.handleRemovePlayer(1); });
      expect(ref.current.currentGroup).toEqual([{ id: '1' }, { id: '3' }]);
    });

    it('removes first player (index 0)', () => {
      const players = [{ id: 'a' }, { id: 'b' }];
      act(() => { ref.current.setCurrentGroup(players); });
      act(() => { ref.current.handleRemovePlayer(0); });
      expect(ref.current.currentGroup).toEqual([{ id: 'b' }]);
    });

    it('removes last player', () => {
      const players = [{ id: 'x' }, { id: 'y' }];
      act(() => { ref.current.setCurrentGroup(players); });
      act(() => { ref.current.handleRemovePlayer(1); });
      expect(ref.current.currentGroup).toEqual([{ id: 'x' }]);
    });
  });

  // handleSelectSponsor

  describe('handleSelectSponsor', () => {
    it('sets guestSponsor to the given member number', () => {
      act(() => { ref.current.handleSelectSponsor('9876'); });
      expect(ref.current.guestSponsor).toBe('9876');
    });

    it('clears showSponsorError when a sponsor is selected', () => {
      act(() => { ref.current.setShowSponsorError(true); });
      act(() => { ref.current.handleSelectSponsor('5555'); });
      expect(ref.current.showSponsorError).toBe(false);
    });

    it('does not clear showGuestNameError (only sponsor error cleared)', () => {
      act(() => { ref.current.setShowGuestNameError(true); });
      act(() => { ref.current.handleSelectSponsor('5555'); });
      expect(ref.current.showGuestNameError).toBe(true);
    });
  });

  // handleCancelGuest

  describe('handleCancelGuest', () => {
    beforeEach(() => {
      act(() => {
        ref.current.setGuestName('Visitor');
        ref.current.setGuestSponsor('1234');
        ref.current.setShowGuestForm(true);
        ref.current.setShowGuestNameError(true);
        ref.current.setShowSponsorError(true);
      });
    });

    it('hides guest form', () => {
      act(() => { ref.current.handleCancelGuest(); });
      expect(ref.current.showGuestForm).toBe(false);
    });

    it('clears guestName', () => {
      act(() => { ref.current.handleCancelGuest(); });
      expect(ref.current.guestName).toBe('');
    });

    it('clears guestSponsor', () => {
      act(() => { ref.current.handleCancelGuest(); });
      expect(ref.current.guestSponsor).toBe('');
    });

    it('clears showGuestNameError', () => {
      act(() => { ref.current.handleCancelGuest(); });
      expect(ref.current.showGuestNameError).toBe(false);
    });

    it('clears showSponsorError', () => {
      act(() => { ref.current.handleCancelGuest(); });
      expect(ref.current.showSponsorError).toBe(false);
    });

    it('does not remove players from currentGroup', () => {
      const players = [{ id: '1', name: 'Alice' }];
      act(() => { ref.current.setCurrentGroup(players); });
      act(() => { ref.current.handleCancelGuest(); });
      expect(ref.current.currentGroup).toEqual(players);
    });
  });

  // resetGuestForm

  describe('resetGuestForm', () => {
    it('clears guest fields but preserves currentGroup', () => {
      const players = [{ id: '1' }];
      act(() => {
        ref.current.setCurrentGroup(players);
        ref.current.setGuestName('Guest');
        ref.current.setGuestSponsor('999');
        ref.current.setShowGuestForm(true);
        ref.current.setShowGuestNameError(true);
        ref.current.setShowSponsorError(true);
      });
      act(() => { ref.current.resetGuestForm(); });

      expect(ref.current.currentGroup).toEqual(players);
      expect(ref.current.guestName).toBe('');
      expect(ref.current.guestSponsor).toBe('');
      expect(ref.current.showGuestForm).toBe(false);
      expect(ref.current.showGuestNameError).toBe(false);
      expect(ref.current.showSponsorError).toBe(false);
    });
  });

  // resetGroup

  describe('resetGroup', () => {
    it('clears currentGroup AND all guest fields', () => {
      act(() => {
        ref.current.setCurrentGroup([{ id: '1' }]);
        ref.current.setGuestName('Guest');
        ref.current.setGuestSponsor('999');
        ref.current.setShowGuestForm(true);
        ref.current.setShowGuestNameError(true);
        ref.current.setShowSponsorError(true);
      });
      act(() => { ref.current.resetGroup(); });

      expect(ref.current.currentGroup).toEqual([]);
      expect(ref.current.guestName).toBe('');
      expect(ref.current.guestSponsor).toBe('');
      expect(ref.current.showGuestForm).toBe(false);
      expect(ref.current.showGuestNameError).toBe(false);
      expect(ref.current.showSponsorError).toBe(false);
    });

    it('differs from resetGuestForm: also empties currentGroup', () => {
      const players = [{ id: '1' }, { id: '2' }];
      act(() => { ref.current.setCurrentGroup(players); });

      // resetGuestForm preserves group
      act(() => { ref.current.resetGuestForm(); });
      expect(ref.current.currentGroup).toHaveLength(2);

      // resetGroup wipes group
      act(() => { ref.current.resetGroup(); });
      expect(ref.current.currentGroup).toHaveLength(0);
    });
  });
});
