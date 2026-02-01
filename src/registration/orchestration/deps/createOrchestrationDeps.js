/**
 * Orchestration Deps Factory (WP-HR4)
 *
 * This factory creates a small dependency object intended for INTERNAL
 * orchestrator implementation use in WP-HR4+.
 *
 * NOTE: This is NOT the same object as the existing v0 `deps` parameter passed
 * into assignCourtToGroupOrchestrated today. It will be introduced behind a
 * wrapper later in WP-HR4 without changing call sites.
 */

import { logger } from '../../../lib/logger.js';
import { getTennisDomain, getUI } from '../../../platform/windowBridge.js';

/**
 * @typedef {Object} OrchestrationRuntimeDeps
 * @property {Object} logger
 * @property {(scope: string, msg: string, data?: any) => void} logger.debug
 * @property {(scope: string, msg: string, data?: any) => void} logger.info
 * @property {(scope: string, msg: string, data?: any) => void} logger.warn
 * @property {(scope: string, msg: string, data?: any) => void} logger.error
 * @property {Object} platform
 * @property {() => any} platform.getTennisDomain
 * @property {() => any} platform.getUI
 * @property {Object} time
 * @property {() => number} time.now
 */

const defaultPlatform = {
  getTennisDomain,
  getUI,
};

const defaultTime = {
  now: () => Date.now(),
};

/**
 * Create orchestration runtime deps with production defaults.
 *
 * @param {Partial<OrchestrationRuntimeDeps>} [overrides]
 * @returns {OrchestrationRuntimeDeps}
 */
export function createOrchestrationDeps(overrides = {}) {
  return {
    logger: overrides.logger ?? logger,
    platform: {
      ...defaultPlatform,
      ...(overrides.platform ?? {}),
    },
    time: {
      ...defaultTime,
      ...(overrides.time ?? {}),
    },
  };
}
