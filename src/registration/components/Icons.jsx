/**
 * Icon Components - Emoji-based icons for the Registration UI
 *
 * These are simple wrapper components that render emoji icons
 * with configurable size. Matches the AdminPanelV2 pattern.
 */
import React from 'react';

export const Users = ({ size = 24 }) => (
  <span style={{ fontSize: `${size}px` }}>👥</span>
);

export const Bell = ({ size = 24 }) => (
  <span style={{ fontSize: `${size}px` }}>🔔</span>
);

export const Clock = ({ size = 24 }) => (
  <span style={{ fontSize: `${size}px` }}>⏰</span>
);

export const UserPlus = ({ size = 24 }) => (
  <span style={{ fontSize: `${size}px` }}>👤➕</span>
);

export const ChevronRight = ({ size = 24 }) => (
  <span style={{ fontSize: `${size}px` }}>▶️</span>
);

export const Check = ({ size = 24 }) => (
  <span style={{ fontSize: `${size}px` }}>✅</span>
);
