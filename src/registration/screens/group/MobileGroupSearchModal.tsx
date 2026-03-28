// @ts-check
import React from 'react';
import { ToastHost, AlertDisplay } from '../../components';
import SearchSuggestions from './SearchSuggestions.jsx';

/**
 * MobileGroupSearchModal - Compact modal for mobile flow with no players yet
 */
const MobileGroupSearchModal = ({
  showAlert,
  alertMessage,
  preselectedCourt,
  searchInput,
  onSearchChange,
  onSearchFocus,
  showSuggestions,
  effectiveSearchInput,
  getAutocompleteSuggestions,
  onSuggestionClick,
}) => {
  return (
    <div className="w-full h-full min-h-screen flex items-start justify-center pt-[12vh] p-4">
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
        {/* X Close button */}
        <button
          onClick={() => {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: 'register:closed' }, '*');
            }
          }}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Court indicator */}
        <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-lg text-green-800 font-semibold">Court {preselectedCourt} Selected</p>
        </div>

        {/* Title */}
        <p className="text-gray-600 text-center mb-4 text-sm">
          Please register when all players are ready
        </p>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={onSearchChange}
            onFocus={onSearchFocus}
            placeholder="Enter Name or Member #"
            className="w-full p-3 text-base border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
            id="mobile-group-search-input"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck="false"
          />

          {/* Search suggestions dropdown */}
          {showSuggestions && (
            <SearchSuggestions
              suggestions={getAutocompleteSuggestions(effectiveSearchInput)}
              onSelect={onSuggestionClick}
              searchInput={searchInput}
              hoverColor="hover:bg-blue-50"
              containerClass="absolute z-10 w-full mt-2"
              showMemberId={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileGroupSearchModal;
