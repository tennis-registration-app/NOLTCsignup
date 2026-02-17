import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

/**
 * Provider that exposes an async confirm(message) function to any admin component.
 * Renders a modal dialog overlay when confirmation is requested.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { message, resolve }
  const resolveRef = useRef(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message });
    });
  }, []);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setState(null);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <p className="text-gray-800 whitespace-pre-line">{state.message}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Hook to access the async confirm function from any admin component.
 * @returns {Function} confirm(message) - resolves to true/false
 */
export function useAdminConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useAdminConfirm must be used within ConfirmProvider');
  }
  return confirm;
}
