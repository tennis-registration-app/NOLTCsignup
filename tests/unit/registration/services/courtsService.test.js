import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCourtsService } from '../../../../src/registration/services/modules/courtsService.js';

describe('courtsService', () => {
  let api;
  let notifyListeners;
  let transformCourts;
  let courtDataCache;
  let logger;
  let service;

  const mockApiCourts = {
    courts: [
      { court_number: 1, status: 'available' },
      { court_number: 2, status: 'occupied' },
      { court_number: 3, status: 'available' },
    ],
  };

  const mockTransformedCourts = [
    { number: 1, isAvailable: true },
    { number: 2, isAvailable: false },
    { number: 3, isAvailable: true },
  ];

  beforeEach(() => {
    courtDataCache = null;

    api = {
      getCourtStatus: vi.fn().mockResolvedValue(mockApiCourts),
    };

    notifyListeners = vi.fn();
    transformCourts = vi.fn().mockReturnValue(mockTransformedCourts);
    logger = {
      error: vi.fn(),
    };

    service = createCourtsService({
      api,
      notifyListeners,
      transformCourts,
      getCourtData: () => courtDataCache,
      setCourtData: (v) => {
        courtDataCache = v;
      },
      logger,
    });
  });

  describe('refreshCourtData', () => {
    it('fetches court data from API and stores in cache', async () => {
      await service.refreshCourtData();

      expect(api.getCourtStatus).toHaveBeenCalledWith(true);
      expect(courtDataCache).toBe(mockApiCourts);
    });

    it('notifies listeners after refresh', async () => {
      await service.refreshCourtData();

      expect(notifyListeners).toHaveBeenCalledWith('courts');
    });

    it('returns transformed courts', async () => {
      const result = await service.refreshCourtData();

      expect(transformCourts).toHaveBeenCalledWith(mockApiCourts.courts);
      expect(result).toBe(mockTransformedCourts);
    });

    it('logs and rethrows errors', async () => {
      const error = new Error('API failed');
      api.getCourtStatus.mockRejectedValue(error);

      await expect(service.refreshCourtData()).rejects.toThrow('API failed');
      expect(logger.error).toHaveBeenCalledWith('ApiService', 'Failed to refresh court data', error);
    });
  });

  describe('getAllCourts', () => {
    it('refreshes data if cache is empty', async () => {
      const result = await service.getAllCourts();

      expect(api.getCourtStatus).toHaveBeenCalled();
      expect(result).toBe(mockTransformedCourts);
    });

    it('uses cached data if available', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getAllCourts();

      expect(api.getCourtStatus).not.toHaveBeenCalled();
      expect(transformCourts).toHaveBeenCalledWith(mockApiCourts.courts);
      expect(result).toBe(mockTransformedCourts);
    });
  });

  describe('getAvailableCourts', () => {
    it('returns only available courts', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getAvailableCourts();

      expect(result).toEqual([
        { number: 1, isAvailable: true },
        { number: 3, isAvailable: true },
      ]);
    });

    it('refreshes data if cache is empty', async () => {
      const result = await service.getAvailableCourts();

      expect(api.getCourtStatus).toHaveBeenCalled();
      expect(result).toEqual([
        { number: 1, isAvailable: true },
        { number: 3, isAvailable: true },
      ]);
    });
  });

  describe('getCourtByNumber', () => {
    it('returns correct court by number', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getCourtByNumber(2);

      expect(result).toEqual({ number: 2, isAvailable: false });
    });

    it('returns undefined if court not found', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getCourtByNumber(99);

      expect(result).toBeUndefined();
    });
  });

  describe('clearCourt', () => {
    const mockTransformedCourtsWithIds = [
      { number: 1, id: 'court-uuid-1', isAvailable: true },
      { number: 2, id: 'court-uuid-2', isAvailable: false },
      { number: 3, id: 'court-uuid-3', isAvailable: true },
    ];

    beforeEach(() => {
      transformCourts.mockReturnValue(mockTransformedCourtsWithIds);
      api.endSessionByCourt = vi.fn().mockResolvedValue({
        session: { id: 'session-1' },
      });
      logger.debug = vi.fn();
    });

    it('calls endSessionByCourt with court id and default reason', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.clearCourt(2);

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'completed');
      expect(result).toEqual({
        success: true,
        session: { id: 'session-1' },
      });
    });

    it('throws error for invalid court number', async () => {
      courtDataCache = mockApiCourts;

      await expect(service.clearCourt(99)).rejects.toThrow('Court 99 not found');
    });

    it('maps "early" reason to cleared_early', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Left early' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'cleared_early');
    });

    it('maps "done" reason to cleared_early', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { reason: 'done playing' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'cleared_early');
    });

    it('maps "observed empty" reason to completed', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Observed empty' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'completed');
    });

    it('maps "admin override" reason to admin_override', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Admin override' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'admin_override');
    });

    it('maps "force" reason to admin_override', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { reason: 'Force clear' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'admin_override');
    });

    it('refreshes court data after clearing', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2);

      // refreshCourtData calls getCourtStatus
      expect(api.getCourtStatus).toHaveBeenCalledWith(true);
      expect(notifyListeners).toHaveBeenCalledWith('courts');
    });

    it('logs debug message with mapped reason', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Left early' });

      expect(logger.debug).toHaveBeenCalledWith(
        'ApiService',
        'Clearing court 2 with reason: cleared_early (legacy: Left early)'
      );
    });
  });
});
