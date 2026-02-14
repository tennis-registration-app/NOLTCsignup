/**
 * Mobile Shell Entry Point
 *
 * ESM bootstrap that replaces the legacy IIFE scripts.
 * Only loads Events adapter (required for health check) plus shell modules.
 */

import '../platform/attachLegacyEvents.js';
import './healthCheck.js';
import './mobileBridge.js';

console.log('[Mobile Shell] ESM bootstrap complete');
