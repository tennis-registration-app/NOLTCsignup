// @ts-check
import { describe, it, expect, vi } from 'vitest';
import { getRuntimeConfig } from '../../../src/config/runtimeConfig.js';

/**
 * Tests for getRuntimeConfig validation behavior.
 *
 * Uses the env parameter test seam — passes plain objects instead of
 * mutating import.meta.env (which is read-only in Vite/Vitest).
 *
 * Validation matrix:
 * - env.PROD falsy: falls back to DEV_DEFAULTS (placeholders), warns in console
 * - env.PROD truthy: throws on placeholder or missing credentials
 */

describe('getRuntimeConfig', () => {
  describe('dev/test mode (PROD falsy)', () => {
    it('returns config with placeholder defaults when no env vars set', () => {
      const config = getRuntimeConfig({ PROD: false });

      expect(config.SUPABASE_URL).toBe('https://your-project.supabase.co');
      expect(config.SUPABASE_ANON_KEY).toBe('your-anon-key-here');
      expect(config.BASE_URL).toBe('https://your-project.supabase.co/functions/v1');
    });

    it('logs warning when using placeholder credentials', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      getRuntimeConfig({ PROD: false });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using placeholder credentials')
      );
      warnSpy.mockRestore();
    });

    it('does not warn when real credentials provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      getRuntimeConfig({
        PROD: false,
        VITE_SUPABASE_URL: 'https://real-project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'real-key-123',
      });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
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
    it('throws when placeholder URL is used', () => {
      expect(() => getRuntimeConfig({ PROD: true })).toThrow(
        /VITE_SUPABASE_URL \(still placeholder\)/
      );
    });

    it('throws when placeholder anon key is used', () => {
      expect(() =>
        getRuntimeConfig({
          PROD: true,
          VITE_SUPABASE_URL: 'https://real-project.supabase.co',
          // No anon key - falls back to placeholder
        })
      ).toThrow(/VITE_SUPABASE_ANON_KEY \(still placeholder\)/);
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

    it('throws helpful error message with docs reference', () => {
      expect(() => getRuntimeConfig({ PROD: true })).toThrow(
        /See docs\/ENVIRONMENT\.md/
      );
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
