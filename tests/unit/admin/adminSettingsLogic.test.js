import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  transformSettings,
  loadSettingsData,
  updateBallPriceApi,
  refreshSettingsApi,
  refreshAISettingsApi,
} from '../../../src/admin/hooks/adminSettingsLogic.js';

describe('adminSettingsLogic', () => {
  // ─── transformSettings ─────────────────────────────────

  describe('transformSettings', () => {
    it('transforms API settings to UI shape', () => {
      const apiSettings = {
        ball_price_cents: 750,
        guest_fee_weekday_cents: 1500,
        guest_fee_weekend_cents: 2000,
      };

      const result = transformSettings(apiSettings);

      expect(result.tennisBallPrice).toBe(7.5);
      expect(result.guestFees.weekday).toBe(15.0);
      expect(result.guestFees.weekend).toBe(20.0);
    });

    it('uses defaults when API values are null/undefined', () => {
      const apiSettings = {};

      const result = transformSettings(apiSettings);

      expect(result.tennisBallPrice).toBe(5.0);
      expect(result.guestFees.weekday).toBe(15.0);
      expect(result.guestFees.weekend).toBe(20.0);
    });

    it('handles zero values (should not fall back to defaults)', () => {
      const apiSettings = {
        ball_price_cents: 0,
        guest_fee_weekday_cents: 0,
        guest_fee_weekend_cents: 0,
      };

      const result = transformSettings(apiSettings);

      // 0 is falsy, so it falls back to defaults (matches original behavior)
      expect(result.tennisBallPrice).toBe(5.0);
      expect(result.guestFees.weekday).toBe(15.0);
      expect(result.guestFees.weekend).toBe(20.0);
    });
  });

  // ─── loadSettingsData ──────────────────────────────────

  describe('loadSettingsData', () => {
    let mockDeps;

    beforeEach(() => {
      mockDeps = {
        backend: {
          admin: {
            getSettings: vi.fn(),
          },
        },
        dataStore: {
          cache: new Map(),
          get: vi.fn(),
        },
        TENNIS_CONFIG: {
          STORAGE: {
            KEY: 'tennis_data',
            BLOCK_TEMPLATES_KEY: 'block_templates',
          },
        },
        onError: vi.fn(),
      };
    });

    it('returns all 4 fields on success', async () => {
      mockDeps.dataStore.get.mockResolvedValue([{ id: 1, name: 'Template 1' }]);
      mockDeps.backend.admin.getSettings.mockResolvedValue({
        ok: true,
        settings: { ball_price_cents: 500 },
        operating_hours: [{ day: 'Monday', open: '08:00' }],
        upcoming_overrides: [{ date: '2025-01-01' }],
      });

      const result = await loadSettingsData(mockDeps);

      expect(result.blockTemplates).toEqual([{ id: 1, name: 'Template 1' }]);
      expect(result.settings.tennisBallPrice).toBe(5.0);
      expect(result.operatingHours).toEqual([{ day: 'Monday', open: '08:00' }]);
      expect(result.hoursOverrides).toEqual([{ date: '2025-01-01' }]);
    });

    it('loads blockTemplates from localStorage', async () => {
      const templates = [{ id: 1 }, { id: 2 }];
      mockDeps.dataStore.get.mockResolvedValue(templates);
      mockDeps.backend.admin.getSettings.mockResolvedValue({
        ok: true,
        settings: {},
      });

      const result = await loadSettingsData(mockDeps);

      expect(mockDeps.dataStore.get).toHaveBeenCalledWith('block_templates');
      expect(result.blockTemplates).toEqual(templates);
    });

    it('invalidates cache before loading', async () => {
      mockDeps.dataStore.cache.set('tennis_data', 'old');
      mockDeps.dataStore.cache.set('courtBlocks', 'old');
      mockDeps.dataStore.get.mockResolvedValue(null);
      mockDeps.backend.admin.getSettings.mockResolvedValue({ ok: true, settings: {} });

      await loadSettingsData(mockDeps);

      expect(mockDeps.dataStore.cache.has('tennis_data')).toBe(false);
      expect(mockDeps.dataStore.cache.has('courtBlocks')).toBe(false);
    });

    it('calls onError with exact message on network failure', async () => {
      mockDeps.dataStore.get.mockResolvedValue(null);
      mockDeps.backend.admin.getSettings.mockRejectedValue(new Error('Network down'));

      await loadSettingsData(mockDeps);

      expect(mockDeps.onError).toHaveBeenCalledWith('Failed to load data');
    });

    it('returns null values on API ok:false (no throw)', async () => {
      mockDeps.dataStore.get.mockResolvedValue(null);
      mockDeps.backend.admin.getSettings.mockResolvedValue({ ok: false, error: 'API error' });

      const result = await loadSettingsData(mockDeps);

      expect(result.settings).toBeNull();
      expect(mockDeps.onError).not.toHaveBeenCalled();
    });
  });

  // ─── updateBallPriceApi ────────────────────────────────
  // Pure function — does NOT call showNotification (hook wrapper does that)

  describe('updateBallPriceApi', () => {
    let mockBackend;

    beforeEach(() => {
      mockBackend = {
        admin: {
          updateSettings: vi.fn(),
        },
      };
    });

    it('calls backend.admin.updateSettings with correct payload', async () => {
      mockBackend.admin.updateSettings.mockResolvedValue({ ok: true });

      await updateBallPriceApi(mockBackend, 7.5);

      expect(mockBackend.admin.updateSettings).toHaveBeenCalledWith({
        settings: { ball_price_cents: 750 },
      });
    });

    it('converts dollars to cents correctly', async () => {
      mockBackend.admin.updateSettings.mockResolvedValue({ ok: true });

      await updateBallPriceApi(mockBackend, 12.99);

      expect(mockBackend.admin.updateSettings).toHaveBeenCalledWith({
        settings: { ball_price_cents: 1299 },
      });
    });

    it('returns success result from API', async () => {
      const apiResult = { ok: true, data: { id: 1 } };
      mockBackend.admin.updateSettings.mockResolvedValue(apiResult);

      const result = await updateBallPriceApi(mockBackend, 5.0);

      expect(result).toBe(apiResult);
    });

    it('returns failure result from API (does not throw)', async () => {
      const apiResult = { ok: false, error: 'Invalid price' };
      mockBackend.admin.updateSettings.mockResolvedValue(apiResult);

      const result = await updateBallPriceApi(mockBackend, 5.0);

      expect(result).toBe(apiResult);
      expect(result.ok).toBe(false);
    });
  });

  // ─── refreshSettingsApi ────────────────────────────────

  describe('refreshSettingsApi', () => {
    let mockDeps;

    beforeEach(() => {
      mockDeps = {
        backend: {
          admin: {
            getSettings: vi.fn(),
          },
        },
      };
    });

    it('returns transformed settings on success', async () => {
      mockDeps.backend.admin.getSettings.mockResolvedValue({
        ok: true,
        settings: { ball_price_cents: 600 },
        operating_hours: [{ day: 'Monday' }],
        upcoming_overrides: [{ date: '2025-01-01' }],
      });

      const result = await refreshSettingsApi(mockDeps);

      expect(result.settings.tennisBallPrice).toBe(6.0);
      expect(result.operatingHours).toEqual([{ day: 'Monday' }]);
      expect(result.hoursOverrides).toEqual([{ date: '2025-01-01' }]);
    });

    it('returns null on API failure (no throw)', async () => {
      mockDeps.backend.admin.getSettings.mockResolvedValue({ ok: false });

      const result = await refreshSettingsApi(mockDeps);

      expect(result).toBeNull();
    });

    it('returns null on network error (no throw - matches .then() swallow)', async () => {
      mockDeps.backend.admin.getSettings.mockRejectedValue(new Error('Network down'));

      const result = await refreshSettingsApi(mockDeps);

      expect(result).toBeNull();
    });
  });

  // ─── refreshAISettingsApi ──────────────────────────────

  describe('refreshAISettingsApi', () => {
    let mockDeps;

    beforeEach(() => {
      mockDeps = {
        backend: {
          admin: {
            getSettings: vi.fn(),
          },
        },
      };
    });

    it('returns settings and hoursOverrides on success', async () => {
      mockDeps.backend.admin.getSettings.mockResolvedValue({
        ok: true,
        settings: { ball_price_cents: 800 },
        upcoming_overrides: [{ date: '2025-02-01' }],
      });

      const result = await refreshAISettingsApi(mockDeps);

      expect(result.settings.tennisBallPrice).toBe(8.0);
      expect(result.hoursOverrides).toEqual([{ date: '2025-02-01' }]);
    });

    it('does NOT return operatingHours (unlike refreshSettingsApi)', async () => {
      mockDeps.backend.admin.getSettings.mockResolvedValue({
        ok: true,
        settings: { ball_price_cents: 500 },
        operating_hours: [{ day: 'Monday' }],
        upcoming_overrides: [],
      });

      const result = await refreshAISettingsApi(mockDeps);

      expect(result).not.toHaveProperty('operatingHours');
    });

    it('returns null on failure (no throw)', async () => {
      mockDeps.backend.admin.getSettings.mockRejectedValue(new Error('Network down'));

      const result = await refreshAISettingsApi(mockDeps);

      expect(result).toBeNull();
    });
  });
});
