/**
 * PurchaseBallsCommand — Request to purchase balls for a session
 */

import { z } from 'zod';

const COMMAND_VERSION = '1.0';

/**
 * PurchaseBallsCommand schema
 */
export const PurchaseBallsCommandSchema = z.object({
  commandVersion: z.string().default(COMMAND_VERSION),
  sessionId: z.string().min(1, 'sessionId is required'),
  accountId: z.string().min(1, 'accountId is required'),
  splitBalls: z.boolean().default(false),
  splitAccountIds: z.array(z.string()).nullable().optional(),
  idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
});

/**
 * @typedef {z.infer<typeof PurchaseBallsCommandSchema>} PurchaseBallsCommand
 */

/**
 * Build and validate a PurchaseBallsCommand
 * @param {Object} input - Raw input from UI
 * @returns {PurchaseBallsCommand}
 * @throws {Error} If validation fails
 */
export function buildPurchaseBallsCommand(input) {
  // Generate idempotency key if not provided
  const inputWithKey = {
    ...input,
    idempotencyKey: input.idempotencyKey || `pb-${input.sessionId}-${Date.now()}`,
  };

  const result = PurchaseBallsCommandSchema.safeParse(inputWithKey);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid PurchaseBallsCommand: ${errors}`);
  }
  return result.data;
}

/**
 * Convert command to API payload
 * @param {PurchaseBallsCommand} command
 * @returns {Object}
 */
export function toPurchaseBallsPayload(command) {
  return {
    session_id: command.sessionId,
    account_id: command.accountId,
    split_balls: command.splitBalls,
    split_account_ids: command.splitAccountIds,
    idempotency_key: command.idempotencyKey,
  };
}
