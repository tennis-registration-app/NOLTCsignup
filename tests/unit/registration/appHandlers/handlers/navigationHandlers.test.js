/**
 * navigationHandlers — comprehensive callback tests
 *
 * Tests every exported callback from useNavigationHandlers:
 *   checkLocationAndProceed, handleToggleAddPlayer, handleGroupGoBack
 *
 * Rules:
 *   - Guard present: happy + guard failure
 *   - Catch present: happy + error test
 *   - Branch present: one test per branch
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createNavigationHandlerDeps,
  renderHandlerHook,
} from '../../../../helpers/handlerTestHarness.js';
import { useNavigationHandlers } from '../../../../../src/registration/appHandlers/handlers/navigationHandlers.js';

// ---- module mocks ----
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockVerifyAtClub = vi.fn();
vi.mock('../../../../../src/registration/services', () => ({
  GeolocationService: {
    verifyAtClub: (...args) => mockVerifyAtClub(...args),
  },
}));

// ---- shared test state ----
let deps, mocks, result, unmount;

beforeEach(async () => {
  vi.clearAllMocks();
  mockVerifyAtClub.mockResolvedValue({ success: true });
  ({ deps, mocks } = createNavigationHandlerDeps());
  ({ result, unmount } = await renderHandlerHook(() => useNavigationHandlers(deps)));
});

afterEach(() => {
  unmount();
});

// ============================================================
// 1. checkLocationAndProceed — guard (ENABLED) + try/catch/finally → 3 tests
// ============================================================
describe('checkLocationAndProceed', () => {
  it('skips geolocation and calls onSuccess when disabled', async () => {
    ({ deps, mocks } = createNavigationHandlerDeps({
      TENNIS_CONFIG: {
        GEOLOCATION: { ENABLED: false, ERROR_MESSAGE: 'fail' },
      },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useNavigationHandlers(deps)));

    const onSuccess = vi.fn();
    await result.current.checkLocationAndProceed(onSuccess);

    expect(onSuccess).toHaveBeenCalled();
    expect(mockVerifyAtClub).not.toHaveBeenCalled();
    expect(mocks.setCheckingLocation).not.toHaveBeenCalled();
  });

  it('calls onSuccess when location verified', async () => {
    mockVerifyAtClub.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    await result.current.checkLocationAndProceed(onSuccess);

    expect(mocks.setCheckingLocation).toHaveBeenCalledWith(true);
    expect(mockVerifyAtClub).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
    // finally block
    expect(mocks.setCheckingLocation).toHaveBeenCalledWith(false);
  });

  it('shows alert when verifyAtClub rejects', async () => {
    mockVerifyAtClub.mockRejectedValue(new Error('timeout'));
    const onSuccess = vi.fn();
    await result.current.checkLocationAndProceed(onSuccess);

    expect(onSuccess).not.toHaveBeenCalled();
    expect(mocks.showAlertMessage).toHaveBeenCalledWith('Location check failed');
    // finally block still runs
    expect(mocks.setCheckingLocation).toHaveBeenCalledWith(false);
  });
});

// ============================================================
// 2. handleToggleAddPlayer — showGuestForm branch → 2 tests
// ============================================================
describe('handleToggleAddPlayer', () => {
  it('toggles add player panel when guest form is not showing', () => {
    result.current.handleToggleAddPlayer();

    // showAddPlayer was false, toggles to true
    expect(mocks.setShowAddPlayer).toHaveBeenCalledWith(true);
    expect(mocks.setShowGuestForm).not.toHaveBeenCalled();
  });

  it('closes guest form and resets when guest form is showing', async () => {
    ({ deps, mocks } = createNavigationHandlerDeps({
      groupGuest: { showGuestForm: true },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useNavigationHandlers(deps)));

    result.current.handleToggleAddPlayer();

    expect(mocks.setShowGuestForm).toHaveBeenCalledWith(false);
    expect(mocks.setGuestName).toHaveBeenCalledWith('');
    expect(mocks.setGuestSponsor).toHaveBeenCalledWith('');
    expect(mocks.setShowGuestNameError).toHaveBeenCalledWith(false);
    expect(mocks.setShowSponsorError).toHaveBeenCalledWith(false);
    expect(mocks.setShowAddPlayer).toHaveBeenCalledWith(false);
  });
});

// ============================================================
// 3. handleGroupGoBack — mobileFlow + clearCourtStep branches → 3 tests
// ============================================================
describe('handleGroupGoBack', () => {
  it('resets group and goes home in desktop flow', () => {
    result.current.handleGroupGoBack();

    expect(mocks.setCurrentGroup).toHaveBeenCalledWith([]);
    expect(mocks.setMemberNumber).toHaveBeenCalledWith('');
    expect(mocks.setCurrentMemberId).toHaveBeenCalledWith(null);
    expect(mocks.setCurrentScreen).toHaveBeenCalledWith('home', 'groupGoBack');
  });

  it('requests mobile reset for non-clearCourt screens in mobile flow', async () => {
    ({ deps, mocks } = createNavigationHandlerDeps({
      mobile: { mobileFlow: true },
      state: { currentScreen: 'group' },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useNavigationHandlers(deps)));

    result.current.handleGroupGoBack();

    expect(mocks.requestMobileReset).toHaveBeenCalled();
    expect(mocks.setCurrentGroup).not.toHaveBeenCalled();
  });

  it('decrements clear court step when in clearCourt screen with step > 1', async () => {
    ({ deps, mocks } = createNavigationHandlerDeps({
      mobile: { mobileFlow: true },
      state: { currentScreen: 'clearCourt' },
      clearCourtFlow: { clearCourtStep: 2 },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useNavigationHandlers(deps)));

    result.current.handleGroupGoBack();

    expect(mocks.decrementClearCourtStep).toHaveBeenCalled();
    expect(mocks.requestMobileReset).not.toHaveBeenCalled();
  });
});
