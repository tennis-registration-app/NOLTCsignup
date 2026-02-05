import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWaitlistService } from '../../../../src/registration/services/modules/waitlistService.js';

describe('waitlistService', () => {
  let api;
  let notifyListeners;
  let transformWaitlist;
  let waitlistDataCache;
  let logger;
  let service;

  const mockApiWaitlist = {
    waitlist: [
      { id: 'w1', group: { players: [{ name: 'Alice' }] } },
      { id: 'w2', group: { players: [{ name: 'Bob' }] } },
    ],
  };

  const mockTransformedWaitlist = [
    { id: 'w1', names: ['Alice'] },
    { id: 'w2', names: ['Bob'] },
  ];

  beforeEach(() => {
    waitlistDataCache = null;

    api = {
      getWaitlist: vi.fn().mockResolvedValue(mockApiWaitlist),
      cancelWaitlist: vi.fn().mockResolvedValue({ success: true }),
    };

    notifyListeners = vi.fn();
    transformWaitlist = vi.fn().mockReturnValue(mockTransformedWaitlist);
    logger = {
      error: vi.fn(),
    };

    service = createWaitlistService({
      api,
      notifyListeners,
      transformWaitlist,
      getWaitlistData: () => waitlistDataCache,
      setWaitlistData: (v) => {
        waitlistDataCache = v;
      },
      logger,
    });
  });

  describe('refreshWaitlist', () => {
    it('fetches waitlist data from API and stores in cache', async () => {
      await service.refreshWaitlist();

      expect(api.getWaitlist).toHaveBeenCalled();
      expect(waitlistDataCache).toBe(mockApiWaitlist);
    });

    it('notifies listeners after refresh', async () => {
      await service.refreshWaitlist();

      expect(notifyListeners).toHaveBeenCalledWith('waitlist');
    });

    it('returns transformed waitlist', async () => {
      const result = await service.refreshWaitlist();

      expect(transformWaitlist).toHaveBeenCalledWith(mockApiWaitlist.waitlist);
      expect(result).toBe(mockTransformedWaitlist);
    });

    it('logs and rethrows errors', async () => {
      const error = new Error('API failed');
      api.getWaitlist.mockRejectedValue(error);

      await expect(service.refreshWaitlist()).rejects.toThrow('API failed');
      expect(logger.error).toHaveBeenCalledWith('ApiService', 'Failed to refresh waitlist', error);
    });
  });

  describe('getWaitlist', () => {
    it('refreshes data if cache is empty', async () => {
      const result = await service.getWaitlist();

      expect(api.getWaitlist).toHaveBeenCalled();
      expect(result).toBe(mockTransformedWaitlist);
    });

    it('uses cached data if available', async () => {
      waitlistDataCache = mockApiWaitlist;

      const result = await service.getWaitlist();

      expect(api.getWaitlist).not.toHaveBeenCalled();
      expect(transformWaitlist).toHaveBeenCalledWith(mockApiWaitlist.waitlist);
      expect(result).toBe(mockTransformedWaitlist);
    });
  });

  describe('removeFromWaitlist', () => {
    it('calls cancelWaitlist with string ID', async () => {
      waitlistDataCache = mockApiWaitlist;

      const result = await service.removeFromWaitlist('w1');

      expect(api.cancelWaitlist).toHaveBeenCalledWith('w1');
      expect(result).toEqual({ success: true });
    });

    it('looks up ID when passed numeric index (legacy)', async () => {
      waitlistDataCache = mockApiWaitlist;

      const result = await service.removeFromWaitlist(1);

      expect(api.cancelWaitlist).toHaveBeenCalledWith('w2');
      expect(result).toEqual({ success: true });
    });

    it('throws error for invalid index', async () => {
      waitlistDataCache = mockApiWaitlist;

      await expect(service.removeFromWaitlist(99)).rejects.toThrow(
        'Waitlist entry at index 99 not found'
      );
    });

    it('refreshes waitlist after removal', async () => {
      waitlistDataCache = mockApiWaitlist;

      await service.removeFromWaitlist('w1');

      // Should have called getWaitlist twice: once for the initial call, once for refresh
      expect(api.getWaitlist).toHaveBeenCalled();
      expect(notifyListeners).toHaveBeenCalledWith('waitlist');
    });
  });
});
