// @ts-check
import React from 'react';

/**
 * GuestFormInline - Animated guest form with sponsor selection
 * @param {Object} props
 * @param {boolean} props.show - Whether the form is visible
 * @param {Array} props.currentGroup - Current group of players
 * @param {string} props.memberNumber - Current user's member number
 * @param {string} props.guestSponsor - Currently selected sponsor member number
 * @param {boolean} props.showSponsorError - Whether to show sponsor error
 * @param {boolean} props.showGuestNameError - Whether to show guest name error
 * @param {function} props.onSelectSponsor - Callback when sponsor is selected
 * @param {function} props.onAddGuest - Callback when Add Guest is clicked
 * @param {function} props.onCancelGuest - Callback when Cancel is clicked
 */
const GuestFormInline = ({
  show,
  currentGroup,
  memberNumber,
  guestSponsor,
  showSponsorError,
  showGuestNameError,
  onSelectSponsor,
  onAddGuest,
  onCancelGuest,
}) => {
  const nonGuestMembers = currentGroup.filter((p) => !p.isGuest);

  return (
    <div
      className={`grid transition-all duration-1000 delay-300 ease-in-out ${
        show ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
      }`}
    >
      <div className="overflow-hidden">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
          {/* Left side - Sponsoring Member (only if multiple non-guest members) */}
          {nonGuestMembers.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm ${showSponsorError ? 'text-red-500' : 'text-gray-600'}`}>
                Sponsor:
              </span>
              {nonGuestMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onSelectSponsor(member.memberNumber)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    guestSponsor === member.memberNumber
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {member.memberNumber === memberNumber ? 'My Guest' : member.name}
                </button>
              ))}
            </div>
          )}

          {/* Right side - Add Guest / Cancel */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onAddGuest}
              className="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Add Guest
            </button>
            <button
              onClick={onCancelGuest}
              className="px-4 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Error message below */}
        {showGuestNameError && (
          <p className="text-red-500 text-sm mt-2">Please enter your guest&apos;s full name</p>
        )}
      </div>
    </div>
  );
};

export default GuestFormInline;
