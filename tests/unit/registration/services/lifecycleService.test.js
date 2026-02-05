import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLifecycleService } from '../../../../src/registration/services/modules/lifecycleService.js';

describe('lifecycleService', () => {
  let api;
  let setCourtData;
  let setWaitlistData;
  let setSettingsCache;
  let setMembersCache;
  let logger;
  let service;

  const mockCourtStatus = {
    courts: [
      {
        court_id: 'court-1',
        court_number: 1,
        court_name: 'Court 1',
        status: 'available',
        session: null,
        block: null,
      },
    ],
  };

  const mockWaitlist = {
    waitlist: [
      {
        id: 'waitlist-1',
        position: 1,
        group_type: 'singles',
        participants: [],
        joined_at: '2025-01-01T10:00:00Z',
        minutes_waiting: 5,
      },
    ],
  };

  const mockSettings = {
    settings: { maxPlayers: 4 },
    operating_hours: { open: '08:00', close: '22:00' },
  };

  const mockMembers = {
    members: [{ id: 'm1', display_name: 'Test Member' }],
  };

  beforeEach(() => {
    api = {
      getCourtStatus: vi.fn().mockResolvedValue(mockCourtStatus),
      getWaitlist: vi.fn().mockResolvedValue(mockWaitlist),
      getSettings: vi.fn().mockResolvedValue(mockSettings),
      getMembers: vi.fn().mockResolvedValue(mockMembers),
    };

    setCourtData = vi.fn();
    setWaitlistData = vi.fn();
    setSettingsCache = vi.fn();
    setMembersCache = vi.fn();

    logger = {
      debug: vi.fn(),
      error: vi.fn(),
    };

    service = createLifecycleService({
      api,
      setCourtData,
      setWaitlistData,
      setSettingsCache,
      setMembersCache,
      logger,
    });
  });

  describe('loadInitialData', () => {
    it('calls all four API endpoints in parallel', async () => {
      await service.loadInitialData();

      expect(api.getCourtStatus).toHaveBeenCalledTimes(1);
      expect(api.getWaitlist).toHaveBeenCalledTimes(1);
      expect(api.getSettings).toHaveBeenCalledTimes(1);
      expect(api.getMembers).toHaveBeenCalledTimes(1);
    });

    it('sets all four caches with API responses', async () => {
      await service.loadInitialData();

      expect(setCourtData).toHaveBeenCalledWith(mockCourtStatus);
      expect(setWaitlistData).toHaveBeenCalledWith(mockWaitlist);
      expect(setSettingsCache).toHaveBeenCalledWith(mockSettings);
      expect(setMembersCache).toHaveBeenCalledWith(mockMembers);
    });

    it('returns transformed data structure', async () => {
      const result = await service.loadInitialData();

      expect(result).toHaveProperty('courts');
      expect(result).toHaveProperty('waitlist');
      expect(result).toHaveProperty('settings');
      expect(result).toHaveProperty('operatingHours');
      expect(result).toHaveProperty('members');

      // Verify settings/operatingHours/members are passed through
      expect(result.settings).toEqual(mockSettings.settings);
      expect(result.operatingHours).toEqual(mockSettings.operating_hours);
      expect(result.members).toEqual(mockMembers.members);
    });

    it('transforms courts via transformCourts', async () => {
      const result = await service.loadInitialData();

      // transformCourts should produce canonical court shape
      expect(result.courts).toHaveLength(1);
      expect(result.courts[0]).toHaveProperty('number', 1);
      expect(result.courts[0]).toHaveProperty('id', 'court-1');
      expect(result.courts[0]).toHaveProperty('isAvailable', true);
    });

    it('transforms waitlist via transformWaitlist', async () => {
      const result = await service.loadInitialData();

      // transformWaitlist should produce canonical waitlist shape
      expect(result.waitlist).toHaveLength(1);
      expect(result.waitlist[0]).toHaveProperty('id', 'waitlist-1');
      expect(result.waitlist[0]).toHaveProperty('position', 1);
      expect(result.waitlist[0]).toHaveProperty('type', 'singles');
    });

    it('logs error and rethrows on API failure', async () => {
      const error = new Error('Network failure');
      api.getCourtStatus.mockRejectedValue(error);

      await expect(service.loadInitialData()).rejects.toThrow('Network failure');
      expect(logger.error).toHaveBeenCalledWith(
        'ApiService',
        'Failed to load initial data',
        error
      );
    });

    it('does not call cache setters on API failure', async () => {
      api.getCourtStatus.mockRejectedValue(new Error('Network failure'));

      await expect(service.loadInitialData()).rejects.toThrow();

      expect(setCourtData).not.toHaveBeenCalled();
      expect(setWaitlistData).not.toHaveBeenCalled();
      expect(setSettingsCache).not.toHaveBeenCalled();
      expect(setMembersCache).not.toHaveBeenCalled();
    });

    it('handles null courts array gracefully', async () => {
      api.getCourtStatus.mockResolvedValue({ courts: null });

      const result = await service.loadInitialData();

      expect(result.courts).toEqual([]);
    });

    it('handles null waitlist array gracefully', async () => {
      api.getWaitlist.mockResolvedValue({ waitlist: null });

      const result = await service.loadInitialData();

      expect(result.waitlist).toEqual([]);
    });
  });
});
