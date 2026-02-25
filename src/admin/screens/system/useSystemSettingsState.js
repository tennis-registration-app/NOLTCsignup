/**
 * Custom hook that owns all SystemSettings state + load/save logic.
 * Extracted verbatim from SystemSettings.jsx.
 */
import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../lib/logger.js';
import {
  normalizeOperatingHours,
  normalizeOverrides,
  normalizeSettings,
  denormalizeOperatingHours,
  denormalizeOverride,
} from '../../../lib/normalize/index.js';

export default function useSystemSettingsState({ backend, onSettingsChanged }) {
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
  const [pricingSaveStatus, setPricingSaveStatus] = useState(null);
  const [hoursSaveStatus, setHoursSaveStatus] = useState(null);
  const [, setOverrideSaveStatus] = useState(null); // Getter unused, setter used
  const [autoClearSaveStatus, setAutoClearSaveStatus] = useState(null);

  // Fetch settings on mount
  const loadSettings = useCallback(async () => {
    if (!backend?.admin?.getSettings) return;

    try {
      const result = await backend.admin.getSettings();
      if (result.ok) {
        const normalizedSettings = normalizeSettings(result.settings);

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

        setAutoClearEnabled(normalizedSettings?.autoClearEnabled === 'true');
        setAutoClearMinutes(normalizedSettings?.autoClearMinutes || '180');
        setCheckStatusMinutes(normalizedSettings?.checkStatusMinutes || '150');
        setBlockWarningMinutes(normalizedSettings?.blockWarningMinutes || '60');

        const normalizedHours = normalizeOperatingHours(result.operating_hours);
        if (normalizedHours) {
          setOperatingHours(normalizedHours);
        }

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

  const clearOverrideError = (field) => {
    if (overrideErrors[field]) {
      setOverrideErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

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

  const handlePricingChange = (field, value) => {
    if (field === 'ballPrice') setBallPriceInput(value);
    if (field === 'weekdayFee') setWeekdayFeeInput(value);
    if (field === 'weekendFee') setWeekendFeeInput(value);
    setPricingChanged(true);
  };

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
      logger.error('SystemSettings', 'Failed to save pricing', err);
      setPricingSaveStatus('error');
    }
  };

  const handleAutoClearChange = (field, value) => {
    if (field === 'enabled') setAutoClearEnabled(value);
    if (field === 'autoClearMinutes') setAutoClearMinutes(value);
    if (field === 'checkStatusMinutes') setCheckStatusMinutes(value);
    if (field === 'blockWarningMinutes') setBlockWarningMinutes(value);
    setAutoClearChanged(true);
    setAutoClearError(null);
  };

  const saveAutoClear = async () => {
    if (!backend?.admin?.updateSettings) return;

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
      logger.error('SystemSettings', 'Failed to save auto-clear settings', err);
      setAutoClearError(err.message || 'Failed to save');
      setAutoClearSaveStatus('error');
    }
  };

  const handleHoursChange = (dayOfWeek, opensAt, closesAt, isClosed) => {
    setOperatingHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, opensAt, closesAt, isClosed } : h))
    );
    setHoursChanged(true);
  };

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

  return {
    loading,

    // Pricing
    ballPriceInput,
    weekdayFeeInput,
    weekendFeeInput,
    pricingChanged,
    pricingSaveStatus,
    handlePricingChange,
    savePricing,

    // Auto-clear
    autoClearEnabled,
    autoClearMinutes,
    checkStatusMinutes,
    blockWarningMinutes,
    autoClearChanged,
    autoClearSaveStatus,
    autoClearError,
    handleAutoClearChange,
    saveAutoClear,

    // Operating hours
    operatingHours,
    hoursChanged,
    hoursSaveStatus,
    handleHoursChange,
    saveOperatingHours,

    // Overrides
    hoursOverrides,
    overrideDate,
    setOverrideDate,
    overrideOpens,
    setOverrideOpens,
    overrideCloses,
    setOverrideCloses,
    overrideReason,
    setOverrideReason,
    overrideClosed,
    setOverrideClosed,
    overrideErrors,
    setOverrideErrors,
    clearOverrideError,
    validateOverrideForm,
    addHoursOverride,
    deleteHoursOverride,
  };
}
