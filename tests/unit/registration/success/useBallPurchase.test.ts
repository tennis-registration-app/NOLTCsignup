/**
 * useBallPurchase — behavioral coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBallPurchase from '../../../../src/registration/screens/success/useBallPurchase.js';

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../src/lib/TennisCourtDataStore.js', () => ({
  getDataStore: () => null,
}));

vi.mock('../../../../src/platform/prefsStorage.js', () => ({
  getCache: vi.fn(() => []),
  setCache: vi.fn(),
}));

const getLastFourDigits = (n: any) => (n ? String(n).slice(-4) : '****');

function makePlayer(overrides = {}) {
  return { name: 'Alice', memberNumber: '1001', accountId: 'acct-1001', isGuest: false, ...overrides };
}

function makeGuest() {
  return { name: 'Guest', memberNumber: null, accountId: null, isGuest: true };
}

function setup(overrides = {}) {
  const onPurchaseBalls = vi.fn().mockResolvedValue({ ok: true });
  const onLookupMemberAccount = vi.fn();

  const defaults = {
    ballPrice: 6,
    splitPrice: 3,
    currentGroup: [makePlayer()],
    justAssignedCourt: 3,
    sessionIdProp: 'sess-abc',
    assignedCourt: { session: { id: 'sess-abc' } },
    onPurchaseBalls,
    onLookupMemberAccount,
    getLastFourDigits,
  };

  const merged = { ...defaults, ...overrides };
  const hookResult = renderHook(() => useBallPurchase(merged));
  return { hookResult, onPurchaseBalls, onLookupMemberAccount };
}

describe('initial state', () => {
  it('showBallPurchaseModal is false', () => {
    const { hookResult } = setup();
    expect(hookResult.result.current.showBallPurchaseModal).toBe(false);
  });

  it('ballsPurchased is false', () => {
    const { hookResult } = setup();
    expect(hookResult.result.current.ballsPurchased).toBe(false);
  });

  it('isProcessingPurchase is false', () => {
    const { hookResult } = setup();
    expect(hookResult.result.current.isProcessingPurchase).toBe(false);
  });

  it('purchaseDetails is null', () => {
    const { hookResult } = setup();
    expect(hookResult.result.current.purchaseDetails).toBeNull();
  });

  it('ballPurchaseOption is empty string', () => {
    const { hookResult } = setup();
    expect(hookResult.result.current.ballPurchaseOption).toBe('');
  });
});

describe('double-submit guard', () => {
  it('ignores a second call while a purchase is in progress', async () => {
    let resolveFirst: (value: unknown) => void;
    const slowPurchase = vi.fn(
      () => new Promise((res) => { resolveFirst = res; })
    );

    const { hookResult } = setup({ onPurchaseBalls: slowPurchase });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });

    act(() => { hookResult.result.current.handleBallPurchase(); });

    await act(async () => {
      await hookResult.result.current.handleBallPurchase();
    });

    await act(async () => { resolveFirst({ ok: true }); });

    expect(slowPurchase).toHaveBeenCalledTimes(1);
  });
});

describe('sessionId resolution', () => {
  it('prefers sessionIdProp over assignedCourt.session.id', async () => {
    const { hookResult, onPurchaseBalls } = setup({
      sessionIdProp: 'prop-session',
      assignedCourt: { session: { id: 'court-session' } },
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(onPurchaseBalls.mock.calls[0][0]).toBe('prop-session');
  });

  it('falls back to assignedCourt.session.id when sessionIdProp is null', async () => {
    const { hookResult, onPurchaseBalls } = setup({
      sessionIdProp: null,
      assignedCourt: { session: { id: 'court-session-fallback' } },
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(onPurchaseBalls.mock.calls[0][0]).toBe('court-session-fallback');
  });
});

describe('accountId lookup via onLookupMemberAccount', () => {
  it('uses accountId from group when available — no lookup needed', async () => {
    const { hookResult, onPurchaseBalls, onLookupMemberAccount } = setup({
      currentGroup: [makePlayer({ accountId: 'acct-direct' })],
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(onLookupMemberAccount).not.toHaveBeenCalled();
    expect(onPurchaseBalls.mock.calls[0][1]).toBe('acct-direct');
  });

  it('looks up accountId when not present in group', async () => {
    const lookup = vi.fn().mockResolvedValue([{ accountId: 'looked-up-acct', isPrimary: true }]);

    const { hookResult, onPurchaseBalls } = setup({
      currentGroup: [makePlayer({ accountId: undefined })],
      onLookupMemberAccount: lookup,
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(lookup).toHaveBeenCalledWith('1001');
    expect(onPurchaseBalls.mock.calls[0][1]).toBe('looked-up-acct');
  });

  it('uses first result when no isPrimary member found', async () => {
    const lookup = vi.fn().mockResolvedValue([
      { accountId: 'acct-first', isPrimary: false },
      { accountId: 'acct-second', isPrimary: false },
    ]);

    const { hookResult, onPurchaseBalls } = setup({
      currentGroup: [makePlayer({ accountId: undefined })],
      onLookupMemberAccount: lookup,
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(onPurchaseBalls.mock.calls[0][1]).toBe('acct-first');
  });
});

describe('purchaseDetails', () => {
  it('sets type=single with primary last4 for charge mode', async () => {
    const { hookResult } = setup({
      currentGroup: [makePlayer({ memberNumber: '99991001' })],
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(hookResult.result.current.purchaseDetails).toEqual({
      type: 'single',
      amount: 6,
      accounts: ['1001'],
    });
  });

  it('sets type=split with last4 of all non-guest players', async () => {
    const { hookResult } = setup({
      ballPrice: 6,
      splitPrice: 2,
      currentGroup: [
        makePlayer({ memberNumber: '1001', accountId: 'acct-1', name: 'P1' }),
        makePlayer({ memberNumber: '1002', accountId: 'acct-2', name: 'P2' }),
        makeGuest(),
      ],
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('split'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(hookResult.result.current.purchaseDetails).toEqual({
      type: 'split',
      amount: 2,
      accounts: ['1001', '1002'],
    });
  });
});

describe('successful purchase (API path)', () => {
  it('sets ballsPurchased=true and closes modal on ok:true', async () => {
    const { hookResult } = setup();

    act(() => {
      hookResult.result.current.setShowBallPurchaseModal(true);
      hookResult.result.current.setBallPurchaseOption('charge');
    });

    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(hookResult.result.current.ballsPurchased).toBe(true);
    expect(hookResult.result.current.showBallPurchaseModal).toBe(false);
  });

  it('resets isProcessingPurchase to false after success', async () => {
    const { hookResult } = setup();

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(hookResult.result.current.isProcessingPurchase).toBe(false);
  });
});

describe('API ok:false — localStorage fallback', () => {
  it('falls back to localStorage and still sets ballsPurchased=true on ok:false', async () => {
    // When API returns ok:false the code falls through to the localStorage fallback path
    // which calls setBallsPurchased(true) at the end.
    const failingPurchase = vi.fn().mockResolvedValue({ ok: false, message: 'declined' });

    const { hookResult } = setup({ onPurchaseBalls: failingPurchase });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    // Fallback path sets purchased = true
    expect(hookResult.result.current.ballsPurchased).toBe(true);
  });

  it('writes to cache (localStorage fallback) when API returns ok:false', async () => {
    const failingPurchase = vi.fn().mockResolvedValue({ ok: false });
    const { setCache } = await import('../../../../src/platform/prefsStorage.js');

    const { hookResult } = setup({ onPurchaseBalls: failingPurchase });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(setCache).toHaveBeenCalled();
  });

  it('resets isProcessingPurchase to false even when API returns ok:false', async () => {
    const failingPurchase = vi.fn().mockResolvedValue({ ok: false });

    const { hookResult } = setup({ onPurchaseBalls: failingPurchase });

    act(() => { hookResult.result.current.setBallPurchaseOption('charge'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    expect(hookResult.result.current.isProcessingPurchase).toBe(false);
  });
});

describe('split fallback to single when not enough account IDs', () => {
  it('sends splitAccountIds=null when only 1 non-guest resolves an accountId', async () => {
    const lookup = vi.fn()
      .mockResolvedValueOnce([{ accountId: 'acct-1', isPrimary: true }])
      .mockResolvedValueOnce([]);

    const { hookResult, onPurchaseBalls } = setup({
      currentGroup: [
        makePlayer({ accountId: undefined, memberNumber: '2001', name: 'P1' }),
        makePlayer({ accountId: undefined, memberNumber: '2002', name: 'P2' }),
      ],
      onLookupMemberAccount: lookup,
    });

    act(() => { hookResult.result.current.setBallPurchaseOption('split'); });
    await act(async () => { await hookResult.result.current.handleBallPurchase(); });

    const [, , options] = onPurchaseBalls.mock.calls[0];
    expect(options.splitAccountIds).toBeNull();
  });
});
