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
import React, { useEffect, useRef } from 'react';
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

  // Auto-reset timer for success screens (step 3 and 4)
  const timerRef = useRef(null);
  const timerStepRef = useRef(null);  // Track which step the timer was set for

  useEffect(() => {
    // Only set timer when on success screens (step 3 or 4)
    // AND we haven't already set a timer for this step
    if ((clearCourtStep === 3 || clearCourtStep === 4) && timerStepRef.current !== clearCourtStep) {
      // Clear any existing timer from a different step
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerStepRef.current = clearCourtStep;  // Mark that we've set timer for this step
      const timeoutMs = CONSTANTS?.AUTO_RESET_CLEAR_MS || 2000;
      console.log(`[ClearCourtScreen] Starting ${timeoutMs}ms timer for step ${clearCourtStep}`);

      timerRef.current = setTimeout(() => {
        console.log('[ClearCourtScreen] Auto-reset timer fired');
        timerStepRef.current = null;  // Reset so we can set timer again if needed
        resetForm();
      }, timeoutMs);
    }

    // Only cleanup on unmount, NOT on every re-render
    return () => {
      if (timerRef.current && timerStepRef.current !== clearCourtStep) {
        console.log('[ClearCourtScreen] Cleaning up timer on unmount');
        clearTimeout(timerRef.current);
        timerRef.current = null;
        timerStepRef.current = null;
      }
    };
  }, [clearCourtStep]);  // Remove resetForm and CONSTANTS from deps - they cause re-renders
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
    // Find court by number (API may return courts in different order than array index)
    const courts = data.courts || [];
    const court = courts.find(c => c.number === selectedCourtToClear) || courts[selectedCourtToClear - 1];
    // Get players from session.players (API format), current.players (legacy), or top-level players
    const players = court?.session?.players || court?.current?.players || court?.players || [];

    // Debug logging
    console.log('🔍 ClearCourt Step 2 - selectedCourtToClear:', selectedCourtToClear);
    console.log('🔍 ClearCourt Step 2 - court found:', court);
    console.log('🔍 ClearCourt Step 2 - players array:', JSON.stringify(players, null, 2));

    // Handle players as array of strings or objects with name/displayName property
    const displayNames = players.map(p => {
      const name = typeof p === 'string' ? p : (p.name || p.displayName || p.display_name || 'Unknown');
      return TennisBusinessLogic.formatPlayerDisplayName(name);
    }).filter(Boolean).join(" and ");

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
              onClick={() => {
                // Optimistic UI: show success immediately
                console.log(`Clearing court ${selectedCourtToClear} - players leaving`);
                setClearCourtStep(3);

                // API call in background
                clearCourt(selectedCourtToClear, 'Cleared').catch(error => {
                  console.error('[ClearCourt] API error:', error);
                  // Error will be logged; Thank You screen auto-dismisses anyway
                });
              }}
              className="w-full bg-green-500 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-lg sm:text-xl font-semibold hover:bg-green-600 transition-colors"
            >
              We are finished our game and leaving court {selectedCourtToClear}
            </button>

            <button
              onClick={() => {
                // Optimistic UI: show success immediately
                console.log(`Clearing court ${selectedCourtToClear} - observed empty`);
                setClearCourtStep(4);

                // API call in background
                clearCourt(selectedCourtToClear, 'Observed-Cleared').catch(error => {
                  console.error('[ClearCourt] API error:', error);
                  // Error will be logged; Thank You screen auto-dismisses anyway
                });
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
  // Timer is handled by useEffect above - no setTimeout during render
  if (clearCourtStep === 3) {
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
  // Timer is handled by useEffect above - no setTimeout during render
  if (clearCourtStep === 4) {
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
