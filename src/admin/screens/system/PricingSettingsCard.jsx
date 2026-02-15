// @ts-check
import React from 'react';

/**
 * PricingSettingsCard - Ball price and guest fees settings
 */
const PricingSettingsCard = ({
  ballPriceInput,
  weekdayFeeInput,
  weekendFeeInput,
  pricingChanged,
  pricingSaveStatus,
  handlePricingChange,
  savePricing,
}) => (
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
);

export default PricingSettingsCard;
