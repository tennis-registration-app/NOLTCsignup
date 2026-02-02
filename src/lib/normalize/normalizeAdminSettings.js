// @ts-check

/**
 * Normalizes admin settings from API snake_case to internal camelCase.
 * This is the boundary translation point — snake_case enters, camelCase exits.
 *
 * @param {Object} raw - Raw API response from getSettings()
 * @returns {Object} Normalized settings with camelCase keys
 */
export function normalizeAdminSettingsResponse(raw) {
  return {
    operatingHours: normalizeOperatingHours(raw.operating_hours),
    upcomingOverrides: normalizeOverrides(raw.upcoming_overrides),
    settings: normalizeSettings(raw.settings),
  };
}

/**
 * Normalize flat settings object (ball price, guest fees, etc.)
 * @param {Object|null|undefined} settings - Raw settings from API
 * @returns {Object|null}
 */
export function normalizeSettings(settings) {
  if (!settings) return null;

  return {
    ballPriceCents: settings.ball_price_cents,
    ballBucketSize: settings.ball_bucket_size,
    guestFeeWeekdayCents: settings.guest_fee_weekday_cents,
    guestFeeWeekendCents: settings.guest_fee_weekend_cents,
    courtCount: settings.court_count,
    checkStatusMinutes: settings.check_status_minutes,
    blockWarningMinutes: settings.block_warning_minutes,
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
export function normalizeOperatingHours(hours) {
  if (!hours || !Array.isArray(hours)) return null;

  return hours.map((h) => ({
    dayOfWeek: h.day_of_week,
    dayName: h.day_name || DAY_NAMES[h.day_of_week],
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
export function normalizeOverrides(overrides) {
  if (!overrides || !Array.isArray(overrides)) return null;

  return overrides.map((o) => ({
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
export function denormalizeOperatingHours(hours) {
  return hours.map((h) => ({
    day_of_week: h.dayOfWeek,
    opens_at: h.opensAt,
    closes_at: h.closesAt,
    is_closed: h.isClosed,
  }));
}

/**
 * Denormalize a single override for API request (camelCase → snake_case)
 * @param {Object} override - Internal camelCase override
 * @returns {Object} API-ready snake_case override
 */
export function denormalizeOverride(override) {
  return {
    date: override.date,
    opens_at: override.opensAt,
    closes_at: override.closesAt,
    is_closed: override.isClosed,
    reason: override.reason,
  };
}
