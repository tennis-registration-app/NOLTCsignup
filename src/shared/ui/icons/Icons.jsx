/**
 * Shared Icon Adapter — lucide-react SVG icons for Admin + Registration.
 *
 * COURTBOARD IS EXCLUDED. Courtboard uses emoji-based icons in
 * src/courtboard/components/Icons.jsx and must never import from here.
 * See docs/architecture.md "Courtboard Icon Contract".
 *
 * All exports preserve the { size, className } API so consumer
 * imports remain unchanged.
 */
import React from 'react';
import {
  Calendar as LuCalendar,
  CalendarDays as LuCalendarDays,
  Clock as LuClock,
  Users as LuUsers,
  GraduationCap as LuGraduationCap,
  Settings as LuSettings,
  Copy as LuCopy,
  Trash2 as LuTrash2,
  Save as LuSave,
  X as LuX,
  Plus as LuPlus,
  Edit as LuEdit,
  Edit2 as LuEdit2,
  Edit3 as LuEdit3,
  Download as LuDownload,
  RefreshCw as LuRefreshCw,
  Move as LuMove,
  AlertCircle as LuAlertCircle,
  AlertTriangle as LuAlertTriangle,
  CheckCircle as LuCheckCircle,
  Check as LuCheck,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
  ChevronDown as LuChevronDown,
  ChevronUp as LuChevronUp,
  Grid3X3 as LuGrid3X3,
  List as LuList,
  Filter as LuFilter,
  MoreHorizontal as LuMoreHorizontal,
  BarChart as LuBarChart,
  FileText as LuFileText,
  TrendingUp as LuTrendingUp,
  Activity as LuActivity,
  Play as LuPlay,
  Pause as LuPause,
  Square as LuSquare,
  Eye as LuEye,
  EyeOff as LuEyeOff,
  Wrench as LuWrench,
  Droplets as LuDroplets,
  Trophy as LuTrophy,
  Star as LuStar,
  Bot as LuBot,
  MessageCircle as LuMessageCircle,
  Bell as LuBell,
  UserPlus as LuUserPlus,
} from 'lucide-react';

const DEFAULT_SIZE = 20;
const DEFAULT_STROKE = 1.75;

function wrap(LucideIcon) {
  const Wrapped = ({ size = DEFAULT_SIZE, className = '', ...props }) => (
    <LucideIcon
      size={size}
      strokeWidth={DEFAULT_STROKE}
      className={`inline-block align-middle ${className}`.trim()}
      aria-hidden
      {...props}
    />
  );
  return Wrapped;
}

// Calendar & Time
export const Calendar = wrap(LuCalendar);
export const Calendar2 = wrap(LuCalendar);
export const CalendarDays = wrap(LuCalendarDays);
export const Clock = wrap(LuClock);

// Users & People
export const Users = wrap(LuUsers);
export const GraduationCap = wrap(LuGraduationCap);
export const UserPlus = wrap(LuUserPlus);

// UI Actions
export const Settings = wrap(LuSettings);
export const Copy = wrap(LuCopy);
export const Trash2 = wrap(LuTrash2);
export const Save = wrap(LuSave);
export const X = wrap(LuX);
export const Plus = wrap(LuPlus);
export const Edit = wrap(LuEdit);
export const Edit2 = wrap(LuEdit2);
export const Edit3 = wrap(LuEdit3);
export const Download = wrap(LuDownload);
export const RefreshCw = wrap(LuRefreshCw);
export const Move = wrap(LuMove);

// Alerts & Status
export const AlertCircle = wrap(LuAlertCircle);
export const AlertTriangle = wrap(LuAlertTriangle);
export const CheckCircle = wrap(LuCheckCircle);
export const Check = wrap(LuCheck);
export const Bell = wrap(LuBell);

// Navigation
export const ChevronLeft = wrap(LuChevronLeft);
export const ChevronRight = wrap(LuChevronRight);
export const ChevronDown = wrap(LuChevronDown);
export const ChevronUp = wrap(LuChevronUp);

// Layout & View
export const Grid = wrap(LuGrid3X3);
export const Grid3X3 = wrap(LuGrid3X3);
export const List = wrap(LuList);
export const Filter = wrap(LuFilter);
export const MoreHorizontal = wrap(LuMoreHorizontal);

// Charts & Data
export const BarChart = wrap(LuBarChart);
export const FileText = wrap(LuFileText);
export const TrendingUp = wrap(LuTrendingUp);
export const Activity = wrap(LuActivity);

// Media Controls
export const Play = wrap(LuPlay);
export const Pause = wrap(LuPause);
export const Square = wrap(LuSquare);

// Visibility
export const Eye = wrap(LuEye);
export const EyeOff = wrap(LuEyeOff);

// Tools & Maintenance
export const Wrench = wrap(LuWrench);
export const Droplets = wrap(LuDroplets);

// Tennis-specific (no lucide equivalents — stay as emoji)
export const TennisBall = ({ size = 20, className = '' }) => (
  <span style={{ fontSize: `${size}px`, lineHeight: 1 }} className={className}>
    🎾
  </span>
);
export const Court = ({ size = 20, className = '' }) => (
  <span style={{ fontSize: `${size}px`, lineHeight: 1 }} className={className}>
    🏟️
  </span>
);

// Awards & Misc
export const Trophy = wrap(LuTrophy);
export const Star = wrap(LuStar);
export const Bot = wrap(LuBot);
export const MessageCircle = wrap(LuMessageCircle);

// Utility style for greyed-out icons
export const greyFilter = { filter: 'grayscale(100%) opacity(0.6)' };
