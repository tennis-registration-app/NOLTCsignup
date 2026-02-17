import React from 'react';

/**
 * Icon components for CourtBoard display
 * Simple emoji-based icons with size and className props
 */

export const Users = ({ size = 34, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    👥
  </span>
);

export const TennisBall = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🎾
  </span>
);

export const Calendar = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🏛️
  </span>
);

export const AlertCircle = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔔
  </span>
);
