/**
 * Admin Panel - Icon Components
 *
 * Emoji-based icon wrappers for consistent sizing and styling.
 * These replace Lucide icons with emoji equivalents for simplicity.
 */
import React from 'react';

// Calendar & Time
export const Calendar = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>📅</span>;
export const Calendar2 = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>📅</span>;
export const CalendarDays = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🗓️</span>;
export const Clock = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⏰</span>;

// Users & People
export const Users = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>👥</span>;
export const GraduationCap = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🎓</span>;

// UI Actions
export const Settings = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⚙️</span>;
export const Copy = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>📋</span>;
export const Trash2 = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🗑️</span>;
export const Save = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>💾</span>;
export const X = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>❌</span>;
export const Plus = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>➕</span>;
export const Edit = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>✏️</span>;
export const Edit2 = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>✏️</span>;
export const Edit3 = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>✏️</span>;
export const Download = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⬇️</span>;
export const RefreshCw = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🔄</span>;
export const Move = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🔄</span>;

// Alerts & Status
export const AlertCircle = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⚠️</span>;
export const AlertTriangle = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⚠️</span>;
export const CheckCircle = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>✅</span>;
export const Check = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>✔️</span>;

// Navigation
export const ChevronLeft = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>◀️</span>;
export const ChevronRight = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>▶️</span>;
export const ChevronDown = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🔽</span>;
export const ChevronUp = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🔼</span>;

// Layout & View
export const Grid = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⊞</span>;
export const Grid3X3 = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⊞</span>;
export const List = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>📄</span>;
export const Filter = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🔍</span>;
export const MoreHorizontal = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⋯</span>;

// Charts & Data
export const BarChart = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>📊</span>;
export const FileText = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>📄</span>;
export const TrendingUp = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>📈</span>;
export const Activity = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⚡</span>;

// Media Controls
export const Play = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>▶️</span>;
export const Pause = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⏸️</span>;
export const Square = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⏹️</span>;

// Visibility
export const Eye = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>👁️</span>;
export const EyeOff = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>👁️</span>;

// Tools & Maintenance
export const Wrench = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🔧</span>;
export const Droplets = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>💧</span>;

// Tennis-specific
export const TennisBall = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🎾</span>;
export const Court = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🏟️</span>;
export const Trophy = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🏆</span>;
export const Star = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>⭐</span>;

// Misc
export const Bot = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>🤖</span>;
export const MessageCircle = ({ size = 24 }) => <span style={{ fontSize: `${size}px` }}>💬</span>;

// Utility style for greyed-out icons
export const greyFilter = { filter: 'grayscale(100%) opacity(0.6)' };
