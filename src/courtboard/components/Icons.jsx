/**
 * Courtboard Icons — re-exports shared adapter with local overrides.
 *
 * Divergences from shared defaults (preserved from original):
 *   Calendar  → 🏛️  (building, not calendar emoji)
 *   AlertCircle → 🔔  (bell, not warning emoji)
 *   Users     → default size 34 (not 24)
 */
import React from 'react';
export { TennisBall } from '../../shared/ui/icons/Icons.jsx';

export const Users = ({ size = 34, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    👥
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
