import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the runtimeConfig module so we can control ADMIN_ACCESS_MODE per test
vi.mock('../../../../src/config/runtimeConfig.js', () => ({
  featureFlags: { ADMIN_ACCESS_MODE: 'open' },
}));

import { featureFlags } from '../../../../src/config/runtimeConfig.js';
import { checkAdminAccess, useAdminAccess } from '../../../../src/admin/guards/adminAccessGuard.js';

describe('adminAccessGuard', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    // Reset to default
    featureFlags.ADMIN_ACCESS_MODE = 'open';
  });

  describe('checkAdminAccess', () => {
    it('allows access in open mode (default)', () => {
      featureFlags.ADMIN_ACCESS_MODE = 'open';
      const result = checkAdminAccess();
      expect(result).toEqual({ allowed: true });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('allows access in authenticated mode with warning (auth not yet implemented)', () => {
      featureFlags.ADMIN_ACCESS_MODE = 'authenticated';
      const result = checkAdminAccess();
      expect(result).toEqual({ allowed: true });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('auth not yet implemented')
      );
    });

    it('allows access for unknown mode with warning', () => {
      featureFlags.ADMIN_ACCESS_MODE = 'banana';
      const result = checkAdminAccess();
      expect(result).toEqual({ allowed: true });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown ADMIN_ACCESS_MODE')
      );
    });

    it('defaults to open when no env var is set', () => {
      // The default in runtimeConfig is 'open' when VITE_ADMIN_ACCESS_MODE is unset
      featureFlags.ADMIN_ACCESS_MODE = 'open';
      const result = checkAdminAccess();
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('useAdminAccess', () => {
    it('returns the same result as checkAdminAccess', () => {
      featureFlags.ADMIN_ACCESS_MODE = 'open';
      const guardResult = checkAdminAccess();
      const hookResult = useAdminAccess();
      expect(hookResult).toEqual(guardResult);
    });
  });
});
