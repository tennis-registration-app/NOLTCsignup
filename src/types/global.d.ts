/**
 * Global type declarations for legacy globals referenced by @ts-check files.
 *
 * Intentionally permissive to avoid scope creep.
 */

export {};

declare global {
  interface Window {
    Tennis?: {
      UI?: {
        toast?: (message: string, options?: { type?: string }) => void;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    UI?: {
      __mobileSendSuccess__?: () => void;
      [key: string]: unknown;
    };
  }
}
