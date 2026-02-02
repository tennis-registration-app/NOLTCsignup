/**
 * Platform Module
 *
 * WP7.2: Exports for window/environment bridge utilities.
 * WP4-3: Exports for window global setters (registerGlobals).
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

// WP4-3: Window global setters
export {
  setTennisGlobal,
  ensureTennisGlobal,
  setGeolocationServiceGlobal,
  setNoltcUseApiGlobal,
  setLoadDataGlobal,
  setRefreshBoardGlobal,
  setRefreshAdminViewGlobal,
  setAdminRefreshPending,
  getAdminRefreshPending,
  setAdminCoalesceHits,
  getAdminCoalesceHits,
  incrementAdminCoalesceHits,
  setScheduleAdminRefreshGlobal,
  setWiredAdminListeners,
  getWiredAdminListeners,
} from './registerGlobals.js';
