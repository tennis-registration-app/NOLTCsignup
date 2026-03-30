import React from 'react';

interface TypedIconProps {
  icon: React.ComponentType<{ className?: string; size?: number; [key: string]: unknown }>;
  className?: string;
  size?: number;
  [key: string]: unknown;
}

/**
 * TypedIcon - Wrapper for lucide-react icons with proper className typing
 */
export function TypedIcon({ icon: Icon, className, ...rest }: TypedIconProps) {
  return <Icon className={className} {...(rest as { size?: number })} />;
}
