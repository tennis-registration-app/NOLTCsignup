/**
 * Platform Module
 *
 * WP7.2: Exports for window/environment bridge utilities.
 */

export {
  getAppUtils,
  getTennisConfig,
  getAppEvents,
  isMobileView,
  isApiMode,
  getGeolocationService,
  isGlobalAvailable,
  // Tennis namespace
  ensureTennisNamespace,
  getTennis,
  getTennisDomain,
  getTennisCommands,
  getTennisDataStore,
  getTennisNamespaceConfig,
  getTennisStorage,
  getTennisUI,
  getTennisEvents,
} from './windowBridge.js';
