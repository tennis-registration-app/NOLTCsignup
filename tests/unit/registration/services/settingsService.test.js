import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSettingsService } from '../../../../src/registration/services/modules/settingsService.js';

describe('settingsService', () => {
  let api;
  let settingsCache;
  let service;

  const mockSettings = {
    maxSessionDuration: 60,
    openTime: '08:00',
    closeTime: '21:00',
  };

  beforeEach(() => {
    settingsCache = null;

    api = {
      getSettings: vi.fn().mockResolvedValue(mockSettings),
    };

    service = createSettingsService({
      api,
      getSettingsCache: () => settingsCache,
      setSettingsCache: (v) => {
        settingsCache = v;
      },
    });
  });

  describe('getSettings', () => {
    it('fetches from API when cache is empty', async () => {
      await service.getSettings();

      expect(api.getSettings).toHaveBeenCalledWith();
    });

    it('returns settings from API', async () => {
      const result = await service.getSettings();

      expect(result).toEqual(mockSettings);
    });

    it('caches the settings', async () => {
      await service.getSettings();

      expect(settingsCache).toEqual(mockSettings);
    });

    it('uses cached data on subsequent calls', async () => {
      await service.getSettings();
      await service.getSettings();

      expect(api.getSettings).toHaveBeenCalledTimes(1);
    });

    it('returns cached settings without API call', async () => {
      settingsCache = mockSettings;

      const result = await service.getSettings();

      expect(api.getSettings).not.toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });
  });

  describe('refreshSettings', () => {
    it('calls api.getSettings with force=true', async () => {
      await service.refreshSettings();

      expect(api.getSettings).toHaveBeenCalledWith(true);
    });

    it('updates the cache', async () => {
      const newSettings = { maxSessionDuration: 90 };
      api.getSettings.mockResolvedValue(newSettings);

      await service.refreshSettings();

      expect(settingsCache).toEqual(newSettings);
    });

    it('returns the refreshed settings', async () => {
      const newSettings = { maxSessionDuration: 90 };
      api.getSettings.mockResolvedValue(newSettings);

      const result = await service.refreshSettings();

      expect(result).toEqual(newSettings);
    });

    it('overwrites existing cache', async () => {
      settingsCache = mockSettings;
      const newSettings = { maxSessionDuration: 120 };
      api.getSettings.mockResolvedValue(newSettings);

      await service.refreshSettings();

      expect(settingsCache).toEqual(newSettings);
    });
  });
});
