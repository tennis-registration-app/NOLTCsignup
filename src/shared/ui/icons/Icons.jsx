/**
 * Shared Icon Components — lucide-react based.
 *
 * Replaces emoji-based icons with lucide-react SVGs.
 * All export names are preserved so no consumer imports change.
 * Per-app shims re-export from here, overriding where needed.
 */
import React from 'react';
import {
  Calendar as LuCalendar,
  CalendarDays as LuCalendarDays,
  Clock as LuClock,
  Users as LuUsers,
  GraduationCap as LuGraduationCap,
  UserPlus as LuUserPlus,
  Settings as LuSettings,
  Copy as LuCopy,
  Trash2 as LuTrash2,
  Save as LuSave,
  X as LuX,
  Plus as LuPlus,
  Pencil as LuPencil,
  PencilLine as LuPencilLine,
  Download as LuDownload,
  RefreshCw as LuRefreshCw,
  Move as LuMove,
  AlertCircle as LuAlertCircle,
  AlertTriangle as LuAlertTriangle,
  CircleCheck as LuCircleCheck,
  Check as LuCheck,
  Bell as LuBell,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
  ChevronDown as LuChevronDown,
  ChevronUp as LuChevronUp,
  Grid as LuGrid,
  Grid3x3 as LuGrid3x3,
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
  Building2 as LuBuilding2,
} from 'lucide-react';

const DEFAULT_SIZE = 20;
const DEFAULT_STROKE = 1.75;

/**
 * Wrap a lucide-react icon to match the existing { size, className } API.
 */
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
export const Edit = wrap(LuPencil);
export const Edit2 = wrap(LuPencilLine);
export const Edit3 = wrap(LuPencil);
export const Download = wrap(LuDownload);
export const RefreshCw = wrap(LuRefreshCw);
export const Move = wrap(LuMove);

// Alerts & Status
export const AlertCircle = wrap(LuAlertCircle);
export const AlertTriangle = wrap(LuAlertTriangle);
export const CheckCircle = wrap(LuCircleCheck);
export const Check = wrap(LuCheck);
export const Bell = wrap(LuBell);

// Navigation
export const ChevronLeft = wrap(LuChevronLeft);
export const ChevronRight = wrap(LuChevronRight);
export const ChevronDown = wrap(LuChevronDown);
export const ChevronUp = wrap(LuChevronUp);

// Layout & View
export const Grid = wrap(LuGrid);
export const Grid3X3 = wrap(LuGrid3x3);
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

// Tennis-specific (no lucide equivalents — keep as emoji)
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

// Awards
export const Trophy = wrap(LuTrophy);
export const Star = wrap(LuStar);

// Misc
export const Bot = wrap(LuBot);
export const MessageCircle = wrap(LuMessageCircle);

// Building (used by courtboard Calendar override)
export const Building2 = wrap(LuBuilding2);

// Utility style for greyed-out icons
export const greyFilter = { filter: 'grayscale(100%) opacity(0.6)' };
