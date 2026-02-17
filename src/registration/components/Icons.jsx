/**
 * Registration Icons — re-exports shared adapter with local overrides.
 *
 * Divergences from shared defaults (preserved from original):
 *   Check → CircleCheck (encircled checkmark, not bare checkmark)
 */
import React from 'react';
import { CircleCheck as LuCircleCheck } from 'lucide-react';
export { Users, Bell, Clock, UserPlus, ChevronRight } from '../../shared/ui/icons/Icons.jsx';

const STROKE = 1.75;

export const Check = ({ size = 20, className = '', ...props }) => (
  <LuCircleCheck
    size={size}
    strokeWidth={STROKE}
    className={`inline-block align-middle ${className}`.trim()}
    aria-hidden
    {...props}
  />
);
