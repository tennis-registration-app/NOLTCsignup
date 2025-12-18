/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // HTML entry points
    './*.html',
    // Shared modules (in case they contain template strings with classes)
    './shared/**/*.js',
    './domain/**/*.js',
    // Any future JSX/TSX files
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // Add any custom theme extensions here
      // These can match your existing design system
      colors: {
        // Tennis court colors (examples - adjust to match your design)
        court: {
          available: '#10b981', // green-500
          occupied: '#ef4444',  // red-500
          blocked: '#6b7280',   // gray-500
          overtime: '#f59e0b',  // amber-500
        },
      },
      // Custom animations if needed
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
