// @ts-check
import React from 'react';
import { Check } from '../../components';

/**
 * SystemSettingsSection - System settings section (ball price)
 */
const SystemSettingsSection = ({
  ballPriceInput,
  setBallPriceInput,
  priceError,
  setPriceError,
  showPriceSuccess,
  setShowPriceSuccess,
  onPriceUpdate,
}) => (
  <div className="mb-6 sm:mb-8 bg-gray-800 rounded-xl p-4 sm:p-6">
    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">System Settings</h2>

    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-white">Tennis Ball Price</h3>
          <p className="text-xs sm:text-sm text-gray-400">
            Set the price for tennis ball purchases
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.50"
              max="50.00"
              value={ballPriceInput}
              onChange={(e) => {
                setBallPriceInput(e.target.value);
                setPriceError('');
                setShowPriceSuccess(false);
              }}
              className="pl-8 pr-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none w-full sm:w-24"
            />
          </div>

          <button
            onClick={onPriceUpdate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Save
          </button>
        </div>
      </div>

      {showPriceSuccess && (
        <div className="mt-2 text-green-400 text-xs sm:text-sm flex items-center gap-2">
          {/* @ts-expect-error - lucide-react Check accepts className but types incomplete */}
          <Check size={14} className="sm:w-4 sm:h-4" />
          Price updated successfully
        </div>
      )}

      {priceError && <div className="mt-2 text-red-400 text-xs sm:text-sm">{priceError}</div>}
    </div>
  </div>
);

export default SystemSettingsSection;
