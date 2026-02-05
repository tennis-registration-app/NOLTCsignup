import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPurchasesService } from '../../../../src/registration/services/modules/purchasesService.js';

describe('purchasesService', () => {
  let api;
  let logger;
  let service;

  beforeEach(() => {
    api = {
      purchaseBalls: vi.fn(),
    };

    logger = {
      debug: vi.fn(),
    };

    service = createPurchasesService({ api, logger });
  });

  describe('purchaseBalls', () => {
    it('calls api.purchaseBalls with correct arguments', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: true,
        transactions: [{ id: 'txn-1' }],
        total_cents: 500,
      });

      await service.purchaseBalls('session-123', 'account-456');

      expect(api.purchaseBalls).toHaveBeenCalledWith('session-123', 'account-456', {
        splitBalls: false,
        splitAccountIds: null,
      });
    });

    it('returns transformed result', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: true,
        transactions: [{ id: 'txn-1' }, { id: 'txn-2' }],
        total_cents: 1000,
      });

      const result = await service.purchaseBalls('session-123', 'account-456');

      expect(result).toEqual({
        success: true,
        transactions: [{ id: 'txn-1' }, { id: 'txn-2' }],
        totalCents: 1000,
      });
    });

    it('passes splitBalls option through', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: true,
        transactions: [],
        total_cents: 0,
      });

      await service.purchaseBalls('session-123', 'account-456', { splitBalls: true });

      expect(api.purchaseBalls).toHaveBeenCalledWith('session-123', 'account-456', {
        splitBalls: true,
        splitAccountIds: null,
      });
    });

    it('passes legacy split option through', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: true,
        transactions: [],
        total_cents: 0,
      });

      await service.purchaseBalls('session-123', 'account-456', { split: true });

      expect(api.purchaseBalls).toHaveBeenCalledWith('session-123', 'account-456', {
        splitBalls: true,
        splitAccountIds: null,
      });
    });

    it('passes splitAccountIds option through', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: true,
        transactions: [],
        total_cents: 0,
      });

      await service.purchaseBalls('session-123', 'account-456', {
        splitAccountIds: ['acc-1', 'acc-2'],
      });

      expect(api.purchaseBalls).toHaveBeenCalledWith('session-123', 'account-456', {
        splitBalls: false,
        splitAccountIds: ['acc-1', 'acc-2'],
      });
    });

    it('passes legacy split_account_ids option through', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: true,
        transactions: [],
        total_cents: 0,
      });

      await service.purchaseBalls('session-123', 'account-456', {
        split_account_ids: ['acc-1', 'acc-2'],
      });

      expect(api.purchaseBalls).toHaveBeenCalledWith('session-123', 'account-456', {
        splitBalls: false,
        splitAccountIds: ['acc-1', 'acc-2'],
      });
    });

    it('logs debug message', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: true,
        transactions: [],
        total_cents: 0,
      });

      await service.purchaseBalls('session-123', 'account-456');

      expect(logger.debug).toHaveBeenCalledWith(
        'ApiService',
        'Purchasing balls for session: session-123, account: account-456'
      );
    });

    it('propagates API errors', async () => {
      const error = new Error('API failed');
      api.purchaseBalls.mockRejectedValue(error);

      await expect(service.purchaseBalls('session-123', 'account-456')).rejects.toThrow(
        'API failed'
      );
    });

    it('returns success: false when ok is false', async () => {
      api.purchaseBalls.mockResolvedValue({
        ok: false,
        transactions: [],
        total_cents: 0,
      });

      const result = await service.purchaseBalls('session-123', 'account-456');

      expect(result.success).toBe(false);
    });
  });
});
