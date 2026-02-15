// @ts-check
import React from 'react';
import { Check } from '../../components';
import { TypedIcon } from '../../../components/icons/TypedIcon';

/**
 * WaitlistSuccess - Waitlist success content
 * @param {Object} props
 * @param {number} props.position - Waitlist position
 * @param {number} props.estimatedWait - Estimated wait time in minutes
 */
const WaitlistSuccess = ({ position, estimatedWait }) => (
  <>
    <div className="flex flex-col items-center mb-4 sm:mb-6">
      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mb-2 sm:mb-3">
        <TypedIcon icon={Check} size={32} className="text-white sm:w-10 sm:h-10" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent text-center">
        You&apos;re on the list!
      </h1>
    </div>

    <div className="bg-blue-50 rounded-2xl p-4 sm:p-6 text-center mb-4 sm:mb-6">
      <p className="text-base sm:text-lg text-gray-600 mb-2 sm:mb-3">
        Your group has been registered
      </p>
      {position > 2 ? (
        <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
          There are <span className="text-blue-600">{position - 1} groups</span> ahead of you
        </p>
      ) : position === 2 ? (
        <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
          There is <span className="text-blue-600">1 group</span> ahead of you
        </p>
      ) : (
        <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
          You are <span className="text-green-600">next</span> in line!
        </p>
      )}

      {estimatedWait > 0 && (
        <p className="text-base sm:text-lg text-gray-600">
          Estimated wait: <span className="text-orange-600 font-bold">{estimatedWait} min</span>
        </p>
      )}
    </div>

    <p className="text-sm sm:text-base text-gray-500 text-center">
      Check the monitor for court updates
    </p>
  </>
);

export default WaitlistSuccess;
