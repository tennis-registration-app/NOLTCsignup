/**
 * useMobileFlowController - hook coverage
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../../../../../src/lib/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useMobileFlowController } from '../../../../../src/registration/ui/mobile/useMobileFlowController';

function makeBackend(overrides = {}) {
  return {
    commands: {
      assignFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      ...overrides,
    },
  };
}

function makeDeps(overrides = {}) {
  return {
    showSuccess: false,
    justAssignedCourt: null,
    backend: makeBackend(),
    isMobile: false,
    toast: vi.fn(),
    dbg: vi.fn(),
    DEBUG: false,
    ...overrides,
  };
}

function createHarness(deps) {
  let currentDeps = deps;
  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useMobileFlowController(currentDeps);
    useImperativeHandle(ref, () => hook);
    return null;
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<ReturnType<typeof useMobileFlowController>>() as { current: ReturnType<typeof useMobileFlowController> };
  act(() => { root.render(React.createElement(Wrapper, { ref })); });
  return {
    getHook: () => ref.current,
    rerender: (newDeps) => {
      currentDeps = { ...currentDeps, ...newDeps };
      act(() => { root.render(React.createElement(Wrapper, { ref })); });
    },
    unmount: () => { act(() => { root.unmount(); }); container.remove(); },
  };
}

describe('useMobileFlowController', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('initialises all state values to their defaults', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      const hook = getHook();
      expect(hook.mobileFlow).toBe(false);
      expect(hook.preselectedCourt).toBe(null);
      expect(hook.mobileMode).toBe(null);
      expect(hook.mobileCountdown).toBe(5);
      expect(hook.checkingLocation).toBe(false);
      expect(hook.locationToken).toBe(null);
      expect(hook.showQRScanner).toBe(false);
      expect(hook.gpsFailedPrompt).toBe(false);
      unmount();
    });

    it('exposes all setter functions', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      const hook = getHook();
      expect(typeof hook.setMobileFlow).toBe('function');
      expect(typeof hook.setPreselectedCourt).toBe('function');
      expect(typeof hook.setMobileMode).toBe('function');
      expect(typeof hook.setCheckingLocation).toBe('function');
      expect(typeof hook.setLocationToken).toBe('function');
      expect(typeof hook.setShowQRScanner).toBe('function');
      expect(typeof hook.setGpsFailedPrompt).toBe('function');
      unmount();
    });
  });

  describe('getMobileGeolocation', () => {
    it('returns null when isMobile is false', async () => {
      const { getHook, unmount } = createHarness(makeDeps({ isMobile: false }));
      const result = await getHook().getMobileGeolocation();
      expect(result).toBe(null);
      unmount();
    });

    it('returns location_token object when locationToken is set and isMobile is true', async () => {
      const { getHook, unmount } = createHarness(makeDeps({ isMobile: true }));
      act(() => { getHook().setLocationToken('tok-abc'); });
      const result = await getHook().getMobileGeolocation();
      expect(result).toEqual({ location_token: 'tok-abc' });
      unmount();
    });

    it('resolves null when isMobile=true, no token, geolocation not available', async () => {
      const originalGeo = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
      const { getHook, unmount } = createHarness(makeDeps({ isMobile: true }));
      const result = await getHook().getMobileGeolocation();
      expect(result).toBe(null);
      Object.defineProperty(navigator, 'geolocation', { value: originalGeo, configurable: true });
      unmount();
    });

    it('resolves coords when geolocation succeeds', async () => {
      const mockGeo = {
        getCurrentPosition: vi.fn((success) => {
          success({ coords: { latitude: 29.9511, longitude: -90.0715 } });
        }),
      };
      Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });
      const { getHook, unmount } = createHarness(makeDeps({ isMobile: true }));
      const result = await getHook().getMobileGeolocation();
      expect(result).toEqual({ latitude: 29.9511, longitude: -90.0715 });
      unmount();
    });

    it('resolves null when geolocation errors', async () => {
      const mockGeo = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ message: 'denied' });
        }),
      };
      Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });
      const { getHook, unmount } = createHarness(makeDeps({ isMobile: true }));
      const result = await getHook().getMobileGeolocation();
      expect(result).toBe(null);
      unmount();
    });
  });

  describe('onQRScanToken', () => {
    it('sets locationToken to the scanned value', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => { getHook().setShowQRScanner(true); });
      act(() => { getHook().onQRScanToken('qr-token-123'); });
      expect(getHook().locationToken).toBe('qr-token-123');
      unmount();
    });

    it('closes the QR scanner after a scan', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => { getHook().setShowQRScanner(true); });
      act(() => { getHook().onQRScanToken('qr-token-123'); });
      expect(getHook().showQRScanner).toBe(false);
      unmount();
    });

    it('clears gpsFailedPrompt after a scan', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => { getHook().setGpsFailedPrompt(true); });
      act(() => { getHook().onQRScanToken('qr-token-123'); });
      expect(getHook().gpsFailedPrompt).toBe(false);
      unmount();
    });

    it('calls toast with success message after a scan', () => {
      const toast = vi.fn();
      const { getHook, unmount } = createHarness(makeDeps({ toast }));
      act(() => { getHook().onQRScanToken('qr-token-123'); });
      expect(toast).toHaveBeenCalledWith('Location verified! You can now register.', { type: 'success' });
      unmount();
    });

    it('does not throw when toast is null', () => {
      const { getHook, unmount } = createHarness(makeDeps({ toast: null }));
      expect(() => { act(() => { getHook().onQRScanToken('tok'); }); }).not.toThrow();
      unmount();
    });
  });

  describe('QR scanner controls', () => {
    it('openQRScanner sets showQRScanner to true', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => { getHook().openQRScanner(); });
      expect(getHook().showQRScanner).toBe(true);
      unmount();
    });

    it('onQRScannerClose sets showQRScanner to false', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => { getHook().setShowQRScanner(true); });
      act(() => { getHook().onQRScannerClose(); });
      expect(getHook().showQRScanner).toBe(false);
      unmount();
    });

    it('dismissGpsPrompt sets gpsFailedPrompt to false', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => { getHook().setGpsFailedPrompt(true); });
      act(() => { getHook().dismissGpsPrompt(); });
      expect(getHook().gpsFailedPrompt).toBe(false);
      unmount();
    });
  });

  describe('requestMobileReset', () => {
    it('does NOT call postMessage when not in an iframe (window.top === window.self)', () => {
      const postMessage = vi.spyOn(window.parent, 'postMessage');
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => { getHook().requestMobileReset(); });
      expect(postMessage).not.toHaveBeenCalled();
      postMessage.mockRestore();
      unmount();
    });
  });

  describe("message listener: type='register'", () => {
    it("sets mobileFlow=true on 'register' message", () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'register' } }));
      });
      expect(getHook().mobileFlow).toBe(true);
      unmount();
    });

    it("sets preselectedCourt when courtNumber provided in 'register' message", () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'register', courtNumber: 3 } }));
      });
      expect(getHook().preselectedCourt).toBe(3);
      unmount();
    });

    it("does NOT set preselectedCourt when courtNumber is absent in 'register' message", () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'register' } }));
      });
      expect(getHook().preselectedCourt).toBe(null);
      unmount();
    });

    it('ignores messages with unknown types', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'unknown-type' } }));
      });
      expect(getHook().mobileFlow).toBe(false);
      unmount();
    });
  });

  describe("message listener: type='assign-from-waitlist'", () => {
    it("sets mobileFlow=true and mobileMode='silent-assign' on message", async () => {
      const backend = makeBackend();
      const { getHook, unmount } = createHarness(makeDeps({ backend }));
      await act(async () => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'assign-from-waitlist', waitlistEntryId: 'w1', courtNumber: 2 },
        }));
        await Promise.resolve();
      });
      expect(getHook().mobileFlow).toBe(true);
      expect(getHook().mobileMode).toBe('silent-assign');
      unmount();
    });

    it('calls backend.commands.assignFromWaitlist with correct args', async () => {
      const backend = makeBackend();
      const { unmount } = createHarness(makeDeps({ backend }));
      await act(async () => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'assign-from-waitlist', waitlistEntryId: 'w99', courtNumber: 5 },
        }));
        await Promise.resolve();
      });
      expect(backend.commands.assignFromWaitlist).toHaveBeenCalledWith({
        waitlistEntryId: 'w99',
        courtNumber: 5,
      });
      unmount();
    });

    it('shows error toast and resets mobileMode on assignment failure (ok:false)', async () => {
      const toast = vi.fn();
      const backend = makeBackend({
        assignFromWaitlist: vi.fn().mockResolvedValue({ ok: false, message: 'Court taken' }),
      });
      const { getHook, unmount } = createHarness(makeDeps({ backend, toast }));
      await act(async () => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'assign-from-waitlist', waitlistEntryId: 'w1', courtNumber: 1 },
        }));
        await Promise.resolve();
      });
      expect(toast).toHaveBeenCalledWith('Court taken', { type: 'error' });
      expect(getHook().mobileMode).toBe(null);
      unmount();
    });

    it('shows generic error toast on thrown exception', async () => {
      const toast = vi.fn();
      const backend = makeBackend({
        assignFromWaitlist: vi.fn().mockRejectedValue(new Error('network')),
      });
      const { getHook, unmount } = createHarness(makeDeps({ backend, toast }));
      await act(async () => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'assign-from-waitlist', waitlistEntryId: 'w1', courtNumber: 1 },
        }));
        await Promise.resolve();
      });
      expect(toast).toHaveBeenCalledWith('Error assigning court', { type: 'error' });
      expect(getHook().mobileMode).toBe(null);
      unmount();
    });
  });

  describe('success signal effect', () => {
    beforeEach(() => { vi.useFakeTimers(); });

    // Note: the countdown branch inside this effect is guarded by
    // window.top !== window.self. In jsdom these are equal, so the
    // postMessage + countdown block does NOT execute. We verify the
    // hook correctly leaves mobileCountdown at its initial value (5)
    // under these conditions.

    it('mobileCountdown stays at initial value (5) when showSuccess+mobileFlow but not in iframe (jsdom)', () => {
      const { getHook, rerender, unmount } = createHarness(makeDeps());
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'register', courtNumber: 1 } }));
      });
      rerender({ showSuccess: true });
      act(() => { vi.advanceTimersByTime(5000); });
      // Window is not embedded in jsdom, so countdown block is skipped
      expect(getHook().mobileCountdown).toBe(5);
      unmount();
    });

    it('mobileCountdown is not altered when showSuccess changes but mobileFlow is false', () => {
      const { getHook, rerender, unmount } = createHarness(makeDeps());
      rerender({ showSuccess: true });
      act(() => { vi.advanceTimersByTime(5000); });
      expect(getHook().mobileCountdown).toBe(5);
      unmount();
    });

    it('mobileCountdown is not altered when mobileFlow is true but showSuccess is false', () => {
      const { getHook, unmount } = createHarness(makeDeps());
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'register', courtNumber: 1 } }));
      });
      act(() => { vi.advanceTimersByTime(5000); });
      expect(getHook().mobileCountdown).toBe(5);
      unmount();
    });

    it('does NOT start countdown when mobileFlow is false', () => {
      const { getHook, rerender, unmount } = createHarness(makeDeps());
      rerender({ showSuccess: true });
      act(() => { vi.advanceTimersByTime(3000); });
      expect(getHook().mobileCountdown).toBe(5);
      unmount();
    });
  });
});
