/**
 * SystemSettings Component
 *
 * Admin settings for pricing, operating hours, and holiday overrides.
 * Self-contained component that manages its own state and API calls.
 */
import React, { useState, useEffect, useCallback } from 'react';

const SystemSettings = ({ backend, onSettingsChanged }) => {
  // Settings state
  const [, setSettings] = useState({
    tennisBallPrice: 5.0,
    guestFees: { weekday: 15.0, weekend: 20.0 },
  }); // Getter unused, setter used
  const [ballPriceInput, setBallPriceInput] = useState('5.00');
  const [weekdayFeeInput, setWeekdayFeeInput] = useState('15.00');
  const [weekendFeeInput, setWeekendFeeInput] = useState('20.00');
  const [pricingChanged, setPricingChanged] = useState(false);

  // Auto-clear settings state
  const [autoClearEnabled, setAutoClearEnabled] = useState(false);
  const [autoClearMinutes, setAutoClearMinutes] = useState('180');
  const [checkStatusMinutes, setCheckStatusMinutes] = useState('150');
  const [blockWarningMinutes, setBlockWarningMinutes] = useState('60');
  const [autoClearChanged, setAutoClearChanged] = useState(false);
  const [autoClearError, setAutoClearError] = useState(null);

  // Operating hours state
  const [operatingHours, setOperatingHours] = useState([]);
  const [hoursChanged, setHoursChanged] = useState(false);

  // Hours overrides state
  const [hoursOverrides, setHoursOverrides] = useState([]);

  // Override form state
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideOpens, setOverrideOpens] = useState('06:00');
  const [overrideCloses, setOverrideCloses] = useState('21:00');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideClosed, setOverrideClosed] = useState(false);
  const [overrideErrors, setOverrideErrors] = useState({});

  // Loading state
  const [loading, setLoading] = useState(true);

  // Save status state for each card
  const [pricingSaveStatus, setPricingSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [hoursSaveStatus, setHoursSaveStatus] = useState(null);
  const [, setOverrideSaveStatus] = useState(null); // Getter unused, setter used
  const [autoClearSaveStatus, setAutoClearSaveStatus] = useState(null);

  // Day names for operating hours
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch settings on mount
  const loadSettings = useCallback(async () => {
    if (!backend?.admin?.getSettings) return;

    try {
      const result = await backend.admin.getSettings();
      if (result.ok) {
        // Update settings
        const newSettings = {
          tennisBallPrice: (result.settings?.ball_price_cents || 500) / 100,
          guestFees: {
            weekday: (result.settings?.guest_fee_weekday_cents || 1500) / 100,
            weekend: (result.settings?.guest_fee_weekend_cents || 2000) / 100,
          },
        };
        setSettings(newSettings);
        setBallPriceInput(newSettings.tennisBallPrice.toFixed(2));
        setWeekdayFeeInput(newSettings.guestFees.weekday.toFixed(2));
        setWeekendFeeInput(newSettings.guestFees.weekend.toFixed(2));

        // Update auto-clear settings
        setAutoClearEnabled(result.settings?.auto_clear_enabled === 'true');
        setAutoClearMinutes(result.settings?.auto_clear_minutes || '180');
        setCheckStatusMinutes(result.settings?.check_status_minutes || '150');
        setBlockWarningMinutes(result.settings?.block_warning_minutes || '60');

        // Update operating hours
        if (result.operating_hours) {
          const hours = result.operating_hours.map((h) => ({
            ...h,
            day_name: dayNames[h.day_of_week],
          }));
          setOperatingHours(hours);
        }

        // Update overrides
        if (result.upcoming_overrides) {
          setHoursOverrides(result.upcoming_overrides);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Clear override error for a specific field
  const clearOverrideError = (field) => {
    if (overrideErrors[field]) {
      setOverrideErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validate override form
  const validateOverrideForm = () => {
    const errors = {};

    if (!overrideDate) {
      errors.date = 'Date is required';
    }

    if (!overrideReason.trim()) {
      errors.reason = 'Reason is required';
    }

    if (!overrideClosed && overrideOpens && overrideCloses && overrideOpens >= overrideCloses) {
      errors.times = 'Opening time must be before closing time';
    }

    setOverrideErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle pricing input changes (local state only)
  const handlePricingChange = (field, value) => {
    if (field === 'ballPrice') setBallPriceInput(value);
    if (field === 'weekdayFee') setWeekdayFeeInput(value);
    if (field === 'weekendFee') setWeekendFeeInput(value);
    setPricingChanged(true);
  };

  // Save all pricing settings
  const savePricing = async () => {
    if (!backend?.admin?.updateSettings) return;

    setPricingSaveStatus('saving');
    try {
      const ballPrice = parseFloat(ballPriceInput) || 0;
      const weekdayFee = parseFloat(weekdayFeeInput) || 0;
      const weekendFee = parseFloat(weekendFeeInput) || 0;

      const result = await backend.admin.updateSettings({
        settings: {
          ball_price_cents: Math.round(ballPrice * 100),
          guest_fee_weekday_cents: Math.round(weekdayFee * 100),
          guest_fee_weekend_cents: Math.round(weekendFee * 100),
        },
      });

      if (result.ok) {
        setSettings({
          tennisBallPrice: ballPrice,
          guestFees: { weekday: weekdayFee, weekend: weekendFee },
        });
        setPricingChanged(false);
        setPricingSaveStatus('saved');
        setTimeout(() => setPricingSaveStatus(null), 2000);
        if (onSettingsChanged) onSettingsChanged();
      }
    } catch (err) {
      console.error('Failed to save pricing:', err);
      setPricingSaveStatus('error');
    }
  };

  // Handle auto-clear setting changes
  const handleAutoClearChange = (field, value) => {
    if (field === 'enabled') setAutoClearEnabled(value);
    if (field === 'autoClearMinutes') setAutoClearMinutes(value);
    if (field === 'checkStatusMinutes') setCheckStatusMinutes(value);
    if (field === 'blockWarningMinutes') setBlockWarningMinutes(value);
    setAutoClearChanged(true);
    setAutoClearError(null);
  };

  // Save auto-clear settings
  const saveAutoClear = async () => {
    if (!backend?.admin?.updateSettings) return;

    // Client-side validation
    const autoMin = parseInt(autoClearMinutes);
    const checkMin = parseInt(checkStatusMinutes);

    if (autoClearEnabled) {
      if (isNaN(autoMin) || autoMin < 60 || autoMin > 720) {
        setAutoClearError('Auto-clear minutes must be between 60 and 720');
        return;
      }
      if (isNaN(checkMin) || checkMin < 30 || checkMin > 600) {
        setAutoClearError('Check status minutes must be between 30 and 600');
        return;
      }
      if (checkMin >= autoMin) {
        setAutoClearError('Warning threshold must be less than auto-clear threshold');
        return;
      }
    }

    // Validate block warning minutes (always, not just when autoClearEnabled)
    const blockWarnMin = parseInt(blockWarningMinutes);
    if (isNaN(blockWarnMin) || blockWarnMin < 15 || blockWarnMin > 120) {
      setAutoClearError('Block warning minutes must be between 15 and 120');
      return;
    }

    setAutoClearSaveStatus('saving');
    try {
      const result = await backend.admin.updateSettings({
        settings: {
          auto_clear_enabled: autoClearEnabled ? 'true' : 'false',
          auto_clear_minutes: String(autoMin),
          check_status_minutes: String(checkMin),
          block_warning_minutes: String(blockWarnMin),
        },
      });

      if (result.ok) {
        setAutoClearChanged(false);
        setAutoClearSaveStatus('saved');
        setTimeout(() => setAutoClearSaveStatus(null), 2000);
        if (onSettingsChanged) onSettingsChanged();
      } else {
        setAutoClearError(result.error || 'Failed to save');
        setAutoClearSaveStatus('error');
      }
    } catch (err) {
      console.error('Failed to save auto-clear settings:', err);
      setAutoClearError(err.message || 'Failed to save');
      setAutoClearSaveStatus('error');
    }
  };

  // Update operating hours locally (doesn't save immediately)
  const handleHoursChange = (dayOfWeek, opensAt, closesAt, isClosed) => {
    setOperatingHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek
          ? { ...h, opens_at: opensAt, closes_at: closesAt, is_closed: isClosed }
          : h
      )
    );
    setHoursChanged(true);
  };

  // Save operating hours to backend
  const saveOperatingHours = async () => {
    if (!backend?.admin?.updateSettings) return;

    setHoursSaveStatus('saving');
    try {
      const result = await backend.admin.updateSettings({
        operatingHours: operatingHours.map((h) => ({
          day_of_week: h.day_of_week,
          opens_at: h.opens_at,
          closes_at: h.closes_at,
          is_closed: h.is_closed,
        })),
      });

      if (result.ok) {
        setHoursChanged(false);
        setHoursSaveStatus('saved');
        setTimeout(() => setHoursSaveStatus(null), 2000);
        if (onSettingsChanged) onSettingsChanged();
      }
    } catch (err) {
      console.error('Failed to update operating hours:', err);
      setHoursSaveStatus('error');
    }
  };

  // Add hours override
  const addHoursOverride = async (date, opensAt, closesAt, isClosed, reason) => {
    if (!backend?.admin?.updateSettings) return;

    setOverrideSaveStatus('saving');
    try {
      const result = await backend.admin.updateSettings({
        operatingHoursOverride: {
          date,
          opens_at: opensAt,
          closes_at: closesAt,
          is_closed: isClosed,
          reason,
        },
      });

      if (result.ok) {
        // Reload to get updated overrides list
        loadSettings();
        setOverrideSaveStatus('saved');
        setTimeout(() => setOverrideSaveStatus(null), 2000);
        if (onSettingsChanged) onSettingsChanged();
      }
    } catch (err) {
      console.error('Failed to add hours override:', err);
      setOverrideSaveStatus('error');
    }
  };

  // Delete hours override
  const deleteHoursOverride = async (date) => {
    if (!backend?.admin?.updateSettings) return;

    setOverrideSaveStatus('saving');
    try {
      const result = await backend.admin.updateSettings({
        deleteOverride: date,
      });

      if (result.ok) {
        setHoursOverrides((prev) => prev.filter((o) => o.date !== date));
        setOverrideSaveStatus('saved');
        setTimeout(() => setOverrideSaveStatus(null), 2000);
        if (onSettingsChanged) onSettingsChanged();
      }
    } catch (err) {
      console.error('Failed to delete hours override:', err);
      setOverrideSaveStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="h-10 bg-gray-100 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6" data-testid="admin-settings-form">
      {/* Left column */}
      <div className="space-y-6">
        {/* Pricing card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
            <button
              onClick={savePricing}
              disabled={!pricingChanged}
              data-testid="admin-settings-save"
              className={`px-4 py-2 rounded text-sm font-medium ${
                pricingChanged
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : pricingSaveStatus === 'saved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {pricingSaveStatus === 'saving'
                ? 'Saving...'
                : pricingSaveStatus === 'saved'
                  ? '✓ Saved'
                  : 'Save Pricing'}
            </button>
          </div>
          <div className="flex gap-12">
            {/* Left: Tennis Ball Can */}
            <div>
              <h4 className="text-base font-semibold text-gray-700 mb-2 whitespace-nowrap">
                Tennis Ball Can
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ballPriceInput}
                  onChange={(e) => handlePricingChange('ballPrice', e.target.value)}
                  className="w-20 p-2 border rounded"
                />
              </div>
            </div>

            {/* Right: Guest Fees */}
            <div>
              <h4 className="text-base font-semibold text-gray-700 mb-2">Guest Fees</h4>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Weekday</label>
                  <span className="text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weekdayFeeInput}
                    onChange={(e) => handlePricingChange('weekdayFee', e.target.value)}
                    className="w-20 p-2 border rounded"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Weekend</label>
                  <span className="text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weekendFeeInput}
                    onChange={(e) => handlePricingChange('weekendFee', e.target.value)}
                    className="w-20 p-2 border rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regular Hours card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Regular Tennis Court Hours</h3>
            <button
              onClick={saveOperatingHours}
              disabled={!hoursChanged}
              className={`px-4 py-2 rounded text-sm font-medium ${
                hoursChanged
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : hoursSaveStatus === 'saved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {hoursSaveStatus === 'saving'
                ? 'Saving...'
                : hoursSaveStatus === 'saved'
                  ? '✓ Saved'
                  : 'Save Hours'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {operatingHours.map((day) => (
              <div
                key={day.day_of_week}
                className={`flex items-center gap-4 p-2 rounded-md ${
                  day.is_closed ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <span className="w-24 font-medium">{day.day_name}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={day.is_closed}
                    onChange={(e) =>
                      handleHoursChange(
                        day.day_of_week,
                        day.opens_at,
                        day.closes_at,
                        e.target.checked
                      )
                    }
                  />
                  Closed
                </label>
                {!day.is_closed && (
                  <>
                    <input
                      type="time"
                      value={day.opens_at?.slice(0, 5) || '06:00'}
                      onChange={(e) =>
                        e.target.value &&
                        handleHoursChange(
                          day.day_of_week,
                          e.target.value + ':00',
                          day.closes_at,
                          false
                        )
                      }
                      className="px-2 py-1 rounded border border-gray-300"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={day.closes_at?.slice(0, 5) || '21:00'}
                      onChange={(e) =>
                        e.target.value &&
                        handleHoursChange(
                          day.day_of_week,
                          day.opens_at,
                          e.target.value + ':00',
                          false
                        )
                      }
                      className="px-2 py-1 rounded border border-gray-300"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Clear card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Court Auto-Clear</h3>
            <button
              onClick={saveAutoClear}
              disabled={!autoClearChanged}
              className={`px-4 py-2 rounded text-sm font-medium ${
                autoClearChanged
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : autoClearSaveStatus === 'saved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {autoClearSaveStatus === 'saving'
                ? 'Saving...'
                : autoClearSaveStatus === 'saved'
                  ? '✓ Saved'
                  : 'Save'}
            </button>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => handleAutoClearChange('enabled', !autoClearEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoClearEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoClearEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">Enable Auto-Clear</span>
          </div>

          {/* Settings (shown only when enabled) */}
          {autoClearEnabled && (
            <div className="space-y-3 pl-1">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-48">
                  Show &quot;check status&quot; warning after
                </label>
                <input
                  type="number"
                  min="30"
                  max="600"
                  value={checkStatusMinutes}
                  onChange={(e) => handleAutoClearChange('checkStatusMinutes', e.target.value)}
                  className="w-20 p-2 border rounded text-center"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-48">Auto-clear session after</label>
                <input
                  type="number"
                  min="60"
                  max="720"
                  value={autoClearMinutes}
                  onChange={(e) => handleAutoClearChange('autoClearMinutes', e.target.value)}
                  className="w-20 p-2 border rounded text-center"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
              <p className="text-xs text-gray-400 italic">
                Warning threshold must be less than auto-clear threshold
              </p>
            </div>
          )}

          {/* Block warning setting - always visible */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 w-48">Block warning notification</label>
              <input
                type="number"
                min="15"
                max="120"
                value={blockWarningMinutes}
                onChange={(e) => handleAutoClearChange('blockWarningMinutes', e.target.value)}
                className="w-20 p-2 border rounded text-center"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
            <p className="text-xs text-gray-400 italic mt-1">
              Display upcoming block warnings on courtboard and registration
            </p>
          </div>

          {/* Error message */}
          {autoClearError && <p className="text-red-600 text-sm mt-2">{autoClearError}</p>}
        </div>
      </div>

      {/* Right column - Holiday card spans full height */}
      <div>
        {/* Holiday & Special Hours card */}
        <div className="bg-white rounded-lg shadow-sm p-6 h-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Holiday & Special Hours</h3>

          {/* Add Override Form */}
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <div className="flex flex-wrap gap-2 items-start">
              <div>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => {
                    setOverrideDate(e.target.value);
                    clearOverrideError('date');
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className={`px-2 py-1 rounded border ${overrideErrors.date ? 'border-red-500' : 'border-gray-300'}`}
                />
                {overrideErrors.date && (
                  <p className="text-red-600 text-xs mt-1">{overrideErrors.date}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={overrideOpens}
                    onChange={(e) => {
                      setOverrideOpens(e.target.value);
                      clearOverrideError('times');
                    }}
                    className={`px-2 py-1 rounded border ${overrideErrors.times ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={overrideCloses}
                    onChange={(e) => {
                      setOverrideCloses(e.target.value);
                      clearOverrideError('times');
                    }}
                    className={`px-2 py-1 rounded border ${overrideErrors.times ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                {overrideErrors.times && (
                  <p className="text-red-600 text-xs mt-1">{overrideErrors.times}</p>
                )}
              </div>
              <div className="flex-1 min-w-[150px]">
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => {
                    setOverrideReason(e.target.value);
                    clearOverrideError('reason');
                  }}
                  placeholder="Reason (e.g., Holiday)"
                  className={`w-full px-2 py-1 rounded border ${overrideErrors.reason ? 'border-red-500' : 'border-gray-300'}`}
                />
                {overrideErrors.reason && (
                  <p className="text-red-600 text-xs mt-1">{overrideErrors.reason}</p>
                )}
              </div>
              <label className="flex items-center gap-1 text-sm py-1">
                <input
                  type="checkbox"
                  checked={overrideClosed}
                  onChange={(e) => setOverrideClosed(e.target.checked)}
                />
                Closed
              </label>
              <button
                onClick={async () => {
                  if (!validateOverrideForm()) return;
                  await addHoursOverride(
                    overrideDate,
                    overrideClosed ? null : overrideOpens + ':00',
                    overrideClosed ? null : overrideCloses + ':00',
                    overrideClosed,
                    overrideReason
                  );
                  // Reset form after successful add
                  setOverrideDate('');
                  setOverrideOpens('06:00');
                  setOverrideCloses('21:00');
                  setOverrideReason('');
                  setOverrideClosed(false);
                  setOverrideErrors({});
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Existing Overrides */}
          {hoursOverrides.length > 0 ? (
            <div className="flex flex-col gap-2">
              {hoursOverrides.map((override) => (
                <div
                  key={override.date}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                    override.is_closed ? 'bg-red-50' : 'bg-green-50'
                  }`}
                >
                  <span>
                    <strong>
                      {new Date(override.date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </strong>
                    {override.reason && <span className="text-gray-500"> — {override.reason}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    {override.is_closed ? (
                      <span className="text-red-600 font-medium">Closed</span>
                    ) : (
                      <span>
                        {override.opens_at?.slice(0, 5)} - {override.closes_at?.slice(0, 5)}
                      </span>
                    )}
                    <button
                      onClick={() => deleteHoursOverride(override.date)}
                      className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">No upcoming schedule overrides</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
