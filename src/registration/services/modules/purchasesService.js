import { normalizeServiceError } from '@lib/errors';

/**
 * Purchases operations extracted from ApiTennisService.
 *
 * purchaseBalls mutation.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Object} deps.logger - Logger instance
 */
export function createPurchasesService({ api, logger }) {
  async function purchaseBalls(sessionId, accountId, options = {}) {
    try {
      logger.debug(
        'ApiService',
        `Purchasing balls for session: ${sessionId}, account: ${accountId}`
      );

      const result = await api.purchaseBalls(sessionId, accountId, {
        splitBalls: options.split || options.splitBalls || false,
        splitAccountIds: options.splitAccountIds || options.split_account_ids || null,
      });

      return {
        success: result.ok,
        transactions: result.transactions,
        totalCents: result.total_cents,
      };
    } catch (error) {
      throw normalizeServiceError(error, { service: 'purchasesService', op: 'purchaseBalls' });
    }
  }

  return {
    purchaseBalls,
  };
}
