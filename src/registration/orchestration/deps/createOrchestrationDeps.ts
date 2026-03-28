/**
 * Orchestration Deps Factory
 *
 * This factory creates a small dependency object intended for INTERNAL
 * orchestrator implementation use.
 *
 * NOTE: This is NOT the same object as the existing v0 `deps` parameter passed
 * into assignCourtToGroupOrchestrated today. It will be introduced behind a
 * wrapper later without changing call sites.
 */

import { logger } from '../../../lib/logger';

export interface OrchestrationLogger {
  debug: (scope: string, msg: string, data?: unknown) => void;
  info: (scope: string, msg: string, data?: unknown) => void;
  warn: (scope: string, msg: string, data?: unknown) => void;
  error: (scope: string, msg: string, data?: unknown) => void;
}

export interface OrchestrationTime {
  now: () => number;
}

export interface OrchestrationRuntimeDeps {
  logger: OrchestrationLogger;
  time: OrchestrationTime;
}

const defaultTime: OrchestrationTime = {
  now: () => Date.now(),
};

/**
 * Create orchestration runtime deps with production defaults.
 */
export function createOrchestrationDeps(
  overrides: Partial<OrchestrationRuntimeDeps> = {}
): OrchestrationRuntimeDeps {
  return {
    logger: overrides.logger ?? logger,
    time: {
      ...defaultTime,
      ...(overrides.time ?? {}),
    },
  };
}
