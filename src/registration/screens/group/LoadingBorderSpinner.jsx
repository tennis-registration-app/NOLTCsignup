// @ts-check
import React from 'react';

/**
 * LoadingBorderSpinner - Animated dashed border spinner for loading states
 * @param {Object} props
 * @param {string} props.animationId - Unique ID for the keyframe animation (e.g., 'select', 'waitlist')
 */
const LoadingBorderSpinner = ({ animationId }) => (
  <svg
    className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <style>
      {`
        @keyframes dash-move-${animationId} {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 140; }
        }
      `}
    </style>
    <rect
      x="1"
      y="1"
      width="98"
      height="98"
      rx="12"
      ry="12"
      fill="none"
      stroke="white"
      strokeOpacity="0.8"
      strokeWidth="2"
      strokeDasharray="60 80"
      style={{ animation: `dash-move-${animationId} 1s linear infinite` }}
    />
  </svg>
);

export default LoadingBorderSpinner;
