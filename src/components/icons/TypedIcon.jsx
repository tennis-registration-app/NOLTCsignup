import React from 'react';

/**
 * TypedIcon - Wrapper for lucide-react icons with proper className typing
 *
 * WP6.6: Fixes className prop type issue with lucide-react icons.
 * lucide-react icons don't expose className in their TypeScript definitions,
 * but the underlying SVG component does accept it. This wrapper provides
 * proper JSDoc typing for TypeScript checking.
 *
 * @param {{ icon: React.ComponentType<any>, className?: string, size?: number, [key: string]: any }} props
 */
export function TypedIcon({ icon: Icon, className, ...rest }) {
  return <Icon className={className} {...rest} />;
}
