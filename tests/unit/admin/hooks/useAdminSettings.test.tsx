/**
 * useAdminSettings — hook coverage
 *
 * Tests mount loading, updateBallPrice, handleSettingsChanged,
 * handleAISettingsChanged, reloadSettings, ADMIN_REFRESH event,
 * and error/notification paths.
 *
 * Mocks adminSettingsLogic.js functions (pure logic tested separately).
 * Uses minimal React wrapper pattern (no renderHook dependency).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// Mock the pure logic module
vi.mock('../../../../src/admin/hooks/adminSettingsLogic.js', () => ({
  loadSettingsData: vi.fn(),
  updateBallPriceApi: vi.fn(),
  refreshSettingsApi: vi.fn(),
  refreshAISettingsApi: vi.fn(),
}));

import { useAdminSettings } from '../../../../src/admin/hooks/useAdminSettings.js';
import {
  loadSettingsData,
  updateBallPriceApi,
  refreshSettingsApi,
  refreshAISettingsApi,
} from '../../../../src/admin/hooks/adminSettingsLogic.js';

// ============================================================
// Test harness
// ============================================================

function createDeps(overrides = {}) {
  return {
    backend: { admin: {} },
    showNotification: vi.fn(),
    dataStore: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      cache: { delete: vi.fn() },
    },
    TENNIS_CONFIG: {
      STORAGE: { KEY: 'tennis-data', BLOCK_TEMPLATES_KEY: 'blockTemplates' },
    },
    clearAllTimers: vi.fn(),
    ...overrides,
  };
}

function createHarness(depsOverrides = {}) {
  const deps = createDeps(depsOverrides);

  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useAdminSettings(deps);
    useImperativeHandle(ref, () => hook);
    return null;
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<ReturnType<typeof useAdminSettings>>() as { current: ReturnType<typeof useAdminSettings> };

  act(() => {
    root.render(<Wrapper ref={ref} />);
  });

  return {
    get hook() {
      return ref.current;
    },
    deps,
    cleanup() {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// Setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  // Reset singleton guard so each test gets a fresh listener
  delete /** @type {any} */ (window).__ADMIN_SETTINGS_LISTENERS_INSTALLED;

  // Default: loadSettingsData resolves with full data
  loadSettingsData.mockResolvedValue({
    blockTemplates: [{ id: 't1', reason: 'Lesson' }],
    settings: { tennisBallPrice: 5.0, guestFees: { weekday: 15, weekend: 20 } },
    operatingHours: [{ day: 'Mon', open: '06:00', close: '21:00' }],
    hoursOverrides: [{ date: '2025-12-25', closed: true }],
  });

  updateBallPriceApi.mockResolvedValue({ ok: true });
  refreshSettingsApi.mockResolvedValue({
    settings: { tennisBallPrice: 6.0 },
    operatingHours: [{ day: 'Tue', open: '07:00', close: '20:00' }],
    hoursOverrides: [],
  });
  refreshAISettingsApi.mockResolvedValue({
    settings: { tennisBallPrice: 7.0 },
    hoursOverrides: [{ date: '2025-01-01', note: 'AI override' }],
  });
});

afterEach(() => {
  delete /** @type {any} */ (window).__ADMIN_SETTINGS_LISTENERS_INSTALLED;
});

// ============================================================
// A) Initial state and mount loading
// ============================================================

describe('initial state and mount loading', () => {
  it('returns empty defaults before load completes', () => {
    loadSettingsData.mockReturnValue(new Promise(() => {})); // never resolves
    const h = createHarness();
    expect(h.hook.settings).toEqual({});
    expect(h.hook.operatingHours).toEqual([]);
    expect(h.hook.hoursOverrides).toEqual([]);
    expect(h.hook.blockTemplates).toEqual([]);
    h.cleanup();
  });

  it('calls loadSettingsData on mount', async () => {
    const h = createHarness();
    // Wait for mount effect
    await act(async () => {});
    expect(loadSettingsData).toHaveBeenCalledOnce();
    h.cleanup();
  });

  it('passes backend, dataStore, TENNIS_CONFIG, onError to loadSettingsData', async () => {
    const h = createHarness();
    await act(async () => {});
    expect(loadSettingsData).toHaveBeenCalledWith({
      backend: h.deps.backend,
      dataStore: h.deps.dataStore,
      TENNIS_CONFIG: h.deps.TENNIS_CONFIG,
      onError: expect.any(Function),
    });
    h.cleanup();
  });

  it('populates settings state from loadSettingsData result', async () => {
    const h = createHarness();
    await act(async () => {});
    expect(h.hook.settings).toEqual({
      tennisBallPrice: 5.0,
      guestFees: { weekday: 15, weekend: 20 },
    });
    h.cleanup();
  });

  it('populates operatingHours from loadSettingsData result', async () => {
    const h = createHarness();
    await act(async () => {});
    expect(h.hook.operatingHours).toEqual([{ day: 'Mon', open: '06:00', close: '21:00' }]);
    h.cleanup();
  });

  it('populates hoursOverrides from loadSettingsData result', async () => {
    const h = createHarness();
    await act(async () => {});
    expect(h.hook.hoursOverrides).toEqual([{ date: '2025-12-25', closed: true }]);
    h.cleanup();
  });

  it('populates blockTemplates from loadSettingsData result', async () => {
    const h = createHarness();
    await act(async () => {});
    expect(h.hook.blockTemplates).toEqual([{ id: 't1', reason: 'Lesson' }]);
    h.cleanup();
  });

  it('skips setting state for null fields in result', async () => {
    loadSettingsData.mockResolvedValue({
      blockTemplates: null,
      settings: null,
      operatingHours: null,
      hoursOverrides: null,
    });
    const h = createHarness();
    await act(async () => {});
    // Should remain at defaults (not set to null)
    expect(h.hook.settings).toEqual({});
    expect(h.hook.operatingHours).toEqual([]);
    expect(h.hook.hoursOverrides).toEqual([]);
    expect(h.hook.blockTemplates).toEqual([]);
    h.cleanup();
  });

  it('onError callback calls showNotification with error type', async () => {
    loadSettingsData.mockImplementation(async (deps) => {
      deps.onError('Failed to load data');
      return { blockTemplates: null, settings: null, operatingHours: null, hoursOverrides: null };
    });
    const h = createHarness();
    await act(async () => {});
    expect(h.deps.showNotification).toHaveBeenCalledWith('Failed to load data', 'error');
    h.cleanup();
  });
});

// ============================================================
// B) updateBallPrice
// ============================================================

describe('updateBallPrice', () => {
  it('calls updateBallPriceApi with backend and price', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      await h.hook.updateBallPrice(7.5);
    });

    expect(updateBallPriceApi).toHaveBeenCalledWith(h.deps.backend, 7.5);
    h.cleanup();
  });

  it('updates settings.tennisBallPrice on success', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      await h.hook.updateBallPrice(7.5);
    });

    expect(h.hook.settings.tennisBallPrice).toBe(7.5);
    h.cleanup();
  });

  it('shows success notification on ok:true', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      await h.hook.updateBallPrice(7.5);
    });

    expect(h.deps.showNotification).toHaveBeenCalledWith('Ball price updated', 'success');
    h.cleanup();
  });

  it('shows error notification on ok:false', async () => {
    updateBallPriceApi.mockResolvedValue({ ok: false, message: 'Server error' });
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      await h.hook.updateBallPrice(7.5);
    });

    expect(h.deps.showNotification).toHaveBeenCalledWith(
      'Failed to update ball price',
      'error'
    );
    h.cleanup();
  });

  it('does NOT update settings on ok:false', async () => {
    updateBallPriceApi.mockResolvedValue({ ok: false });
    const h = createHarness();
    await act(async () => {});
    const originalPrice = h.hook.settings.tennisBallPrice;

    await act(async () => {
      await h.hook.updateBallPrice(99);
    });

    expect(h.hook.settings.tennisBallPrice).toBe(originalPrice);
    h.cleanup();
  });

  it('returns the API result', async () => {
    const h = createHarness();
    await act(async () => {});

    let result;
    await act(async () => {
      result = await h.hook.updateBallPrice(7.5);
    });

    expect(result).toEqual({ ok: true });
    h.cleanup();
  });

  it('preserves other settings fields when updating price', async () => {
    const h = createHarness();
    await act(async () => {});
    expect(h.hook.settings.guestFees).toBeDefined();

    await act(async () => {
      await h.hook.updateBallPrice(8.0);
    });

    // guestFees should still be there
    expect(h.hook.settings.guestFees).toEqual({ weekday: 15, weekend: 20 });
    expect(h.hook.settings.tennisBallPrice).toBe(8.0);
    h.cleanup();
  });
});

// ============================================================
// C) handleSettingsChanged
// ============================================================

describe('handleSettingsChanged', () => {
  it('calls refreshSettingsApi with backend', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      h.hook.handleSettingsChanged();
      // Wait for the .then() chain to resolve
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(refreshSettingsApi).toHaveBeenCalledWith({ backend: h.deps.backend });
    h.cleanup();
  });

  it('updates settings from refreshSettingsApi result', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      h.hook.handleSettingsChanged();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(h.hook.settings).toEqual({ tennisBallPrice: 6.0 });
    h.cleanup();
  });

  it('updates operatingHours from refresh result', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      h.hook.handleSettingsChanged();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(h.hook.operatingHours).toEqual([{ day: 'Tue', open: '07:00', close: '20:00' }]);
    h.cleanup();
  });

  it('updates hoursOverrides from refresh result', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      h.hook.handleSettingsChanged();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(h.hook.hoursOverrides).toEqual([]);
    h.cleanup();
  });

  it('does nothing when refreshSettingsApi returns null', async () => {
    refreshSettingsApi.mockResolvedValue(null);
    const h = createHarness();
    await act(async () => {});
    const origSettings = h.hook.settings;

    await act(async () => {
      h.hook.handleSettingsChanged();
      await new Promise((r) => setTimeout(r, 0));
    });

    // Settings should remain unchanged
    expect(h.hook.settings).toEqual(origSettings);
    h.cleanup();
  });

  it('skips null fields in result', async () => {
    refreshSettingsApi.mockResolvedValue({
      settings: null,
      operatingHours: [{ day: 'Wed' }],
      hoursOverrides: null,
    });
    const h = createHarness();
    await act(async () => {});
    const origSettings = h.hook.settings;

    await act(async () => {
      h.hook.handleSettingsChanged();
      await new Promise((r) => setTimeout(r, 0));
    });

    // settings unchanged but operatingHours updated
    expect(h.hook.settings).toEqual(origSettings);
    expect(h.hook.operatingHours).toEqual([{ day: 'Wed' }]);
    h.cleanup();
  });
});

// ============================================================
// D) handleAISettingsChanged
// ============================================================

describe('handleAISettingsChanged', () => {
  it('calls refreshAISettingsApi with backend', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      await h.hook.handleAISettingsChanged();
    });

    expect(refreshAISettingsApi).toHaveBeenCalledWith({ backend: h.deps.backend });
    h.cleanup();
  });

  it('updates settings from AI refresh result', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      await h.hook.handleAISettingsChanged();
    });

    expect(h.hook.settings).toEqual({ tennisBallPrice: 7.0 });
    h.cleanup();
  });

  it('updates hoursOverrides from AI refresh result', async () => {
    const h = createHarness();
    await act(async () => {});

    await act(async () => {
      await h.hook.handleAISettingsChanged();
    });

    expect(h.hook.hoursOverrides).toEqual([{ date: '2025-01-01', note: 'AI override' }]);
    h.cleanup();
  });

  it('does nothing when refreshAISettingsApi returns null', async () => {
    refreshAISettingsApi.mockResolvedValue(null);
    const h = createHarness();
    await act(async () => {});
    const origSettings = h.hook.settings;

    await act(async () => {
      await h.hook.handleAISettingsChanged();
    });

    expect(h.hook.settings).toEqual(origSettings);
    h.cleanup();
  });

  it('skips null fields in result', async () => {
    refreshAISettingsApi.mockResolvedValue({
      settings: null,
      hoursOverrides: [{ date: '2025-02-14' }],
    });
    const h = createHarness();
    await act(async () => {});
    const origSettings = h.hook.settings;

    await act(async () => {
      await h.hook.handleAISettingsChanged();
    });

    expect(h.hook.settings).toEqual(origSettings);
    expect(h.hook.hoursOverrides).toEqual([{ date: '2025-02-14' }]);
    h.cleanup();
  });
});

// ============================================================
// E) reloadSettings
// ============================================================

describe('reloadSettings', () => {
  it('calls loadSettingsData again', async () => {
    const h = createHarness();
    await act(async () => {});
    loadSettingsData.mockClear();

    await act(async () => {
      h.hook.reloadSettings();
    });
    // Wait for async
    await act(async () => {});

    expect(loadSettingsData).toHaveBeenCalledOnce();
    h.cleanup();
  });
});

// ============================================================
// F) ADMIN_REFRESH event listener
// ============================================================

describe('ADMIN_REFRESH event listener', () => {
  it('reloads data when ADMIN_REFRESH event fires', async () => {
    const h = createHarness();
    await act(async () => {});
    loadSettingsData.mockClear();

    await act(async () => {
      window.dispatchEvent(new Event('ADMIN_REFRESH'));
    });
    await act(async () => {});

    expect(loadSettingsData).toHaveBeenCalledOnce();
    h.cleanup();
  });
});

// ============================================================
// G) Return shape
// ============================================================

describe('return shape', () => {
  it('returns all expected keys', async () => {
    const h = createHarness();
    await act(async () => {});

    const keys = Object.keys(h.hook).sort();
    expect(keys).toEqual([
      'blockTemplates',
      'handleAISettingsChanged',
      'handleSettingsChanged',
      'hoursOverrides',
      'operatingHours',
      'reloadSettings',
      'settings',
      'updateBallPrice',
    ]);
    h.cleanup();
  });

  it('operations are functions', async () => {
    const h = createHarness();
    await act(async () => {});

    expect(typeof h.hook.updateBallPrice).toBe('function');
    expect(typeof h.hook.handleSettingsChanged).toBe('function');
    expect(typeof h.hook.handleAISettingsChanged).toBe('function');
    expect(typeof h.hook.reloadSettings).toBe('function');
    h.cleanup();
  });
});
