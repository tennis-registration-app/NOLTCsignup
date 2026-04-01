/**
 * normalizeAdminSettings tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeAdminSettingsResponse,
  normalizeSettings,
  normalizeOperatingHours,
  normalizeOverrides,
  denormalizeOperatingHours,
  denormalizeOverride,
} from '../../../../src/lib/normalize/normalizeAdminSettings.js';

// ── normalizeAdminSettingsResponse ───────────────────────────
describe('normalizeAdminSettingsResponse', () => {
  it('normalizes full API response', () => {
    const result = normalizeAdminSettingsResponse({
      operating_hours: [{ day_of_week: 0, opens_at: '08:00', closes_at: '20:00', is_closed: false }],
      upcoming_overrides: [{ date: '2024-12-25', opens_at: null, closes_at: null, is_closed: true, reason: 'Christmas' }],
      settings: { ball_price_cents: 500 },
    });
    expect(result.operatingHours).toHaveLength(1);
    expect(result.upcomingOverrides).toHaveLength(1);
    expect(result!.settings.ballPriceCents).toBe(500);
  });

  it('handles null sub-objects', () => {
    const result = normalizeAdminSettingsResponse({
      operating_hours: null,
      upcoming_overrides: null,
      settings: null,
    });
    expect(result.operatingHours).toBeNull();
    expect(result.upcomingOverrides).toBeNull();
    expect(result.settings).toBeNull();
  });
});

// ── normalizeSettings ────────────────────────────────────────
describe('normalizeSettings', () => {
  it('returns null for null input', () => {
    expect(normalizeSettings(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeSettings(undefined)).toBeNull();
  });

  it('maps all snake_case to camelCase', () => {
    const result = normalizeSettings({
      ball_price_cents: 500,
      ball_bucket_size: 3,
      guest_fee_weekday_cents: 1000,
      guest_fee_weekend_cents: 1500,
      court_count: 12,
      check_status_minutes: 5,
      block_warning_minutes: 15,
      auto_clear_enabled: true,
      auto_clear_minutes: 90,
    });
    expect(result!.ballPriceCents).toBe(500);
    expect(result!.ballBucketSize).toBe(3);
    expect(result!.guestFeeWeekdayCents).toBe(1000);
    expect(result!.guestFeeWeekendCents).toBe(1500);
    expect(result!.courtCount).toBe(12);
    expect(result!.checkStatusMinutes).toBe(5);
    expect(result!.blockWarningMinutes).toBe(15);
    expect(result!.autoClearEnabled).toBe(true);
    expect(result!.autoClearMinutes).toBe(90);
  });
});

// ── normalizeOperatingHours ──────────────────────────────────
describe('normalizeOperatingHours', () => {
  it('returns null for null input', () => {
    expect(normalizeOperatingHours(null)).toBeNull();
  });

  it('returns null for non-array', () => {
    expect(normalizeOperatingHours('string')).toBeNull();
  });

  it('normalizes hours with day_name', () => {
    const result = normalizeOperatingHours([
      { day_of_week: 1, day_name: 'Monday', opens_at: '08:00', closes_at: '20:00', is_closed: false },
    ]);
    expect(result![0].dayOfWeek).toBe(1);
    expect(result![0].dayName).toBe('Monday');
    expect(result![0].opensAt).toBe('08:00');
    expect(result![0].closesAt).toBe('20:00');
    expect(result![0].isClosed).toBe(false);
  });

  it('generates dayName from day_of_week when missing', () => {
    const result = normalizeOperatingHours([
      { day_of_week: 0, opens_at: '09:00', closes_at: '17:00', is_closed: false },
      { day_of_week: 6, opens_at: '09:00', closes_at: '17:00', is_closed: false },
    ]);
    expect(result![0].dayName).toBe('Sunday');
    expect(result![1].dayName).toBe('Saturday');
  });
});

// ── normalizeOverrides ───────────────────────────────────────
describe('normalizeOverrides', () => {
  it('returns null for null input', () => {
    expect(normalizeOverrides(null)).toBeNull();
  });

  it('returns null for non-array', () => {
    expect(normalizeOverrides({})).toBeNull();
  });

  it('normalizes overrides', () => {
    const result = normalizeOverrides([
      { date: '2024-12-25', opens_at: null, closes_at: null, is_closed: true, reason: 'Holiday' },
    ]);
    expect(result![0].date).toBe('2024-12-25');
    expect(result![0].opensAt).toBeNull();
    expect(result![0].isClosed).toBe(true);
    expect(result![0].reason).toBe('Holiday');
  });
});

// ── denormalizeOperatingHours ─────────────────────────────────
describe('denormalizeOperatingHours', () => {
  it('converts camelCase back to snake_case', () => {
    const result = denormalizeOperatingHours([
      { dayOfWeek: 1, opensAt: '08:00', closesAt: '20:00', isClosed: false },
    ]);
    expect(result[0].day_of_week).toBe(1);
    expect(result[0].opens_at).toBe('08:00');
    expect(result[0].closes_at).toBe('20:00');
    expect(result[0].is_closed).toBe(false);
  });
});

// ── denormalizeOverride ──────────────────────────────────────
describe('denormalizeOverride', () => {
  it('converts camelCase back to snake_case', () => {
    const result = denormalizeOverride({
      date: '2024-12-25',
      opensAt: null,
      closesAt: null,
      isClosed: true,
      reason: 'Christmas',
    });
    expect(result.date).toBe('2024-12-25');
    expect(result.opens_at).toBeNull();
    expect(result.closes_at).toBeNull();
    expect(result.is_closed).toBe(true);
    expect(result.reason).toBe('Christmas');
  });
});
