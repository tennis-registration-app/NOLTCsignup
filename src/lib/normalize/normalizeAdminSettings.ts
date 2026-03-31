// @ts-check

export interface OperatingHoursEntry {
  dayOfWeek: unknown;
  dayName: unknown;
  opensAt: unknown;
  closesAt: unknown;
  isClosed: unknown;
}

/**
 * Normalizes admin settings from API snake_case to internal camelCase.
 * This is the boundary translation point — snake_case enters, camelCase exits.
 *
 * @param {Object} raw - Raw API response from getSettings()
 * @returns {Object} Normalized settings with camelCase keys
 */
export function normalizeAdminSettingsResponse(raw: Record<string, unknown>) {
  return {
    operatingHours: normalizeOperatingHours(raw.operating_hours as unknown[] | null),
    upcomingOverrides: normalizeOverrides(raw.upcoming_overrides as unknown[] | null),
    settings: normalizeSettings(raw.settings as Record<string, unknown> | null),
  };
}

/**
 * Normalize flat settings object (ball price, guest fees, etc.)
 * @param {Object|null|undefined} settings - Raw settings from API
 * @returns {Object|null}
 */
export function normalizeSettings(settings: Record<string, unknown> | null | undefined): {
  ballPriceCents: number | null;
  ballBucketSize: number | null;
  guestFeeWeekdayCents: number | null;
  guestFeeWeekendCents: number | null;
  courtCount: number | null;
  checkStatusMinutes: unknown;
  blockWarningMinutes: unknown;
  autoClearEnabled: unknown;
  autoClearMinutes: unknown;
} | null {
  if (!settings) return null;

  return {
    ballPriceCents: settings.ball_price_cents != null ? Number(settings.ball_price_cents) : null,
    ballBucketSize: settings.ball_bucket_size != null ? Number(settings.ball_bucket_size) : null,
    guestFeeWeekdayCents: settings.guest_fee_weekday_cents != null ? Number(settings.guest_fee_weekday_cents) : null,
    guestFeeWeekendCents: settings.guest_fee_weekend_cents != null ? Number(settings.guest_fee_weekend_cents) : null,
    courtCount: settings.court_count != null ? Number(settings.court_count) : null,
    checkStatusMinutes: settings.check_status_minutes,
    blockWarningMinutes: settings.block_warning_minutes,
    autoClearEnabled: settings.auto_clear_enabled,
    autoClearMinutes: settings.auto_clear_minutes,
  };
}

/**
 * Day names for UI display
 */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Normalize operating hours array
 * @param {Array|null|undefined} hours - Raw operating hours from API
 * @returns {Array|null}
 */
export function normalizeOperatingHours(hours: unknown[] | null | undefined) {
  if (!hours || !Array.isArray(hours)) return null;

  return (hours as Record<string, unknown>[]).map((h) => ({
    dayOfWeek: h.day_of_week,
    dayName: h.day_name || DAY_NAMES[h.day_of_week as number],
    opensAt: h.opens_at,
    closesAt: h.closes_at,
    isClosed: h.is_closed,
  }));
}

/**
 * Normalize overrides array
 * @param {Array|null|undefined} overrides - Raw overrides from API
 * @returns {Array|null}
 */
export function normalizeOverrides(overrides: unknown[] | null | undefined) {
  if (!overrides || !Array.isArray(overrides)) return null;

  return (overrides as Record<string, unknown>[]).map((o) => ({
    date: o.date,
    opensAt: o.opens_at,
    closesAt: o.closes_at,
    isClosed: o.is_closed,
    reason: o.reason,
  }));
}

/**
 * Denormalize operating hours for API request (camelCase → snake_case)
 * @param {Array} hours - Internal camelCase hours
 * @returns {Array} API-ready snake_case hours
 */
export function denormalizeOperatingHours(hours: Record<string, unknown>[]): { day_of_week: number; opens_at: string; closes_at: string; is_closed: boolean }[] {
  return hours.map((h) => ({
    day_of_week: Number(h.dayOfWeek),
    opens_at: String(h.opensAt || ''),
    closes_at: String(h.closesAt || ''),
    is_closed: Boolean(h.isClosed),
  }));
}

/**
 * Denormalize a single override for API request (camelCase → snake_case)
 * @param {Object} override - Internal camelCase override
 * @returns {Object} API-ready snake_case override
 */
export function denormalizeOverride(override: Record<string, unknown>) {
  return {
    date: override.date,
    opens_at: override.opensAt,
    closes_at: override.closesAt,
    is_closed: override.isClosed,
    reason: override.reason,
  };
}
