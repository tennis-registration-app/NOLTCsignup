/**
 * useRegistrationRuntime — hook wiring tests
 *
 * Tests:
 *   A) Settings fetch (mount effect): getSettings → normalizeSettings → setters
 *   B) Clock interval: setInterval(setCurrentTime, 1000) + cleanup
 *   C) Ref returns: successResetTimerRef, typingTimeoutRef
 *   D) CSS style injection + cleanup on unmount
 *   E) Error handling: getSettings rejection
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHandlerHook } from '../../../../helpers/handlerTestHarness.js';
import { useRegistrationRuntime } from '../../../../../src/registration/appHandlers/state/useRegistrationRuntime.js';

// ---- module mocks ----
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNormalizeSettings = vi.fn().mockReturnValue({
  ballPriceCents: 500,
  blockWarningMinutes: '15',
});

vi.mock('../../../../../src/lib/normalize/index.js', () => ({
  normalizeSettings: (...args) => mockNormalizeSettings(...args),
}));

// ---- test helpers ----
function createDeps(overrides = {}) {
  return {
    setCurrentTime: vi.fn(),
    setBallPriceCents: vi.fn(),
    setBlockWarningMinutes: vi.fn(),
    availableCourts: [],
    backend: {
      admin: {
        getSettings: vi.fn().mockResolvedValue({
          ok: true,
          settings: { ball_price_cents: 500, block_warning_minutes: 15 },
        }),
      },
    },
    ...overrides,
  };
}

// ---- shared test state ----
let deps, result, unmount;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  deps = createDeps();
  ({ result, unmount } = await renderHandlerHook(() => useRegistrationRuntime(deps)));
  // Flush the mount-only async effect (fetchBallPrice) without triggering infinite setInterval
  await vi.advanceTimersByTimeAsync(0);
});

afterEach(() => {
  unmount();
  vi.useRealTimers();
});

// ============================================================
// A) Settings fetch (mount effect)
// ============================================================
describe('settings fetch', () => {
  it('calls getSettings once on mount', () => {
    expect(deps.backend.admin.getSettings).toHaveBeenCalledTimes(1);
  });

  it('calls normalizeSettings with raw settings from response', () => {
    expect(mockNormalizeSettings).toHaveBeenCalledWith({
      ball_price_cents: 500,
      block_warning_minutes: 15,
    });
  });

  it('calls setBallPriceCents with normalized value', () => {
    expect(deps.setBallPriceCents).toHaveBeenCalledWith(500);
  });

  it('calls setBlockWarningMinutes with parsed int value', () => {
    expect(deps.setBlockWarningMinutes).toHaveBeenCalledWith(15);
  });

  it('skips setBallPriceCents when normalizeSettings returns no ballPriceCents', async () => {
    mockNormalizeSettings.mockReturnValue({ blockWarningMinutes: '10' });
    deps = createDeps();
    unmount();
    ({ result, unmount } = await renderHandlerHook(() => useRegistrationRuntime(deps)));
    await vi.advanceTimersByTimeAsync(0);

    expect(deps.setBallPriceCents).not.toHaveBeenCalled();
  });

  it('skips setBlockWarningMinutes when normalizeSettings returns no blockWarningMinutes', async () => {
    mockNormalizeSettings.mockReturnValue({ ballPriceCents: 300 });
    deps = createDeps();
    unmount();
    ({ result, unmount } = await renderHandlerHook(() => useRegistrationRuntime(deps)));
    await vi.advanceTimersByTimeAsync(0);

    expect(deps.setBlockWarningMinutes).not.toHaveBeenCalled();
  });

  it('skips setters when getSettings returns ok: false', async () => {
    deps = createDeps();
    deps.backend.admin.getSettings.mockResolvedValue({ ok: false });
    unmount();
    ({ result, unmount } = await renderHandlerHook(() => useRegistrationRuntime(deps)));
    await vi.advanceTimersByTimeAsync(0);

    expect(deps.setBallPriceCents).not.toHaveBeenCalled();
    expect(deps.setBlockWarningMinutes).not.toHaveBeenCalled();
  });

  it('does not crash when getSettings rejects', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    deps = createDeps();
    deps.backend.admin.getSettings.mockRejectedValue(new Error('network'));
    unmount();
    ({ result, unmount } = await renderHandlerHook(() => useRegistrationRuntime(deps)));
    await vi.advanceTimersByTimeAsync(0);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load ball price from API:',
      expect.any(Error)
    );
    expect(deps.setBallPriceCents).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ============================================================
// B) Clock interval
// ============================================================
describe('clock interval', () => {
  it('calls setCurrentTime after 1 second', () => {
    deps.setCurrentTime.mockClear();

    vi.advanceTimersByTime(1000);

    expect(deps.setCurrentTime).toHaveBeenCalledTimes(1);
    expect(deps.setCurrentTime).toHaveBeenCalledWith(expect.any(Date));
  });

  it('calls setCurrentTime multiple times over multiple seconds', () => {
    deps.setCurrentTime.mockClear();

    vi.advanceTimersByTime(3000);

    expect(deps.setCurrentTime).toHaveBeenCalledTimes(3);
  });

  it('stops calling setCurrentTime after unmount', () => {
    deps.setCurrentTime.mockClear();

    unmount();
    vi.advanceTimersByTime(5000);

    expect(deps.setCurrentTime).not.toHaveBeenCalled();
  });
});

// ============================================================
// C) Ref returns
// ============================================================
describe('ref returns', () => {
  it('returns successResetTimerRef as a ref object', () => {
    expect(result.current.successResetTimerRef).toHaveProperty('current');
    expect(result.current.successResetTimerRef.current).toBeNull();
  });

  it('returns typingTimeoutRef as a ref object', () => {
    expect(result.current.typingTimeoutRef).toHaveProperty('current');
    expect(result.current.typingTimeoutRef.current).toBeNull();
  });
});

// ============================================================
// D) CSS style injection + cleanup
// ============================================================
describe('CSS style injection', () => {
  it('injects a style element into document.head on mount', () => {
    const styles = document.head.querySelectorAll('style');
    const injected = Array.from(styles).find((s) =>
      s.textContent.includes('.animate-pulse')
    );
    expect(injected).toBeTruthy();
    expect(injected.textContent).toContain('will-change: opacity');
    expect(injected.textContent).toContain('.court-transition');
  });

  it('removes the style element on unmount', () => {
    const beforeCount = document.head.querySelectorAll('style').length;

    unmount();

    const afterCount = document.head.querySelectorAll('style').length;
    expect(afterCount).toBe(beforeCount - 1);
  });
});
