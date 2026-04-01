/**
 * useMemberIdentity — hook coverage
 *
 * Tests fetchFrequentPartners cache logic (skip when loading, cache hit,
 * cache miss, API transform, error path), guard (no memberId / no backend),
 * setters, clearCache, resetMemberIdentity vs resetMemberIdentityWithCache.
 *
 * Uses minimal React wrapper pattern (no renderHook dependency).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// Suppress logger noise in tests
vi.mock('../../../../src/lib/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useMemberIdentity } from '../../../../src/registration/memberIdentity/useMemberIdentity';

// ============================================================
// Test harness
// ============================================================

function makeBackend(overrides = {}) {
  return {
    queries: {
      getFrequentPartners: vi.fn().mockResolvedValue({
        ok: true,
        partners: [
          {
            member_id: 'uuid-1',
            display_name: 'Alice Smith',
            member_number: '1001',
            play_count: 5,
          },
        ],
      }),
      ...overrides,
    },
  };
}

function createHarness(backend) {
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useMemberIdentity({ backend });
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

  return {
    get hook() { return ref.current; },
    cleanup() {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// A) Guards
// ============================================================

describe('fetchFrequentPartners — guards', () => {
  it('does nothing when memberId is empty string', async () => {
    const backend = makeBackend();
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners(''); });
    expect(backend.queries.getFrequentPartners).not.toHaveBeenCalled();
    h.cleanup();
  });

  it('does nothing when backend is null', async () => {
    const h = createHarness(null);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(h.hook.frequentPartners).toEqual([]);
    h.cleanup();
  });

  it('does nothing when backend is undefined', async () => {
    const h = createHarness(undefined);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(h.hook.frequentPartners).toEqual([]);
    h.cleanup();
  });
});

// ============================================================
// B) Successful fetch
// ============================================================

describe('fetchFrequentPartners — successful fetch', () => {
  it('transforms API partners to { player, count } shape', async () => {
    const backend = makeBackend();
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(h.hook.frequentPartners).toEqual([{
      player: { id: 'uuid-1', name: 'Alice Smith', memberNumber: '1001', memberId: 'uuid-1' },
      count: 5,
    }]);
    h.cleanup();
  });

  it('sets frequentPartnersLoading to false after success', async () => {
    const backend = makeBackend();
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(h.hook.frequentPartnersLoading).toBe(false);
    h.cleanup();
  });

  it('sets frequentPartners to empty array when ok:false', async () => {
    const backend = makeBackend({ getFrequentPartners: vi.fn().mockResolvedValue({ ok: false }) });
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(h.hook.frequentPartners).toEqual([]);
    expect(h.hook.frequentPartnersLoading).toBe(false);
    h.cleanup();
  });
});

// ============================================================
// C) Error path
// ============================================================

describe('fetchFrequentPartners — error path', () => {
  it('clears frequentPartners and stops loading when API throws', async () => {
    const backend = makeBackend({ getFrequentPartners: vi.fn().mockRejectedValue(new Error('Network error')) });
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(h.hook.frequentPartners).toEqual([]);
    expect(h.hook.frequentPartnersLoading).toBe(false);
    h.cleanup();
  });
});

// ============================================================
// D) Cache behaviour
// ============================================================

describe('fetchFrequentPartners — cache', () => {
  it('skips API call if already loading (in-flight dedup)', async () => {
    let resolveFirst: (value: unknown) => void;
    const firstCall = new Promise((res) => { resolveFirst = res; });
    const backend = makeBackend({
      getFrequentPartners: vi.fn()
        .mockReturnValueOnce(firstCall)
        .mockResolvedValue({ ok: true, partners: [] }),
    });
    const h = createHarness(backend);
    act(() => { void h.hook.fetchFrequentPartners('uuid-1'); });
    await act(async () => {
      await h.hook.fetchFrequentPartners('uuid-1');
    });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFirst({ ok: true, partners: [] });
      await new Promise((r) => setTimeout(r, 0));
    });
    h.cleanup();
  });

  it('uses cached data on second call within TTL', async () => {
    const backend = makeBackend();
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(1);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(1);
    h.cleanup();
  });

  it('re-fetches after clearCache is called', async () => {
    const backend = makeBackend();
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(1);
    act(() => h.hook.clearCache());
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(2);
    h.cleanup();
  });
});

// ============================================================
// E) Resets
// ============================================================

describe('resetMemberIdentity — does NOT clear cache', () => {
  it('resets memberNumber to empty string', () => {
    const h = createHarness(null);
    act(() => h.hook.setMemberNumber('12345'));
    act(() => h.hook.resetMemberIdentity());
    expect(h.hook.memberNumber).toBe('');
    h.cleanup();
  });

  it('resets currentMemberId to null', () => {
    const h = createHarness(null);
    act(() => h.hook.setCurrentMemberId('uuid-99'));
    act(() => h.hook.resetMemberIdentity());
    expect(h.hook.currentMemberId).toBeNull();
    h.cleanup();
  });

  it('does NOT clear cache on timeout-style reset (cache survives)', async () => {
    const backend = makeBackend();
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(1);
    act(() => h.hook.resetMemberIdentity());
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(1);
    h.cleanup();
  });
});

describe('resetMemberIdentityWithCache — clears cache', () => {
  it('resets memberNumber and currentMemberId', () => {
    const h = createHarness(null);
    act(() => h.hook.setMemberNumber('99'));
    act(() => h.hook.setCurrentMemberId('uuid-x'));
    act(() => h.hook.resetMemberIdentityWithCache());
    expect(h.hook.memberNumber).toBe('');
    expect(h.hook.currentMemberId).toBeNull();
    h.cleanup();
  });

  it('clears cache so next fetch hits the API again', async () => {
    const backend = makeBackend();
    const h = createHarness(backend);
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(1);
    act(() => h.hook.resetMemberIdentityWithCache());
    await act(async () => { await h.hook.fetchFrequentPartners('uuid-1'); });
    expect(backend.queries.getFrequentPartners).toHaveBeenCalledTimes(2);
    h.cleanup();
  });
});

// ============================================================
// F) Setters update state
// ============================================================

describe('setters', () => {
  it('setMemberNumber updates memberNumber', () => {
    const h = createHarness(null);
    act(() => h.hook.setMemberNumber('A999'));
    expect(h.hook.memberNumber).toBe('A999');
    h.cleanup();
  });

  it('setCurrentMemberId updates currentMemberId', () => {
    const h = createHarness(null);
    act(() => h.hook.setCurrentMemberId('uuid-42'));
    expect(h.hook.currentMemberId).toBe('uuid-42');
    h.cleanup();
  });

  it('setFrequentPartners updates frequentPartners', () => {
    const h = createHarness(null);
    const partners = [{ player: { id: 'x' }, count: 3 }];
    act(() => h.hook.setFrequentPartners(partners));
    expect(h.hook.frequentPartners).toEqual(partners);
    h.cleanup();
  });

  it('setFrequentPartnersLoading toggles frequentPartnersLoading', () => {
    const h = createHarness(null);
    act(() => h.hook.setFrequentPartnersLoading(true));
    expect(h.hook.frequentPartnersLoading).toBe(true);
    act(() => h.hook.setFrequentPartnersLoading(false));
    expect(h.hook.frequentPartnersLoading).toBe(false);
    h.cleanup();
  });
});