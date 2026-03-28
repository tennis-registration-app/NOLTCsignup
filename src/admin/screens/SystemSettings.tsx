/**
 * SystemSettings Component
 *
 * Admin settings for pricing, operating hours, and holiday overrides.
 * Thin render shell — all state + API logic lives in useSystemSettingsState.
 */
import React from 'react';
import useSystemSettingsState from './system/useSystemSettingsState';
import PricingSettingsCard from './system/PricingSettingsCard';
import AutoClearSettingsCard from './system/AutoClearSettingsCard';
import OperatingHoursCard from './system/OperatingHoursCard';
import HoursOverridesCard from './system/HoursOverridesCard';

const SystemSettings = ({ backend, onSettingsChanged }) => {
  const state = useSystemSettingsState({ backend, onSettingsChanged });

  if (state.loading) {
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
          ballPriceInput={state.ballPriceInput}
          weekdayFeeInput={state.weekdayFeeInput}
          weekendFeeInput={state.weekendFeeInput}
          pricingChanged={state.pricingChanged}
          pricingSaveStatus={state.pricingSaveStatus}
          handlePricingChange={state.handlePricingChange}
          savePricing={state.savePricing}
        />

        {/* Regular Hours card */}
        <OperatingHoursCard
          operatingHours={state.operatingHours}
          hoursChanged={state.hoursChanged}
          hoursSaveStatus={state.hoursSaveStatus}
          handleHoursChange={state.handleHoursChange}
          saveOperatingHours={state.saveOperatingHours}
        />

        {/* Auto-Clear card */}
        <AutoClearSettingsCard
          autoClearEnabled={state.autoClearEnabled}
          autoClearMinutes={state.autoClearMinutes}
          checkStatusMinutes={state.checkStatusMinutes}
          blockWarningMinutes={state.blockWarningMinutes}
          autoClearChanged={state.autoClearChanged}
          autoClearSaveStatus={state.autoClearSaveStatus}
          autoClearError={state.autoClearError}
          handleAutoClearChange={state.handleAutoClearChange}
          saveAutoClear={state.saveAutoClear}
        />
      </div>

      {/* Right column - Holiday card spans full height */}
      <div>
        <HoursOverridesCard
          hoursOverrides={state.hoursOverrides}
          overrideDate={state.overrideDate}
          setOverrideDate={state.setOverrideDate}
          overrideOpens={state.overrideOpens}
          setOverrideOpens={state.setOverrideOpens}
          overrideCloses={state.overrideCloses}
          setOverrideCloses={state.setOverrideCloses}
          overrideReason={state.overrideReason}
          setOverrideReason={state.setOverrideReason}
          overrideClosed={state.overrideClosed}
          setOverrideClosed={state.setOverrideClosed}
          overrideErrors={state.overrideErrors}
          setOverrideErrors={state.setOverrideErrors}
          clearOverrideError={state.clearOverrideError}
          validateOverrideForm={state.validateOverrideForm}
          addHoursOverride={state.addHoursOverride}
          deleteHoursOverride={state.deleteHoursOverride}
        />
      </div>
    </div>
  );
};

export default SystemSettings;
