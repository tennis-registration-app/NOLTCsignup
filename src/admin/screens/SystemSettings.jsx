/**
 * SystemSettings Component
 *
 * Admin settings for pricing, operating hours, and holiday overrides.
 * Self-contained component that manages its own state and API calls.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../lib/logger.js';
import {
  normalizeOperatingHours,
  normalizeOverrides,
  normalizeSettings,
  denormalizeOperatingHours,
  denormalizeOverride,
} from '../../lib/normalize/normalizeAdminSettings.js';
import PricingSettingsCard from './system/PricingSettingsCard.jsx';
import AutoClearSettingsCard from './system/AutoClearSettingsCard.jsx';
import OperatingHoursCard from './system/OperatingHoursCard.jsx';
import HoursOverridesCard from './system/HoursOverridesCard.jsx';

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

  // Fetch settings on mount
  const loadSettings = useCallback(async () => {
    if (!backend?.admin?.getSettings) return;

    try {
      const result = await backend.admin.getSettings();
      if (result.ok) {
        // WP4-4: Normalize settings at ingestion
        const normalizedSettings = normalizeSettings(result.settings);

        // Update pricing settings
        const newSettings = {
          tennisBallPrice: (normalizedSettings?.ballPriceCents || 500) / 100,
          guestFees: {
            weekday: (normalizedSettings?.guestFeeWeekdayCents || 1500) / 100,
            weekend: (normalizedSettings?.guestFeeWeekendCents || 2000) / 100,
          },
        };
        setSettings(newSettings);
        setBallPriceInput(newSettings.tennisBallPrice.toFixed(2));
        setWeekdayFeeInput(newSettings.guestFees.weekday.toFixed(2));
        setWeekendFeeInput(newSettings.guestFees.weekend.toFixed(2));

        // Update auto-clear settings (using normalized camelCase)
        setAutoClearEnabled(normalizedSettings?.autoClearEnabled === 'true');
        setAutoClearMinutes(normalizedSettings?.autoClearMinutes || '180');
        setCheckStatusMinutes(normalizedSettings?.checkStatusMinutes || '150');
        setBlockWarningMinutes(normalizedSettings?.blockWarningMinutes || '60');

        // Update operating hours (normalized to camelCase)
        const normalizedHours = normalizeOperatingHours(result.operating_hours);
        if (normalizedHours) {
          setOperatingHours(normalizedHours);
        }

        // Update overrides (normalized to camelCase)
        const normalizedOverrides = normalizeOverrides(result.upcoming_overrides);
        if (normalizedOverrides) {
          setHoursOverrides(normalizedOverrides);
        }
      }
    } catch (err) {
      logger.error('SystemSettings', 'Failed to load settings', err);
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

      // WP4-4: API expects snake_case for write operations (denormalization)
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
      logger.error('SystemSettings', 'Failed to save pricing', err);
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
      // WP4-4: API expects snake_case for write operations (denormalization)
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
      logger.error('SystemSettings', 'Failed to save auto-clear settings', err);
      setAutoClearError(err.message || 'Failed to save');
      setAutoClearSaveStatus('error');
    }
  };

  // Update operating hours locally (doesn't save immediately)
  const handleHoursChange = (dayOfWeek, opensAt, closesAt, isClosed) => {
    setOperatingHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, opensAt, closesAt, isClosed } : h))
    );
    setHoursChanged(true);
  };

  // Save operating hours to backend
  const saveOperatingHours = async () => {
    if (!backend?.admin?.updateSettings) return;

    setHoursSaveStatus('saving');
    try {
      const result = await backend.admin.updateSettings({
        operatingHours: denormalizeOperatingHours(operatingHours),
      });

      if (result.ok) {
        setHoursChanged(false);
        setHoursSaveStatus('saved');
        setTimeout(() => setHoursSaveStatus(null), 2000);
        if (onSettingsChanged) onSettingsChanged();
      }
    } catch (err) {
      logger.error('SystemSettings', 'Failed to update operating hours', err);
      setHoursSaveStatus('error');
    }
  };

  // Add hours override
  const addHoursOverride = async (date, opensAt, closesAt, isClosed, reason) => {
    if (!backend?.admin?.updateSettings) return;

    setOverrideSaveStatus('saving');
    try {
      const result = await backend.admin.updateSettings({
        operatingHoursOverride: denormalizeOverride({
          date,
          opensAt,
          closesAt,
          isClosed,
          reason,
        }),
      });

      if (result.ok) {
        // Reload to get updated overrides list
        loadSettings();
        setOverrideSaveStatus('saved');
        setTimeout(() => setOverrideSaveStatus(null), 2000);
        if (onSettingsChanged) onSettingsChanged();
      }
    } catch (err) {
      logger.error('SystemSettings', 'Failed to add hours override', err);
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
      logger.error('SystemSettings', 'Failed to delete hours override', err);
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
        <PricingSettingsCard
          ballPriceInput={ballPriceInput}
          weekdayFeeInput={weekdayFeeInput}
          weekendFeeInput={weekendFeeInput}
          pricingChanged={pricingChanged}
          pricingSaveStatus={pricingSaveStatus}
          handlePricingChange={handlePricingChange}
          savePricing={savePricing}
        />

        {/* Regular Hours card */}
        <OperatingHoursCard
          operatingHours={operatingHours}
          hoursChanged={hoursChanged}
          hoursSaveStatus={hoursSaveStatus}
          handleHoursChange={handleHoursChange}
          saveOperatingHours={saveOperatingHours}
        />

        {/* Auto-Clear card */}
        <AutoClearSettingsCard
          autoClearEnabled={autoClearEnabled}
          autoClearMinutes={autoClearMinutes}
          checkStatusMinutes={checkStatusMinutes}
          blockWarningMinutes={blockWarningMinutes}
          autoClearChanged={autoClearChanged}
          autoClearSaveStatus={autoClearSaveStatus}
          autoClearError={autoClearError}
          handleAutoClearChange={handleAutoClearChange}
          saveAutoClear={saveAutoClear}
        />
      </div>

      {/* Right column - Holiday card spans full height */}
      <div>
        <HoursOverridesCard
          hoursOverrides={hoursOverrides}
          overrideDate={overrideDate}
          setOverrideDate={setOverrideDate}
          overrideOpens={overrideOpens}
          setOverrideOpens={setOverrideOpens}
          overrideCloses={overrideCloses}
          setOverrideCloses={setOverrideCloses}
          overrideReason={overrideReason}
          setOverrideReason={setOverrideReason}
          overrideClosed={overrideClosed}
          setOverrideClosed={setOverrideClosed}
          overrideErrors={overrideErrors}
          setOverrideErrors={setOverrideErrors}
          clearOverrideError={clearOverrideError}
          validateOverrideForm={validateOverrideForm}
          addHoursOverride={addHoursOverride}
          deleteHoursOverride={deleteHoursOverride}
        />
      </div>
    </div>
  );
};

export default SystemSettings;
