/**
 * Registration Icons — re-exports shared adapter with local overrides.
 *
 * Divergences from shared defaults (preserved from original):
 *   Check → ✅ (checkmark circle, not bare checkmark ✔️)
 */
import React from 'react';
export { Users, Bell, Clock, UserPlus, ChevronRight } from '../../shared/ui/icons/Icons.jsx';

export const Check = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ✅
  </span>
);
