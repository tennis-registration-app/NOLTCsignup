/**
 * Shared Icon Components (emoji-based)
 *
 * Union of all per-app Icons.jsx exports with consistent API.
 * Each component accepts { size, className } props.
 *
 * Per-app shims re-export from here, overriding where emoji
 * or defaults diverge (e.g. courtboard Calendar = building emoji).
 */
import React from 'react';

// Calendar & Time
export const Calendar = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    📅
  </span>
);
export const Calendar2 = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    📅
  </span>
);
export const CalendarDays = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🗓️
  </span>
);
export const Clock = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⏰
  </span>
);

// Users & People
export const Users = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    👥
  </span>
);
export const GraduationCap = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🎓
  </span>
);
export const UserPlus = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    👤➕
  </span>
);

// UI Actions
export const Settings = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⚙️
  </span>
);
export const Copy = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    📋
  </span>
);
export const Trash2 = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🗑️
  </span>
);
export const Save = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    💾
  </span>
);
export const X = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ❌
  </span>
);
export const Plus = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ➕
  </span>
);
export const Edit = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ✏️
  </span>
);
export const Edit2 = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ✏️
  </span>
);
export const Edit3 = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ✏️
  </span>
);
export const Download = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⬇️
  </span>
);
export const RefreshCw = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔄
  </span>
);
export const Move = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔄
  </span>
);

// Alerts & Status
export const AlertCircle = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⚠️
  </span>
);
export const AlertTriangle = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⚠️
  </span>
);
export const CheckCircle = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ✅
  </span>
);
export const Check = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ✔️
  </span>
);
export const Bell = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔔
  </span>
);

// Navigation
export const ChevronLeft = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ◀️
  </span>
);
export const ChevronRight = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ▶️
  </span>
);
export const ChevronDown = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔽
  </span>
);
export const ChevronUp = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔼
  </span>
);

// Layout & View
export const Grid = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⊞
  </span>
);
export const Grid3X3 = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⊞
  </span>
);
export const List = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    📄
  </span>
);
export const Filter = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔍
  </span>
);
export const MoreHorizontal = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⋯
  </span>
);

// Charts & Data
export const BarChart = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    📊
  </span>
);
export const FileText = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    📄
  </span>
);
export const TrendingUp = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    📈
  </span>
);
export const Activity = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⚡
  </span>
);

// Media Controls
export const Play = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ▶️
  </span>
);
export const Pause = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⏸️
  </span>
);
export const Square = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⏹️
  </span>
);

// Visibility
export const Eye = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    👁️
  </span>
);
export const EyeOff = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    👁️
  </span>
);

// Tools & Maintenance
export const Wrench = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🔧
  </span>
);
export const Droplets = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    💧
  </span>
);

// Tennis-specific
export const TennisBall = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🎾
  </span>
);
export const Court = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🏟️
  </span>
);
export const Trophy = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🏆
  </span>
);
export const Star = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    ⭐
  </span>
);

// Misc
export const Bot = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    🤖
  </span>
);
export const MessageCircle = ({ size = 24, className = '' }) => (
  <span style={{ fontSize: `${size}px` }} className={className}>
    💬
  </span>
);

// Utility style for greyed-out icons
export const greyFilter = { filter: 'grayscale(100%) opacity(0.6)' };
