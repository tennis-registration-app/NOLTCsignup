// @ts-check
import React from 'react';

/**
 * SuccessCard - Fixed layout card component
 * Header is outside scroll container to avoid compositor hit-test bugs
 * @param {Object} props
 * @param {React.ReactNode} props.headerContent - Header content (fixed, non-scrolling)
 * @param {React.ReactNode} props.mainContent - Main content (scrollable)
 * @param {React.ReactNode} props.footerContent - Footer content (scrollable with main)
 */
const SuccessCard = ({ headerContent, mainContent, footerContent }) => (
  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col h-auto md:h-auto">
    {/* Fixed header area - outside scroll container, won't shrink */}
    {headerContent && (
      <div
        data-testid="success-header"
        className="flex-shrink-0 h-auto md:h-20 bg-gray-200 rounded-t-3xl p-4"
      >
        {headerContent}
      </div>
    )}

    {/* Scrollable content area */}
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Main content area */}
      <div data-testid="success-main" className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
        {mainContent}
      </div>

      {/* Footer area */}
      <div className="flex-shrink-0 h-auto md:h-[160px] px-6 sm:px-8 pb-6 sm:pb-8">
        {footerContent || <div className="h-full" />}
      </div>
    </div>
  </div>
);

export default SuccessCard;
