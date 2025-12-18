/**
 * WelcomeScreen Component
 *
 * Landing screen for tennis court registration.
 * Displays two main actions: Register for a court or Clear a court.
 *
 * Props:
 * - onRegisterClick: () => void - Called when "Register for a court" is clicked
 * - onClearCourtClick: () => void - Called when "Clear a court" is clicked
 */
import React from 'react';

const WelcomeScreen = ({ onRegisterClick, onClearCourtClick }) => {
  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 sm:p-8">
      <div className="text-center w-full max-w-md">
        <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12">Tennis Court Registration</p>
        <button
          onClick={onRegisterClick}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xl sm:text-2xl font-bold py-4 sm:py-6 px-8 sm:px-12 rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 button-transition transform hover:scale-105 mb-8 sm:mb-16 block w-full"
        >
          Register for a court
        </button>
        <button
          onClick={onClearCourtClick}
          className="bg-gradient-to-r from-blue-300 to-blue-400 text-white text-xl sm:text-2xl font-bold py-4 sm:py-6 px-8 sm:px-12 rounded-xl shadow-lg hover:from-blue-400 hover:to-blue-500 button-transition transform hover:scale-105 block w-full"
        >
          Clear a court
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
