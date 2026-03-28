// @ts-check
import React from 'react';

/**
 * FrequentPartnersList - Shows frequent partners for quick selection
 * @param {Object} props
 * @param {Array} props.partners - Available partners to display
 * @param {boolean} props.loading - Whether partners are loading
 * @param {number} props.maxPartners - Maximum number of partners to show
 * @param {function} props.onSelect - Callback when a partner is clicked
 */
const FrequentPartnersList = ({ partners, loading, maxPartners, onSelect }) => {
  if (!loading && partners.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-green-200 mt-4 pt-4">
      <h4 className="font-medium text-sm sm:text-base mb-2 sm:mb-3">Frequent Partners</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 sm:h-12 bg-green-200/60 rounded-lg animate-pulse" />
            ))}
          </>
        ) : (
          partners.slice(0, maxPartners).map((partner, idx) => {
            const names = partner.player.name.split(' ');
            const displayName =
              names.join(' ').length > 20
                ? `${names[0].charAt(0)}. ${names[1] || names[0]}`
                : partner.player.name;

            return (
              <button
                key={idx}
                onClick={() => onSelect(partner.player)}
                className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200 hover:bg-green-100 transition-colors text-left"
              >
                <div className="font-medium text-xs sm:text-sm">{displayName}</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FrequentPartnersList;
