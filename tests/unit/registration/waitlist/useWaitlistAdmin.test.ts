/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../../../../src/registration/handlers/adminOperations.js', () => ({
  handleReorderWaitlistOp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@lib', () => ({
  TENNIS_CONFIG: { DEVICES: { ADMIN_ID: 'admin-device-1' } },
}));

import { handleReorderWaitlistOp } from '../../../../src/registration/handlers/adminOperations.js';
import { useWaitlistAdmin } from '../../../../src/registration/waitlist/useWaitlistAdmin';

function makeDeps(overrides = {}) {
  return {
    backend: { admin: { reorderWaitlist: vi.fn().mockResolvedValue({ ok: true }) } },
    showAlertMessage: vi.fn(),
    getCourtData: vi.fn(() => ({ waitlist: [{ id: 'w1' }, { id: 'w2' }] })),
    ...overrides,
  };
}

function createHarness(deps = makeDeps()) {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useWaitlistAdmin(deps);
    useImperativeHandle(ref, () => hook);
    return null;
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<ReturnType<typeof useWaitlistAdmin>>() as { current: ReturnType<typeof useWaitlistAdmin> };
  act(() => { root.render(React.createElement(Wrapper, { ref })); });
  return { ref, deps, root, container };
}

describe('useWaitlistAdmin', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('initial state', () => {
    it('waitlistMoveFrom defaults to null', () => {
      const { ref } = createHarness();
      expect(ref.current.waitlistMoveFrom).toBeNull();
    });
  });

  describe('setWaitlistMoveFrom', () => {
    it('sets waitlistMoveFrom to a number', () => {
      const { ref } = createHarness();
      act(() => { ref.current.setWaitlistMoveFrom(2); });
      expect(ref.current.waitlistMoveFrom).toBe(2);
    });

    it('sets waitlistMoveFrom to zero', () => {
      const { ref } = createHarness();
      act(() => { ref.current.setWaitlistMoveFrom(0); });
      expect(ref.current.waitlistMoveFrom).toBe(0);
    });

    it('resets waitlistMoveFrom to null', () => {
      const { ref } = createHarness();
      act(() => { ref.current.setWaitlistMoveFrom(3); });
      act(() => { ref.current.setWaitlistMoveFrom(null); });
      expect(ref.current.waitlistMoveFrom).toBeNull();
    });

    it('updates state across multiple calls', () => {
      const { ref } = createHarness();
      act(() => { ref.current.setWaitlistMoveFrom(1); });
      expect(ref.current.waitlistMoveFrom).toBe(1);
      act(() => { ref.current.setWaitlistMoveFrom(5); });
      expect(ref.current.waitlistMoveFrom).toBe(5);
    });
  });

  describe('onReorderWaitlist', () => {
    it('delegates to handleReorderWaitlistOp with correct args', async () => {
      const deps = makeDeps();
      const { ref } = createHarness(deps);
      await act(async () => { await ref.current.onReorderWaitlist(0, 2); });
      expect(handleReorderWaitlistOp).toHaveBeenCalledTimes(1);
      const [ctx, fromIndex, toIndex] = handleReorderWaitlistOp.mock.calls[0];
      expect(ctx.backend).toBe(deps.backend);
      expect(ctx.getCourtData).toBe(deps.getCourtData);
      expect(ctx.showAlertMessage).toBe(deps.showAlertMessage);
      expect(fromIndex).toBe(0);
      expect(toIndex).toBe(2);
    });

    it('passes setWaitlistMoveFrom that updates hook state to null', async () => {
      const deps = makeDeps();
      const { ref } = createHarness(deps);
      await act(async () => { await ref.current.onReorderWaitlist(1, 3); });
      const [ctx] = handleReorderWaitlistOp.mock.calls[0];
      act(() => { ctx.setWaitlistMoveFrom(null); });
      expect(ref.current.waitlistMoveFrom).toBeNull();
    });

    it('passes setWaitlistMoveFrom that can set a number', async () => {
      const deps = makeDeps();
      const { ref } = createHarness(deps);
      await act(async () => { await ref.current.onReorderWaitlist(0, 1); });
      const [ctx] = handleReorderWaitlistOp.mock.calls[0];
      act(() => { ctx.setWaitlistMoveFrom(7); });
      expect(ref.current.waitlistMoveFrom).toBe(7);
    });

    it('forwards reversed fromIndex and toIndex correctly', async () => {
      const deps = makeDeps();
      const { ref } = createHarness(deps);
      await act(async () => { await ref.current.onReorderWaitlist(2, 0); });
      const [, fromIndex, toIndex] = handleReorderWaitlistOp.mock.calls[0];
      expect(fromIndex).toBe(2);
      expect(toIndex).toBe(0);
    });
  });

  describe('returned surface', () => {
    it('exposes exactly waitlistMoveFrom, setWaitlistMoveFrom, onReorderWaitlist', () => {
      const { ref } = createHarness();
      const keys = Object.keys(ref.current).sort();
      expect(keys).toEqual(['onReorderWaitlist', 'setWaitlistMoveFrom', 'waitlistMoveFrom']);
    });

    it('setWaitlistMoveFrom is a function', () => {
      const { ref } = createHarness();
      expect(typeof ref.current.setWaitlistMoveFrom).toBe('function');
    });

    it('onReorderWaitlist is a function', () => {
      const { ref } = createHarness();
      expect(typeof ref.current.onReorderWaitlist).toBe('function');
    });
  });
});
