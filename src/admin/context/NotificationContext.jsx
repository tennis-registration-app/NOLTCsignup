import React, { createContext, useContext } from 'react';
import { useNotification } from '../hooks/useNotification.js';

const NotificationContext = createContext(null);

/**
 * Provider that makes showNotification available to any admin component.
 * Renders the notification banner as a fixed overlay.
 */
export function NotificationProvider({ children }) {
  const { notification, showNotification } = useNotification();

  return (
    <NotificationContext.Provider value={showNotification}>
      {children}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access showNotification from any admin component.
 * @returns {Function} showNotification(message, type)
 */
export function useAdminNotification() {
  const showNotification = useContext(NotificationContext);
  if (!showNotification) {
    throw new Error('useAdminNotification must be used within NotificationProvider');
  }
  return showNotification;
}
