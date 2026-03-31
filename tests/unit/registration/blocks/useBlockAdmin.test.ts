/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../../../../src/registration/handlers/adminOperations.js', () => ({
  handleBlockCreateOp: vi.fn().mockResolvedValue(undefined),
  handleCancelBlockOp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@lib', () => ({
  TENNIS_CONFIG: { DEVICES: { ADMIN_ID: 'admin-device-1' } },
}));

import { handleBlockCreateOp, handleCancelBlockOp } from '../../../../src/registration/handlers/adminOperations.js';
import { useBlockAdmin } from '../../../../src/registration/blocks/useBlockAdmin';

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    backend: { admin: { createBlock: vi.fn(), cancelBlock: vi.fn() } } as any,
    showAlertMessage: vi.fn(),
    getCourtData: vi.fn(() => ({ courts: [{ id: 'c1', number: 1 }] })),
    ...overrides,
  };
}

function createHarness(deps = makeDeps()) {
  const Wrapper = forwardRef(function Wrapper(_p: unknown, ref: React.Ref<unknown>) {
    const hook = useBlockAdmin(deps);
    useImperativeHandle(ref, () => hook);
    return null;
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef() as React.RefObject<ReturnType<typeof useBlockAdmin>>;
  act(() => { root.render(React.createElement(Wrapper as any, { ref })); });
  return { ref, deps };
}

describe('useBlockAdmin', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('initial state', () => {
    it('showBlockModal defaults to false', () => {
      const { ref } = createHarness();
      expect(ref.current!.showBlockModal).toBe(false);
    });
    it('blockingInProgress defaults to false', () => {
      const { ref } = createHarness();
      expect(ref.current!.blockingInProgress).toBe(false);
    });
    it('selectedCourtsToBlock defaults to empty array', () => {
      const { ref } = createHarness();
      expect(ref.current!.selectedCourtsToBlock).toEqual([]);
    });
    it('blockMessage defaults to empty string', () => {
      const { ref } = createHarness();
      expect(ref.current!.blockMessage).toBe('');
    });
    it('blockStartTime defaults to now', () => {
      const { ref } = createHarness();
      expect(ref.current!.blockStartTime).toBe('now');
    });
    it('blockEndTime defaults to empty string', () => {
      const { ref } = createHarness();
      expect(ref.current!.blockEndTime).toBe('');
    });
    it('blockWarningMinutes defaults to 0', () => {
      const { ref } = createHarness();
      expect(ref.current!.blockWarningMinutes).toBe(0);
    });
  });

  describe('setShowBlockModal', () => {
    it('true opens the modal', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setShowBlockModal(true); });
      expect(ref.current!.showBlockModal).toBe(true);
    });
    it('false closes the modal', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setShowBlockModal(true); });
      act(() => { ref.current!.setShowBlockModal(false); });
      expect(ref.current!.showBlockModal).toBe(false);
    });
    it('closing modal preserves blockingInProgress', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setBlockingInProgress(true); });
      act(() => { ref.current!.setShowBlockModal(false); });
      expect(ref.current!.blockingInProgress).toBe(true);
    });
  });
  describe('setSelectedCourtsToBlock', () => {
    it('updates selectedCourtsToBlock', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setSelectedCourtsToBlock([1, 3]); });
      expect(ref.current!.selectedCourtsToBlock).toEqual([1, 3]);
    });
  });
  describe('setBlockMessage', () => {
    it('updates blockMessage', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setBlockMessage('WET COURT'); });
      expect(ref.current!.blockMessage).toBe('WET COURT');
    });
  });
  describe('setBlockStartTime', () => {
    it('updates blockStartTime', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setBlockStartTime('09:00'); });
      expect(ref.current!.blockStartTime).toBe('09:00');
    });
  });
  describe('setBlockEndTime', () => {
    it('updates blockEndTime', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setBlockEndTime('17:00'); });
      expect(ref.current!.blockEndTime).toBe('17:00');
    });
  });
  describe('setBlockWarningMinutes', () => {
    it('updates blockWarningMinutes', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setBlockWarningMinutes(15); });
      expect(ref.current!.blockWarningMinutes).toBe(15);
    });
  });
  describe('setBlockingInProgress', () => {
    it('sets to true', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setBlockingInProgress(true); });
      expect(ref.current!.blockingInProgress).toBe(true);
    });
    it('sets to false', () => {
      const { ref } = createHarness();
      act(() => { ref.current!.setBlockingInProgress(true); });
      act(() => { ref.current!.setBlockingInProgress(false); });
      expect(ref.current!.blockingInProgress).toBe(false);
    });
  });
  describe('onBlockCreate', () => {
    it('passes current state to handleBlockCreateOp', async () => {
      const deps = makeDeps();
      const { ref } = createHarness(deps);
      act(() => {
        ref.current!.setSelectedCourtsToBlock([2]);
        ref.current!.setBlockMessage('LESSON');
        ref.current!.setBlockStartTime('10:00');
        ref.current!.setBlockEndTime('12:00');
      });
      await act(async () => { await ref.current!.onBlockCreate(); });
      expect(handleBlockCreateOp).toHaveBeenCalledTimes(1);
      const arg = (handleBlockCreateOp as any).mock.calls[0][0];
      expect(arg.backend).toBe(deps.backend);
      expect(arg.getCourtData).toBe(deps.getCourtData);
      expect(arg.showAlertMessage).toBe(deps.showAlertMessage);
      expect(arg.selectedCourtsToBlock).toEqual([2]);
      expect(arg.blockMessage).toBe('LESSON');
      expect(arg.blockStartTime).toBe('10:00');
      expect(arg.blockEndTime).toBe('12:00');
    });
    it('setBlockingInProgress callback updates hook state', async () => {
      const { ref } = createHarness();
      await act(async () => { await ref.current!.onBlockCreate(); });
      const arg = (handleBlockCreateOp as any).mock.calls[0][0];
      act(() => { arg.setBlockingInProgress(true); });
      expect(ref.current!.blockingInProgress).toBe(true);
    });
  });
  describe('onCancelBlock', () => {
    it('delegates to handleCancelBlockOp with correct args', async () => {
      const deps = makeDeps();
      const { ref } = createHarness(deps);
      await act(async () => { await ref.current!.onCancelBlock('block-42', 3); });
      expect(handleCancelBlockOp).toHaveBeenCalledTimes(1);
      const args = (handleCancelBlockOp as any).mock.calls[0];
      expect(args[0].backend).toBe(deps.backend);
      expect(args[0].showAlertMessage).toBe(deps.showAlertMessage);
      expect(args[1]).toBe('block-42');
      expect(args[2]).toBe(3);
    });
  });
});