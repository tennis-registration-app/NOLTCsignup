/**
 * adminHandlers (registration) — comprehensive callback tests
 *
 * Tests every exported callback from useAdminHandlers:
 *   handleClearAllCourts, handleAdminClearCourt, handleMoveCourt,
 *   handleClearWaitlist, handleRemoveFromWaitlist,
 *   handlePriceUpdate, handleExitAdmin
 *
 * The first 5 are pure delegations to adminOperations functions.
 * handlePriceUpdate has validation guards and a try/catch.
 * handleExitAdmin is a simple setter.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRegistrationAdminHandlerDeps,
  renderHandlerHook,
} from '../../../../helpers/handlerTestHarness.js';
import { useAdminHandlers } from '../../../../../src/registration/appHandlers/handlers/adminHandlers.js';

// ---- module mocks ----
const mockHandleClearAllCourtsOp = vi.fn().mockResolvedValue(undefined);
const mockHandleAdminClearCourtOp = vi.fn().mockResolvedValue(undefined);
const mockHandleMoveCourtOp = vi.fn().mockResolvedValue(undefined);
const mockHandleClearWaitlistOp = vi.fn().mockResolvedValue(undefined);
const mockHandleRemoveFromWaitlistOp = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../../../src/registration/handlers/adminOperations', () => ({
  handleClearAllCourtsOp: (...args) => mockHandleClearAllCourtsOp(...args),
  handleAdminClearCourtOp: (...args) => mockHandleAdminClearCourtOp(...args),
  handleMoveCourtOp: (...args) => mockHandleMoveCourtOp(...args),
  handleClearWaitlistOp: (...args) => mockHandleClearWaitlistOp(...args),
  handleRemoveFromWaitlistOp: (...args) => mockHandleRemoveFromWaitlistOp(...args),
}));

// ---- shared test state ----
let deps, mocks, result, unmount;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ deps, mocks } = createRegistrationAdminHandlerDeps());
  ({ result, unmount } = await renderHandlerHook(() => useAdminHandlers(deps)));
});

afterEach(() => {
  unmount();
});

// ============================================================
// 1. handleClearAllCourts — pure delegation → 1 test
// ============================================================
describe('handleClearAllCourts', () => {
  it('delegates to handleClearAllCourtsOp with backend and showAlertMessage', () => {
    result.current.handleClearAllCourts();

    expect(mockHandleClearAllCourtsOp).toHaveBeenCalledTimes(1);
    const ctx = mockHandleClearAllCourtsOp.mock.calls[0][0];
    expect(ctx).toHaveProperty('backend');
    expect(ctx).toHaveProperty('showAlertMessage');
  });
});

// ============================================================
// 2. handleAdminClearCourt — pure delegation → 1 test
// ============================================================
describe('handleAdminClearCourt', () => {
  it('delegates to handleAdminClearCourtOp with clearCourt and court number', () => {
    result.current.handleAdminClearCourt(5);

    expect(mockHandleAdminClearCourtOp).toHaveBeenCalledTimes(1);
    const [ctx, courtNum] = mockHandleAdminClearCourtOp.mock.calls[0];
    expect(ctx).toHaveProperty('clearCourt');
    expect(ctx).toHaveProperty('showAlertMessage');
    expect(courtNum).toBe(5);
  });
});

// ============================================================
// 3. handleMoveCourt — pure delegation → 1 test
// ============================================================
describe('handleMoveCourt', () => {
  it('delegates to handleMoveCourtOp with from/to court numbers', () => {
    result.current.handleMoveCourt(2, 7);

    expect(mockHandleMoveCourtOp).toHaveBeenCalledTimes(1);
    const [ctx, from, to] = mockHandleMoveCourtOp.mock.calls[0];
    expect(ctx).toHaveProperty('backend');
    expect(ctx).toHaveProperty('getCourtData');
    expect(ctx).toHaveProperty('setCourtToMove');
    expect(from).toBe(2);
    expect(to).toBe(7);
  });
});

// ============================================================
// 4. handleClearWaitlist — pure delegation → 1 test
// ============================================================
describe('handleClearWaitlist', () => {
  it('delegates to handleClearWaitlistOp with backend and helpers', () => {
    result.current.handleClearWaitlist();

    expect(mockHandleClearWaitlistOp).toHaveBeenCalledTimes(1);
    const ctx = mockHandleClearWaitlistOp.mock.calls[0][0];
    expect(ctx).toHaveProperty('backend');
    expect(ctx).toHaveProperty('showAlertMessage');
    expect(ctx).toHaveProperty('getCourtData');
  });
});

// ============================================================
// 5. handleRemoveFromWaitlist — pure delegation → 1 test
// ============================================================
describe('handleRemoveFromWaitlist', () => {
  it('delegates to handleRemoveFromWaitlistOp with group', () => {
    const group = { id: 'entry-1', players: ['Alice'] };
    result.current.handleRemoveFromWaitlist(group);

    expect(mockHandleRemoveFromWaitlistOp).toHaveBeenCalledTimes(1);
    const [ctx, g] = mockHandleRemoveFromWaitlistOp.mock.calls[0];
    expect(ctx).toHaveProperty('backend');
    expect(ctx).toHaveProperty('showAlertMessage');
    expect(g).toBe(group);
  });
});

// ============================================================
// 6. handlePriceUpdate — validation guards + try/catch → 3 tests
// ============================================================
describe('handlePriceUpdate', () => {
  it('saves valid price and shows success', async () => {
    ({ deps, mocks } = createRegistrationAdminHandlerDeps({
      state: { ballPriceInput: '5.00' },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useAdminHandlers(deps)));

    await result.current.handlePriceUpdate();

    expect(mocks.dataStore.get).toHaveBeenCalledWith('tennisClubSettings');
    expect(mocks.dataStore.set).toHaveBeenCalledWith(
      'tennisClubSettings',
      { tennisBallPrice: 5.0 },
      { immediate: true }
    );
    expect(mocks.showPriceSuccessWithClear).toHaveBeenCalled();
    expect(mocks.setPriceError).not.toHaveBeenCalled();
  });

  it('sets error when input is NaN', async () => {
    ({ deps, mocks } = createRegistrationAdminHandlerDeps({
      state: { ballPriceInput: 'abc' },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useAdminHandlers(deps)));

    await result.current.handlePriceUpdate();

    expect(mocks.setPriceError).toHaveBeenCalledWith('Please enter a valid number');
    expect(mocks.dataStore.set).not.toHaveBeenCalled();
  });

  it('sets error when dataStore.set rejects', async () => {
    ({ deps, mocks } = createRegistrationAdminHandlerDeps({
      state: { ballPriceInput: '3.50' },
    }));
    mocks.dataStore.set.mockRejectedValue(new Error('write failed'));
    ({ result, unmount } = await renderHandlerHook(() => useAdminHandlers(deps)));

    await result.current.handlePriceUpdate();

    expect(mocks.setPriceError).toHaveBeenCalledWith('Failed to save price');
  });
});

// ============================================================
// 7. handleExitAdmin — simple setter → 1 test
// ============================================================
describe('handleExitAdmin', () => {
  it('navigates to home and clears search', () => {
    result.current.handleExitAdmin();

    expect(mocks.setCurrentScreen).toHaveBeenCalledWith('home', 'exitAdminPanel');
    expect(mocks.setSearchInput).toHaveBeenCalledWith('');
  });
});
