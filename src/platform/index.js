/**
 * Platform Module
 *
 * Exports for window/environment bridge utilities
 * and window global setters (registerGlobals).
 */

export {
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

// Window global setters
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
