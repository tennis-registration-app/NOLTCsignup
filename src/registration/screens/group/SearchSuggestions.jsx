// @ts-check
import React from 'react';

/**
 * SearchSuggestions - Reusable autocomplete dropdown for member search
 * @param {Object} props
 * @param {Array} props.suggestions - Array of suggestion objects
 * @param {function} props.onSelect - Callback when a suggestion is clicked
 * @param {string} [props.searchInput] - Current search input (for empty state message)
 * @param {string} [props.hoverColor] - Hover background color class (default: 'hover:bg-blue-50')
 * @param {string} [props.containerClass] - Additional container classes
 * @param {Object} [props.style] - Additional inline styles
 * @param {boolean} [props.showMemberId] - Show member.id (true) or memberNumber (false)
 * @param {function} [props.onAddAsGuest] - If provided, shows "Add as guest" option when no matches
 * @param {string} [props.addAsGuestName] - Name to show in "Add as guest" option
 */
const SearchSuggestions = ({
  suggestions,
  onSelect,
  searchInput = '',
  hoverColor = 'hover:bg-blue-50',
  containerClass = '',
  style = {},
  showMemberId = true,
  onAddAsGuest = null,
  addAsGuestName = '',
}) => {
  if (suggestions.length > 0) {
    return (
      <div
        className={`bg-white border-2 border-gray-200 rounded-xl shadow-lg ${containerClass}`}
        style={{ maxHeight: '300px', overflowY: 'auto', ...style }}
      >
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion)}
            className={`w-full p-2.5 sm:p-3 text-left ${hoverColor} border-b border-gray-100 last:border-b-0 transition-colors block`}
          >
            <div className="flex-1">
              <div className="font-medium text-base sm:text-lg">
                {suggestion.member.name}
                {suggestion.member.isGuest && (
                  <span className="text-sm text-blue-600 ml-2">(Guest)</span>
                )}
              </div>
              {suggestion.type === 'member' && (
                <div className="text-xs sm:text-sm text-gray-600">
                  Member #{showMemberId ? suggestion.member.id : suggestion.memberNumber}
                </div>
              )}
            </div>
            {suggestion.type === 'member' && suggestion.member.ranking && (
              <div className="text-sm text-blue-600 font-medium">
                Rank #{suggestion.member.ranking}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // No matches - show "Add as guest" or empty state
  if (onAddAsGuest && searchInput.length >= 2) {
    return (
      <div
        className={`bg-white border-2 border-gray-200 rounded-xl shadow-lg ${containerClass}`}
        style={{ maxHeight: '200px', overflowY: 'auto', ...style }}
      >
        <button
          onClick={() => onAddAsGuest(addAsGuestName)}
          className={`w-full p-2.5 sm:p-3 text-left ${hoverColor} transition-colors block`}
        >
          <div className="font-medium text-base sm:text-lg text-blue-600">
            Add &quot;{addAsGuestName}&quot; as guest?
          </div>
          <div className="text-xs sm:text-sm text-gray-600">No member found with this name</div>
        </button>
      </div>
    );
  }

  // Empty state
  return (
    <div
      className={`bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden ${containerClass}`}
      style={{ maxHeight: '300px', overflowY: 'auto', ...style }}
    >
      <div className="p-3 text-center text-gray-500 text-sm">
        {searchInput.length < 2 ? 'Keep typing...' : 'No members found'}
      </div>
    </div>
  );
};

export default SearchSuggestions;
