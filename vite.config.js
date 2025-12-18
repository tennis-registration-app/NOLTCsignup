import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      // Support JSX in .js files and inline <script type="text/babel"> blocks
      include: /\.(jsx?|tsx?)$/,
    }),
  ],

  // Base path for GitHub Pages deployment (repo name)
  base: '/NOLTCsignup/',

  // Root directory for resolving entry points
  root: '.',

  // Public directory for static assets (served as-is)
  publicDir: 'public',

  // Build configuration
  build: {
    outDir: 'dist',
    emptyDirBeforeWrite: true,
    // minify: default (esbuild) - TDZ issues fixed by moving state declarations

    // Multi-page application setup
    rollupOptions: {
      input: {
        // Main Vite-bundled React apps
        registration: resolve(__dirname, 'src/registration/index.html'),
        courtboard: resolve(__dirname, 'src/courtboard/index.html'),
        admin: resolve(__dirname, 'src/admin/index.html'),
        // Mobile shell (iframes to Vite apps)
        mobile: resolve(__dirname, 'Mobile.html'),
        // Test page
        'test-react': resolve(__dirname, 'src/test-react/index.html'),
        // Homepage
        index: resolve(__dirname, 'index.html'),
      },
      output: {
        // Preserve the directory structure for shared modules
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  // Development server configuration
  server: {
    port: 5173,
    open: '/src/registration/index.html', // Open Registration page by default
    // Enable CORS for local development
    cors: true,
  },

  // Preview server configuration (for testing production builds)
  preview: {
    port: 4173,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@shared': resolve(__dirname, './shared'),
      '@domain': resolve(__dirname, './domain'),
      '@lib': resolve(__dirname, './src/lib'),
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
