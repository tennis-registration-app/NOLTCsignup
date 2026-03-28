/**
 * AlertDisplay Component - Simple alert notification
 *
 * Displays a fixed-position red alert banner when show is true.
 * Used for error messages and important notifications.
 */
import React from 'react';

const AlertDisplay = ({ show, message }) => {
  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-8 bg-red-500 text-white p-4 sm:p-6 rounded-xl shadow-lg z-50 text-base sm:text-lg max-w-sm sm:max-w-none">
      {message}
    </div>
  );
};

export default AlertDisplay;
