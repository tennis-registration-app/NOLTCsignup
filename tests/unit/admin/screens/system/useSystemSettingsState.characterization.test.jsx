/**
 * useSystemSettingsState Characterization Test
 *
 * Verifies the hook's return shape and core behaviors:
 * - loadSettings populates state from backend
 * - savePricing sends correct payload
 * - saveAutoClear validates then sends
 * - handleHoursChange updates local state
 * - validateOverrideForm rejects empty fields
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// Bypass normalize layer — hook calls these directly
vi.mock('../../../../../src/lib/normalize/index.js', () => ({
  normalizeSettings: vi.fn((s) => s),
  normalizeOperatingHours: vi.fn((h) => h),
  normalizeOverrides: vi.fn((o) => o),
  denormalizeOperatingHours: vi.fn((h) => h),
  denormalizeOverride: vi.fn((o) => o),
}));

vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import useSystemSettingsState from '../../../../../src/admin/screens/system/useSystemSettingsState.js';

// ── Helper: render hook and capture its return value ──
function renderHook(hookFn) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const resultRef = { current: null };
  let rootRef;

  function TestComponent() {
    const result = hookFn();
    const ref = useRef();
    ref.current = result;
    resultRef.current = result;

    useEffect(() => {
      // keep ref fresh
      ref.current = result;
    });

    return null;
  }

  act(() => {
    rootRef = createRoot(container);
    rootRef.render(<TestComponent />);
  });

  return {
    get result() {
      return resultRef.current;
    },
    unmount() {
      act(() => rootRef.unmount());
      document.body.removeChild(container);
    },
  };
}

// ── Helpers ──
function makeBackend(overrides = {}) {
  return {
    admin: {
      getSettings: vi.fn().mockResolvedValue({
        ok: true,
        settings: {
          ballPriceCents: 700,
          guestFeeWeekdayCents: 2000,
          guestFeeWeekendCents: 2500,
          autoClearEnabled: 'true',
          autoClearMinutes: '240',
          checkStatusMinutes: '200',
          blockWarningMinutes: '45',
        },
        operating_hours: [
          { dayOfWeek: 0, dayName: 'Sunday', opensAt: '07:00', closesAt: '20:00', isClosed: false },
        ],
        upcoming_overrides: [
          { date: '2025-07-04', opensAt: '08:00', closesAt: '18:00', isClosed: false, reason: 'Holiday' },
        ],
      }),
      updateSettings: vi.fn().mockResolvedValue({ ok: true }),
      ...overrides,
    },
  };
}

const EXPECTED_KEYS = [
  'loading',
  'ballPriceInput', 'weekdayFeeInput', 'weekendFeeInput',
  'pricingChanged', 'pricingSaveStatus', 'handlePricingChange', 'savePricing',
  'autoClearEnabled', 'autoClearMinutes', 'checkStatusMinutes', 'blockWarningMinutes',
  'autoClearChanged', 'autoClearSaveStatus', 'autoClearError', 'handleAutoClearChange', 'saveAutoClear',
  'operatingHours', 'hoursChanged', 'hoursSaveStatus', 'handleHoursChange', 'saveOperatingHours',
  'hoursOverrides',
  'overrideDate', 'setOverrideDate', 'overrideOpens', 'setOverrideOpens',
  'overrideCloses', 'setOverrideCloses', 'overrideReason', 'setOverrideReason',
  'overrideClosed', 'setOverrideClosed', 'overrideErrors', 'setOverrideErrors',
  'clearOverrideError', 'validateOverrideForm', 'addHoursOverride', 'deleteHoursOverride',
].sort();

describe('useSystemSettingsState', () => {
  let backend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = makeBackend();
  });

  // ── Shape ──
  describe('return shape', () => {
    it('returns exactly the expected keys', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      // wait for loadSettings
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const keys = Object.keys(hookRef.result).sort();
      expect(keys).toEqual(EXPECTED_KEYS);
      hookRef.unmount();
    });

    it('functions are callable', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const fns = Object.entries(hookRef.result)
        .filter(([, v]) => typeof v === 'function')
        .map(([k]) => k)
        .sort();

      expect(fns).toEqual([
        'addHoursOverride',
        'clearOverrideError',
        'deleteHoursOverride',
        'handleAutoClearChange',
        'handleHoursChange',
        'handlePricingChange',
        'saveAutoClear',
        'saveOperatingHours',
        'savePricing',
        'setOverrideClosed',
        'setOverrideCloses',
        'setOverrideDate',
        'setOverrideErrors',
        'setOverrideOpens',
        'setOverrideReason',
        'validateOverrideForm',
      ]);

      hookRef.unmount();
    });
  });

  // ── Load ──
  describe('loadSettings', () => {
    it('calls backend.admin.getSettings on mount', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(backend.admin.getSettings).toHaveBeenCalledOnce();
      hookRef.unmount();
    });

    it('populates pricing state from normalized settings', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(hookRef.result.ballPriceInput).toBe('7.00');
      expect(hookRef.result.weekdayFeeInput).toBe('20.00');
      expect(hookRef.result.weekendFeeInput).toBe('25.00');
      hookRef.unmount();
    });

    it('populates auto-clear state', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(hookRef.result.autoClearEnabled).toBe(true);
      expect(hookRef.result.autoClearMinutes).toBe('240');
      expect(hookRef.result.checkStatusMinutes).toBe('200');
      expect(hookRef.result.blockWarningMinutes).toBe('45');
      hookRef.unmount();
    });

    it('populates operating hours', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(hookRef.result.operatingHours).toHaveLength(1);
      expect(hookRef.result.operatingHours[0].dayOfWeek).toBe(0);
      hookRef.unmount();
    });

    it('populates overrides', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(hookRef.result.hoursOverrides).toHaveLength(1);
      expect(hookRef.result.hoursOverrides[0].date).toBe('2025-07-04');
      hookRef.unmount();
    });

    it('sets loading=false after load', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(hookRef.result.loading).toBe(false);
      hookRef.unmount();
    });
  });

  // ── Save pricing ──
  describe('savePricing', () => {
    it('sends correct snake_case payload', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        hookRef.result.savePricing();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(backend.admin.updateSettings).toHaveBeenCalledWith({
        settings: {
          ball_price_cents: 700,
          guest_fee_weekday_cents: 2000,
          guest_fee_weekend_cents: 2500,
        },
      });
      hookRef.unmount();
    });
  });

  // ── Save auto-clear ──
  describe('saveAutoClear', () => {
    it('validates auto-clear minutes range', async () => {
      backend = makeBackend({
        getSettings: vi.fn().mockResolvedValue({
          ok: true,
          settings: {
            ballPriceCents: 500,
            guestFeeWeekdayCents: 1500,
            guestFeeWeekendCents: 2000,
            autoClearEnabled: 'true',
            autoClearMinutes: '30', // below 60 min
            checkStatusMinutes: '20',
            blockWarningMinutes: '60',
          },
          operating_hours: null,
          upcoming_overrides: null,
        }),
      });

      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        hookRef.result.saveAutoClear();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(hookRef.result.autoClearError).toBe('Auto-clear minutes must be between 60 and 720');
      expect(backend.admin.updateSettings).not.toHaveBeenCalled();
      hookRef.unmount();
    });

    it('validates checkStatus < autoClear', async () => {
      backend = makeBackend({
        getSettings: vi.fn().mockResolvedValue({
          ok: true,
          settings: {
            ballPriceCents: 500,
            guestFeeWeekdayCents: 1500,
            guestFeeWeekendCents: 2000,
            autoClearEnabled: 'true',
            autoClearMinutes: '180',
            checkStatusMinutes: '200', // >= autoClear
            blockWarningMinutes: '60',
          },
          operating_hours: null,
          upcoming_overrides: null,
        }),
      });

      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        hookRef.result.saveAutoClear();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(hookRef.result.autoClearError).toBe(
        'Warning threshold must be less than auto-clear threshold'
      );
      hookRef.unmount();
    });

    it('sends correct payload when valid', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        hookRef.result.saveAutoClear();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(backend.admin.updateSettings).toHaveBeenCalledWith({
        settings: {
          auto_clear_enabled: 'true',
          auto_clear_minutes: '240',
          check_status_minutes: '200',
          block_warning_minutes: '45',
        },
      });
      hookRef.unmount();
    });
  });

  // ── Validate override form ──
  describe('validateOverrideForm', () => {
    it('rejects empty date and reason', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      let valid;
      act(() => {
        valid = hookRef.result.validateOverrideForm();
      });

      expect(valid).toBe(false);
      expect(hookRef.result.overrideErrors.date).toBe('Date is required');
      expect(hookRef.result.overrideErrors.reason).toBe('Reason is required');
      hookRef.unmount();
    });

    it('rejects opens >= closes when not closed', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      act(() => {
        hookRef.result.setOverrideDate('2025-12-25');
        hookRef.result.setOverrideReason('Christmas');
        hookRef.result.setOverrideOpens('21:00');
        hookRef.result.setOverrideCloses('06:00');
      });

      let valid;
      act(() => {
        valid = hookRef.result.validateOverrideForm();
      });

      expect(valid).toBe(false);
      expect(hookRef.result.overrideErrors.times).toBe('Opening time must be before closing time');
      hookRef.unmount();
    });
  });

  // ── handlePricingChange ──
  describe('handlePricingChange', () => {
    it('updates ballPrice input and sets pricingChanged', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      act(() => {
        hookRef.result.handlePricingChange('ballPrice', '10.00');
      });

      expect(hookRef.result.ballPriceInput).toBe('10.00');
      expect(hookRef.result.pricingChanged).toBe(true);
      hookRef.unmount();
    });
  });

  // ── handleHoursChange ──
  describe('handleHoursChange', () => {
    it('updates a specific day and sets hoursChanged', async () => {
      let hookRef;
      await act(async () => {
        hookRef = renderHook(() => useSystemSettingsState({ backend, onSettingsChanged: vi.fn() }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      act(() => {
        hookRef.result.handleHoursChange(0, '08:00', '19:00', false);
      });

      expect(hookRef.result.operatingHours[0].opensAt).toBe('08:00');
      expect(hookRef.result.operatingHours[0].closesAt).toBe('19:00');
      expect(hookRef.result.hoursChanged).toBe(true);
      hookRef.unmount();
    });
  });
});
