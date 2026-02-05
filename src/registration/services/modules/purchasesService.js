/**
 * Purchases operations extracted from ApiTennisService.
 *
 * WP5-D7a: purchaseBalls mutation.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Object} deps.logger - Logger instance
 */
export function createPurchasesService({ api, logger }) {
  async function purchaseBalls(sessionId, accountId, options = {}) {
    logger.debug('ApiService', `Purchasing balls for session: ${sessionId}, account: ${accountId}`);

    const result = await api.purchaseBalls(sessionId, accountId, {
      splitBalls: options.split || options.splitBalls || false,
      splitAccountIds: options.splitAccountIds || options.split_account_ids || null,
    });

    return {
      success: result.ok,
      transactions: result.transactions,
      totalCents: result.total_cents,
    };
  }

  return {
    purchaseBalls,
  };
}
