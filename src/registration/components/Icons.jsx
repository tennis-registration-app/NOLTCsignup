/**
 * Registration Icons — re-exports from shared lucide-react adapter
 * with local override for Check (uses CircleCheck to match original ✅).
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
