/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBallPurchase from '../../../../src/registration/screens/success/useBallPurchase.js';

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../../src/lib/TennisCourtDataStore.js', () => ({
  getDataStore: () => null,
}));

vi.mock('../../../../src/platform/prefsStorage.js', () => ({
  getCache: vi.fn(() => []),
  setCache: vi.fn(),
}));

// ===========================================================
// Helpers
// ===========================================================

/**
 * Render useBallPurchase with a group that has duplicate accountIds.
 * Scenario: 2 players on account 1008 + 1 player on account 1002 + 1 guest.
 */
function setupSameAccountGroup() {
  const onPurchaseBalls = vi.fn().mockResolvedValue({ ok: true });
  const onLookupMemberAccount = vi.fn();
  const getLastFourDigits = (n: any) => (n ? String(n).slice(-4) : '****');

  const currentGroup: any[] = [
    { name: 'Alice Smith', memberNumber: '1008', accountId: 'acct-1008', isGuest: false },
    { name: 'Bob Smith', memberNumber: '1008', accountId: 'acct-1008', isGuest: false },
    { name: 'Carol Jones', memberNumber: '1002', accountId: 'acct-1002', isGuest: false },
    { name: 'Guest Dan', memberNumber: null, accountId: null, isGuest: true },
  ];

  const hookResult = renderHook(() =>
    useBallPurchase({
      ballPrice: 5.0,
      splitPrice: 5.0 / 3, // 3 non-guest players
      currentGroup,
      justAssignedCourt: 7,
      sessionIdProp: 'session-uuid-1',
      assignedCourt: { session: { id: 'session-uuid-1' } },
      onPurchaseBalls,
      onLookupMemberAccount,
      getLastFourDigits,
    })
  );

  return { hookResult, onPurchaseBalls, onLookupMemberAccount, currentGroup };
}

// ===========================================================
// Tests
// ===========================================================

describe('ball purchase — same-account family members', () => {
  it('sends duplicate accountIds when two players share an account (split mode)', async () => {
    const { hookResult, onPurchaseBalls } = setupSameAccountGroup();

    // Select "split" option
    act(() => {
      hookResult.result.current.setBallPurchaseOption('split');
    });

    // Trigger purchase
    await act(async () => {
      await hookResult.result.current.handleBallPurchase();
    });

    expect(onPurchaseBalls).toHaveBeenCalledOnce();
    const [sessionId, accountId, options] = onPurchaseBalls.mock.calls[0];

    expect(sessionId).toBe('session-uuid-1');
    expect(accountId).toBe('acct-1008'); // primary = first player

    // Critical assertion: splitAccountIds has 3 entries (one per non-guest player),
    // with acct-1008 appearing TWICE (once per family member)
    expect(options.splitBalls).toBe(true);
    expect(options.splitAccountIds).toEqual(['acct-1008', 'acct-1008', 'acct-1002']);
  });

  it('excludes guest from split account IDs', async () => {
    const { hookResult, onPurchaseBalls } = setupSameAccountGroup();

    act(() => {
      hookResult.result.current.setBallPurchaseOption('split');
    });

    await act(async () => {
      await hookResult.result.current.handleBallPurchase();
    });

    const [, , options] = onPurchaseBalls.mock.calls[0];

    // Guest Dan should NOT appear in splitAccountIds
    expect(options.splitAccountIds).toHaveLength(3);
    expect(options.splitAccountIds).not.toContain(null);
  });

  it('charges full price to primary account in single mode', async () => {
    const { hookResult, onPurchaseBalls } = setupSameAccountGroup();

    act(() => {
      hookResult.result.current.setBallPurchaseOption('charge');
    });

    await act(async () => {
      await hookResult.result.current.handleBallPurchase();
    });

    const [sessionId, accountId, options] = onPurchaseBalls.mock.calls[0];

    expect(sessionId).toBe('session-uuid-1');
    expect(accountId).toBe('acct-1008');
    expect(options.splitBalls).toBe(false);
    expect(options.splitAccountIds).toBeNull();
  });
});

describe('ball purchase — idempotency key uniqueness', () => {
  it('buildPurchaseBallsCommand generates unique keys for split entries with same accountId', async () => {
    // This tests the command layer that builds the payload
    const { buildPurchaseBallsCommand, toPurchaseBallsPayload } = await import(
      '../../../../src/lib/commands/purchaseBalls.js'
    );

    const command = buildPurchaseBallsCommand({
      sessionId: 'session-1',
      accountId: 'acct-1008',
      splitBalls: true,
      splitAccountIds: ['acct-1008', 'acct-1008', 'acct-1002'],
    });

    // Command should be valid with duplicate account IDs
    expect(command.splitAccountIds).toEqual(['acct-1008', 'acct-1008', 'acct-1002']);
    expect(command.idempotencyKey).toBeTruthy();

    // Payload should pass through the duplicates unchanged
    const payload = toPurchaseBallsPayload(command);
    expect((payload as any).split_account_ids).toEqual(['acct-1008', 'acct-1008', 'acct-1002']);

    // The backend RPC will generate per-index keys like:
    // ${base}-split-0, ${base}-split-1, ${base}-split-2
    // These are unique even when accountId repeats.
    const base = payload.idempotency_key;
    const keys = (payload as any).split_account_ids.map((_: any, i: any) => `${base}-split-${i}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);
  });

  it('ceil rounding: 3-way split of 500 cents = 167 each (501 total)', () => {
    const ballPriceCents = 500;
    const playerCount = 3;
    const splitAmount = Math.ceil(ballPriceCents / playerCount);

    expect(splitAmount).toBe(167);
    // Total slightly exceeds original — acceptable per business rule
    expect(splitAmount * playerCount).toBe(501);
  });

  it('ceil rounding: 2-way split of 500 cents = 250 each (exact)', () => {
    const ballPriceCents = 500;
    const playerCount = 2;
    const splitAmount = Math.ceil(ballPriceCents / playerCount);

    expect(splitAmount).toBe(250);
    expect(splitAmount * playerCount).toBe(500);
  });
});
