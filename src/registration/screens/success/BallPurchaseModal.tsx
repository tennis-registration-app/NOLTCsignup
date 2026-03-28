/**
 * BallPurchaseModal Component
 *
 * Modal for purchasing tennis balls with charge or split options.
 */
import React from 'react';

const BallPurchaseModal = ({
  ballPrice,
  splitPrice,
  currentGroup,
  ballPurchaseOption,
  setBallPurchaseOption,
  isProcessingPurchase,
  onConfirm,
  onClose,
  getLastFourDigits,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-[420px] mx-4">
        <h3 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">
          Purchase Tennis Balls
        </h3>

        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <label
            className={`block p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
              ballPurchaseOption === 'charge'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="ballOption"
              value="charge"
              checked={ballPurchaseOption === 'charge'}
              onChange={(e) => setBallPurchaseOption(e.target.value)}
              className="sr-only"
            />
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-sm sm:text-base">Charge to account</p>
                <p className="text-xs sm:text-sm text-gray-600">
                  Account ending in {getLastFourDigits(currentGroup[0]?.memberNumber)}
                </p>
              </div>
              <p className="text-lg sm:text-xl font-bold">${ballPrice.toFixed(2)}</p>
            </div>
          </label>

          {currentGroup.filter((p) => !p.isGuest).length > 1 && (
            <label
              className={`block p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                ballPurchaseOption === 'split'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="ballOption"
                value="split"
                checked={ballPurchaseOption === 'split'}
                onChange={(e) => setBallPurchaseOption(e.target.value)}
                className="sr-only"
              />
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm sm:text-base">Split the balls</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    ${splitPrice.toFixed(2)} per player (
                    {currentGroup.filter((p) => !p.isGuest).length} players)
                  </p>
                </div>
                <p className="text-lg sm:text-xl font-bold">${splitPrice.toFixed(2)} each</p>
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onConfirm}
            disabled={!ballPurchaseOption || isProcessingPurchase}
            className={`relative overflow-visible flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-medium transition-colors text-sm sm:text-base ${
              !ballPurchaseOption || isProcessingPurchase
                ? 'bg-blue-200 text-blue-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isProcessingPurchase ? 'Processing...' : 'Confirm Purchase'}
            {isProcessingPurchase && (
              <svg
                className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <style>
                  {`
                    @keyframes dash-move-purchase {
                      0% { stroke-dashoffset: 0; }
                      100% { stroke-dashoffset: 140; }
                    }
                  `}
                </style>
                <rect
                  x="1"
                  y="1"
                  width="98"
                  height="98"
                  rx="50"
                  ry="50"
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.6"
                  strokeWidth="2"
                  strokeDasharray="60 80"
                  style={{ animation: 'dash-move-purchase 1s linear infinite' }}
                />
              </svg>
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-medium hover:bg-gray-300 transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BallPurchaseModal;
