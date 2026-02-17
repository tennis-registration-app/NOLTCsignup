/**
 * Courtboard Icons — lucide-react via shared adapter.
 *
 * TennisBall stays as emoji (no lucide equivalent).
 * Default sizes preserved from original courtboard values.
 */
import React from 'react';
import {
  Users as SharedUsers,
  Calendar as SharedCalendar,
  AlertCircle as SharedAlertCircle,
} from '../../shared/ui/icons/Icons.jsx';

export const Users = ({ size = 34, ...props }) => <SharedUsers size={size} {...props} />;

export const Calendar = ({ size = 24, ...props }) => <SharedCalendar size={size} {...props} />;

export const AlertCircle = ({ size = 24, ...props }) => (
  <SharedAlertCircle size={size} {...props} />
);

export const TennisBall = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px`, lineHeight: 1 }} className={className}>
    🎾
  </span>
);
