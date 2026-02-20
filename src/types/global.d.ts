/**
 * Global type declarations for legacy globals referenced by @ts-check files.
 *
 * Intentionally permissive to avoid scope creep.
 */

export {};

declare global {
  interface Window {
    // --- Tennis platform namespace ---
    Tennis?: {
      UI?: {
        toast?: (message: string, options?: { type?: string }) => void;
        [key: string]: any;
      };
      Events?: { on?: Function; off?: Function; emit?: Function; emitDom?: Function; [key: string]: any };
      DataStore?: { get?: Function; set?: Function; [key: string]: any };
      Storage?: { readDataSafe?: Function; [key: string]: any };
      Config?: {
        Courts?: { TOTAL_COUNT?: number; [key: string]: any };
        Timing?: { AVG_GAME?: number; [key: string]: any };
        BLOCKS?: { [key: string]: any };
        [key: string]: any;
      };
      Domain?: {
        availability?: Record<string, Function>;
        Availability?: Record<string, Function>;
        roster?: Record<string, any>;
        [key: string]: any;
      };
      Diagnostics?: { getLog?: Function; runAll?: Function; [key: string]: any };
      Blocks?: { saveBlocks?: Function; [key: string]: any };
      Time?: Record<string, any>;
      time?: Record<string, any>;
      Commands?: { reorderWaitlist?: Function; [key: string]: any };
      deviceId?: string;
      [key: string]: any;
    };
    TENNIS_CONFIG?: Record<string, unknown>;

    // --- UI / Registration namespace ---
    UI?: {
      __mobileSendSuccess__?: () => void;
      [key: string]: unknown;
    };
    RegistrationUI?: Record<string, unknown>;

    // --- Backend / API ---
    BL?: { fetch?: Function; [key: string]: unknown };
    DataStore?: { get?: Function; set?: Function; [key: string]: unknown };
    NOLTC_USE_API?: boolean;

    // --- Courtboard state ---
    CourtboardState?: Record<string, any>;
    getCourtboardState?: () => Record<string, any>;
    isCourtboardStateReady?: () => boolean;
    CourtAvailability?: Record<string, unknown>;
    refreshBoard?: () => void;
    updateJoinButtonState?: (courts: unknown) => void;
    updateJoinButtonForMobile?: (courtNum?: number) => void;

    // --- Mobile shell / bridge ---
    IS_MOBILE_VIEW?: boolean;
    MobileModal?: { show?: Function; hide?: Function; [key: string]: unknown };
    MobileBridge?: Record<string, unknown>;
    mobileTapToRegister?: (courtNumber?: number) => boolean;
    __mobileFlow?: boolean;
    __memberRoster?: any[];
    showReg?: (courtNumber?: number) => void;
    showRegOverlayOnly?: () => void;
    hideReg?: () => void;
    _registrationTimeout?: ReturnType<typeof setTimeout>;

    // --- Admin ---
    refreshAdminView?: () => void;
    scheduleAdminRefresh?: (delayMs?: number) => void;
    __adminRefreshPending?: boolean;
    __adminCoalesceHits?: number;
    __wiredAdminListeners?: boolean;
    loadData?: () => Promise<void>;

    // --- Debug / Dev ---
    DEBUG?: boolean;
    APP_UTILS?: Record<string, unknown>;
    GeolocationService?: Record<string, unknown>;
  }
}
