/**
 * Courtboard Icons — re-exports shared adapter with local overrides.
 *
 * Divergences from shared defaults (preserved from original):
 *   Calendar    → Building2 icon (not calendar icon)
 *   AlertCircle → Bell icon (not alert-circle icon)
 *   Users       → default size 34 (not 20)
 */
import React from 'react';
import { Building2 as LuBuilding2, Bell as LuBell, Users as LuUsers } from 'lucide-react';
export { TennisBall } from '../../shared/ui/icons/Icons.jsx';

const STROKE = 1.75;

export const Users = ({ size = 34, className = '', ...props }) => (
  <LuUsers
    size={size}
    strokeWidth={STROKE}
    className={`inline-block align-middle ${className}`.trim()}
    aria-hidden
    {...props}
  />
);

export const Calendar = ({ size = 20, className = '', ...props }) => (
  <LuBuilding2
    size={size}
    strokeWidth={STROKE}
    className={`inline-block align-middle ${className}`.trim()}
    aria-hidden
    {...props}
  />
);

export const AlertCircle = ({ size = 20, className = '', ...props }) => (
  <LuBell
    size={size}
    strokeWidth={STROKE}
    className={`inline-block align-middle ${className}`.trim()}
    aria-hidden
    {...props}
  />
);
