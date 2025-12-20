/**
 * ClearCourtScreen Component
 *
 * Multi-step flow for clearing an occupied court.
 * Step 1: Select which court to clear
 * Step 2: Confirm clearing method (players leaving vs observed empty)
 * Step 3/4: Success confirmation
 *
 * Props:
 * - clearCourtStep: number - Current step (1-4)
 * - setClearCourtStep: (step: number) => void - Step setter
 * - selectedCourtToClear: number | null - Selected court number
 * - setSelectedCourtToClear: (courtNum: number) => void - Court setter
 * - clearCourt: (courtNum: number, reason: string) => Promise<void> - Clear court handler
 * - resetForm: () => void - Reset form handler
 * - showAlert: boolean - Whether to show alert
 * - alertMessage: string - Alert message
 * - getCourtsOccupiedForClearing: () => number[] - Get clearable courts
 * - courtData: object - Court data from React state (API backend) or localStorage
 * - CONSTANTS: object - App constants
 * - TennisBusinessLogic: object - Business logic service
 */
import React from 'react';
import { Check, ToastHost, AlertDisplay } from '../components';

const ClearCourtScreen = ({
  clearCourtStep,
  setClearCourtStep,
  selectedCourtToClear,
  setSelectedCourtToClear,
  clearCourt,
  resetForm,
  showAlert,
  alertMessage,
  getCourtsOccupiedForClearing,
  courtData,
  CONSTANTS,
  TennisBusinessLogic
}) => {
  const clearableCourts = getCourtsOccupiedForClearing();
  const hasAny = clearableCourts.length > 0;
  // Use courtData prop (from React state for API backend, or from parent)
  // Fall back to localStorage only if courtData is not provided
  const data = courtData || window.Tennis?.Storage?.readDataSafe?.() || { courts: [] };
  const occupiedCourts = clearableCourts.map(courtNumber => ({
    courtNumber,
    players: data?.courts?.[courtNumber - 1]?.current?.players || data?.courts?.[courtNumber - 1]?.players || [],
    isBlocked: false
  }));

  // Step 1: Choose court to clear
  if (clearCourtStep === 1) {
    return (
      <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex items-center justify-center">
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">Choose a court to clear</h2>

          {hasAny ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
              {occupiedCourts.map(({ courtNumber }) => (
                <button
                  key={courtNumber}
                  onClick={() => {
                    setSelectedCourtToClear(courtNumber);
                    setClearCourtStep(2);
                  }}
                  className="p-6 sm:p-8 rounded-xl text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:from-blue-500 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  Court {courtNumber}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">No courts are currently in use.</p>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => {
                if (window.__mobileFlow) {
                  window.parent.postMessage({ type: 'resetRegistration' }, '*');
                } else {
                  resetForm();
                }
              }}
              className="bg-gray-300 text-gray-700 py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-base sm:text-lg hover:bg-gray-400 transition-colors"
            >
              {window.__mobileFlow ? 'Back' : 'Go Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Confirm clearing method
  if (clearCourtStep === 2) {
    const court = data.courts[selectedCourtToClear - 1];
    const players = court?.current?.players || court?.players || [];
    const displayNames = players.map(p => TennisBusinessLogic.formatPlayerDisplayName(p.name)).join(" and ");

    return (
      <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex items-center justify-center">
        <ToastHost />
        <AlertDisplay show={showAlert} message={alertMessage} />
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-3xl">
          <div className="mb-6 sm:mb-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Court {selectedCourtToClear}</h2>
            <p className="text-xl sm:text-2xl text-gray-600">{displayNames}</p>
          </div>

          <div className="space-y-4 sm:space-y-8 mb-6 sm:mb-8">
            <button
              onClick={async () => {
                await clearCourt(selectedCourtToClear, 'Cleared');
                console.log(`Clearing court ${selectedCourtToClear} - players leaving`);
                setClearCourtStep(3);
              }}
              className="w-full bg-green-500 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-lg sm:text-xl font-semibold hover:bg-green-600 transition-colors"
            >
              We are finished our game and leaving court {selectedCourtToClear}
            </button>

            <button
              onClick={async () => {
                await clearCourt(selectedCourtToClear, 'Observed-Cleared');
                console.log(`Clearing court ${selectedCourtToClear} - observed empty`);
                setClearCourtStep(4);
              }}
              className="w-full bg-blue-500 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-lg sm:text-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              Players have finished and court {selectedCourtToClear} is open (I'm sure!)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <button
              onClick={() => setClearCourtStep(1)}
              className="bg-gray-300 text-gray-700 py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-base sm:text-lg hover:bg-gray-400 transition-colors order-2 sm:order-1"
            >
              {window.__mobileFlow ? 'Back' : 'Go Back'}
            </button>

            <button
              onClick={() => {
                resetForm();
                if (window.__mobileFlow) {
                  window.parent.postMessage({ type: 'resetRegistration' }, '*');
                }
              }}
              className="bg-red-500 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-base sm:text-lg hover:bg-red-600 transition-colors order-1 sm:order-2"
            >
              {window.__mobileFlow ? 'Exit' : 'Start Over'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Success - players leaving
  if (clearCourtStep === 3) {
    setTimeout(() => {
      resetForm();
    }, CONSTANTS.AUTO_RESET_CLEAR_MS);

    return (
      <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <ToastHost />
        <div className="bg-white rounded-3xl p-8 sm:p-16 shadow-2xl text-center max-w-2xl">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <Check size={48} className="text-white sm:w-16 sm:h-16" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Thanks, have a great day!</h1>
          <p className="text-lg sm:text-xl text-gray-600">Court {selectedCourtToClear} is now available</p>
        </div>
      </div>
    );
  }

  // Step 4: Success - observed empty
  if (clearCourtStep === 4) {
    setTimeout(() => {
      resetForm();
    }, CONSTANTS.AUTO_RESET_CLEAR_MS);

    return (
      <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <ToastHost />
        <div className="bg-white rounded-3xl p-8 sm:p-16 shadow-2xl text-center max-w-2xl">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <Check size={48} className="text-white sm:w-16 sm:h-16" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Thank you!</h1>
          <p className="text-lg sm:text-xl text-gray-600">Court {selectedCourtToClear} is now available</p>
        </div>
      </div>
    );
  }

  return null;
};

export default ClearCourtScreen;
