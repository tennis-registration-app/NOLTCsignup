/**
 * useCourtAssignmentResult hook — coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useCourtAssignmentResult } from '../../../../src/registration/court/useCourtAssignmentResult';

function createHarness() {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useCourtAssignmentResult();
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

describe('useCourtAssignmentResult', () => {
  describe('initial state', () => {
    it('has justAssignedCourt=null, assignedSessionId=null, assignedEndTime=null, hasAssignedCourt=false', () => {
      const { getHook, unmount } = createHarness();
      expect(getHook().justAssignedCourt).toBeNull();
      expect(getHook().assignedSessionId).toBeNull();
      expect(getHook().assignedEndTime).toBeNull();
      expect(getHook().hasAssignedCourt).toBe(false);
      unmount();
    });
  });

  describe('setJustAssignedCourt', () => {
    it('sets a court number', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setJustAssignedCourt(5); });
      expect(getHook().justAssignedCourt).toBe(5);
      unmount();
    });

    it('clears court number back to null', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setJustAssignedCourt(3); });
      act(() => { getHook().setJustAssignedCourt(null); });
      expect(getHook().justAssignedCourt).toBeNull();
      unmount();
    });
  });

  describe('setAssignedSessionId', () => {
    it('sets session id string', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setAssignedSessionId('session-abc-123'); });
      expect(getHook().assignedSessionId).toBe('session-abc-123');
      unmount();
    });

    it('clears session id to null', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setAssignedSessionId('session-xyz'); });
      act(() => { getHook().setAssignedSessionId(null); });
      expect(getHook().assignedSessionId).toBeNull();
      unmount();
    });
  });

  describe('setAssignedEndTime', () => {
    it('sets end time string', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setAssignedEndTime('2026-03-30T14:00:00Z'); });
      expect(getHook().assignedEndTime).toBe('2026-03-30T14:00:00Z');
      unmount();
    });

    it('clears end time to null', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setAssignedEndTime('2026-03-30T14:00:00Z'); });
      act(() => { getHook().setAssignedEndTime(null); });
      expect(getHook().assignedEndTime).toBeNull();
      unmount();
    });
  });

  describe('setHasAssignedCourt', () => {
    it('sets to true', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setHasAssignedCourt(true); });
      expect(getHook().hasAssignedCourt).toBe(true);
      unmount();
    });

    it('sets back to false', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setHasAssignedCourt(true); });
      act(() => { getHook().setHasAssignedCourt(false); });
      expect(getHook().hasAssignedCourt).toBe(false);
      unmount();
    });
  });

  describe('resetCourtAssignmentResult', () => {
    it('resets all fields to initial values', () => {
      const { getHook, unmount } = createHarness();
      act(() => { getHook().setJustAssignedCourt(7); });
      act(() => { getHook().setAssignedSessionId('session-reset'); });
      act(() => { getHook().setAssignedEndTime('2026-03-30T15:00:00Z'); });
      act(() => { getHook().setHasAssignedCourt(true); });
      act(() => { getHook().resetCourtAssignmentResult(); });
      expect(getHook().justAssignedCourt).toBeNull();
      expect(getHook().assignedSessionId).toBeNull();
      expect(getHook().assignedEndTime).toBeNull();
      expect(getHook().hasAssignedCourt).toBe(false);
      unmount();
    });

    it('does not affect other hook instances (isolated state)', () => {
      const { getHook: getHookA, unmount: unmountA } = createHarness();
      const { getHook: getHookB, unmount: unmountB } = createHarness();
      act(() => { getHookA().setJustAssignedCourt(2); });
      act(() => { getHookB().setJustAssignedCourt(9); });
      act(() => { getHookA().resetCourtAssignmentResult(); });
      expect(getHookA().justAssignedCourt).toBeNull();
      expect(getHookB().justAssignedCourt).toBe(9);
      unmountA();
      unmountB();
    });
  });

  describe('returned surface', () => {
    it('exposes all expected keys', () => {
      const { getHook, unmount } = createHarness();
      const hook = getHook();
      const keys = Object.keys(hook).sort();
      expect(keys).toEqual([
        'assignedEndTime',
        'assignedSessionId',
        'hasAssignedCourt',
        'justAssignedCourt',
        'resetCourtAssignmentResult',
        'setAssignedEndTime',
        'setAssignedSessionId',
        'setHasAssignedCourt',
        'setJustAssignedCourt',
      ]);
      unmount();
    });

    it('all setters and reset are callable functions', () => {
      const { getHook, unmount } = createHarness();
      const hook = getHook();
      expect(typeof hook.setJustAssignedCourt).toBe('function');
      expect(typeof hook.setAssignedSessionId).toBe('function');
      expect(typeof hook.setAssignedEndTime).toBe('function');
      expect(typeof hook.setHasAssignedCourt).toBe('function');
      expect(typeof hook.resetCourtAssignmentResult).toBe('function');
      unmount();
    });
  });
});
