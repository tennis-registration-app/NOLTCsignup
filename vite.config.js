import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Custom plugin to copy plain JS files that are loaded via <script src> tags
function copyPlainJsFiles() {
  return {
    name: 'copy-plain-js-files',
    writeBundle() {
      const filesToCopy = [
        // Courtboard plain JS files
        'src/courtboard/bootstrap/courtboardPreInit.js',
        'src/courtboard/mobile-fallback-bar.js',
        'src/courtboard/mobile-bridge.js',
        'src/courtboard/sync-promotions.js',
        'src/courtboard/debug-panel.js',
        // Registration plain JS files
        'src/registration/nav-diagnostics.js',
        // Shared lib plain JS files
        'src/lib/browser-bridge.js',
      ];

      filesToCopy.forEach((file) => {
        const src = resolve(__dirname, file);
        const dest = resolve(__dirname, 'dist', file);
        const destDir = resolve(__dirname, 'dist', file.substring(0, file.lastIndexOf('/')));

        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`Copied ${file} to dist/`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      // Support JSX in .js files and inline <script type="text/babel"> blocks
      include: /\.(jsx?|tsx?)$/,
    }),
    copyPlainJsFiles(),
  ],

  // Base path for deployment (root for Vercel, was /NOLTCsignup/ for GitHub Pages)
  base: '/',

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
        // Test pages
        'test-react': resolve(__dirname, 'src/test-react/index.html'),
        'test-api': resolve(__dirname, 'src/test-api/index.html'),
        'test-react-api': resolve(__dirname, 'src/test-react-api/index.html'),
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
