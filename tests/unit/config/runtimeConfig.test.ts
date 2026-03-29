// @ts-check
import { describe, it, expect } from 'vitest';
import { getRuntimeConfig } from '../../../src/config/runtimeConfig.js';

/**
 * Tests for getRuntimeConfig validation behavior.
 *
 * Uses the env parameter test seam — passes plain objects instead of
 * mutating import.meta.env (which is read-only in Vite/Vitest).
 *
 * Validation matrix:
 * - env.PROD falsy: falls back to DEV_DEFAULTS silently
 * - env.PROD truthy: throws on missing env vars (empty values) OR on values
 *   that still equal DEV_DEFAULTS (to prevent silent misconfigured deployments
 *   from hitting the dev Supabase project instead of production)
 */

describe('getRuntimeConfig', () => {
  describe('dev/test mode (PROD falsy)', () => {
    it('returns config with dev defaults when no env vars set', () => {
      const config = getRuntimeConfig({ PROD: false });

      expect(config.SUPABASE_URL).toBeTruthy();
      expect(config.SUPABASE_ANON_KEY).toBeTruthy();
      expect(config.BASE_URL).toBeTruthy();
    });

    it('returns a frozen object', () => {
      const config = getRuntimeConfig({ PROD: false });

      expect(Object.isFrozen(config)).toBe(true);
    });

    it('uses env vars when provided', () => {
      const config = getRuntimeConfig({
        PROD: false,
        VITE_SUPABASE_URL: 'https://test-project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key-123',
        VITE_BASE_URL: 'https://test-base.example.com',
      });

      expect(config.SUPABASE_URL).toBe('https://test-project.supabase.co');
      expect(config.SUPABASE_ANON_KEY).toBe('test-anon-key-123');
      expect(config.BASE_URL).toBe('https://test-base.example.com');
    });

    it('does not throw when env vars are missing', () => {
      expect(() => getRuntimeConfig({ PROD: false })).not.toThrow();
    });

    it('does not throw when PROD is undefined', () => {
      expect(() => getRuntimeConfig({})).not.toThrow();
    });
  });

  describe('production mode (PROD truthy)', () => {
    it('throws when dev defaults are used (production must supply explicit credentials)', () => {
      // Dev defaults must be rejected in production to prevent misconfigured deployments
      // from silently hitting the dev Supabase project instead of production.
      expect(() => getRuntimeConfig({ PROD: true })).toThrow(
        'still using dev defaults'
      );
    });

    it('does not throw when valid production env vars are set', () => {
      expect(() =>
        getRuntimeConfig({
          PROD: true,
          VITE_SUPABASE_URL: 'https://prod-project.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'prod-real-anon-key-xyz',
          VITE_BASE_URL: 'https://prod-base.example.com',
        })
      ).not.toThrow();
    });

    it('throws when env vars are empty strings (falls back to dev defaults, which are rejected in production)', () => {
      // Empty strings trigger || fallback to DEV_DEFAULTS.
      // DEV_DEFAULTS are then detected and rejected — same protection as omitting vars entirely.
      expect(() =>
        getRuntimeConfig({
          PROD: true,
          VITE_SUPABASE_URL: '',
          VITE_SUPABASE_ANON_KEY: '',
          VITE_BASE_URL: '',
        })
      ).toThrow('still using dev defaults');
    });

    it('uses provided values over dev defaults', () => {
      const config = getRuntimeConfig({
        PROD: true,
        VITE_SUPABASE_URL: 'https://prod.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'prod-key-abc',
        VITE_BASE_URL: 'https://prod-api.example.com',
      });

      expect(config.SUPABASE_URL).toBe('https://prod.supabase.co');
      expect(config.SUPABASE_ANON_KEY).toBe('prod-key-abc');
      expect(config.BASE_URL).toBe('https://prod-api.example.com');
    });
  });

  describe('BASE_URL derivation', () => {
    it('derives BASE_URL from SUPABASE_URL when not explicitly set', () => {
      const config = getRuntimeConfig({
        PROD: false,
        VITE_SUPABASE_URL: 'https://my-project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'my-key',
        // No VITE_BASE_URL
      });

      expect(config.BASE_URL).toBe('https://my-project.supabase.co/functions/v1');
    });

    it('uses explicit BASE_URL when provided', () => {
      const config = getRuntimeConfig({
        PROD: false,
        VITE_SUPABASE_URL: 'https://my-project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'my-key',
        VITE_BASE_URL: 'https://custom-api.example.com',
      });

      expect(config.BASE_URL).toBe('https://custom-api.example.com');
    });
  });

  describe('config shape', () => {
    it('returns exactly three keys', () => {
      const config = getRuntimeConfig({ PROD: false });

      expect(Object.keys(config)).toHaveLength(3);
      expect(Object.keys(config).sort()).toEqual(['BASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_URL']);
    });
  });
});
