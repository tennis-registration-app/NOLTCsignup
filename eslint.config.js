import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  // TypeScript files — use TS parser, no React rules (pure logic files)
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'off', // Use TS-aware version instead
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off', // TypeScript handles this
      'no-redeclare': 'off', // TypeScript handles this (interfaces merge)
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React plugin recommended rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // ERRORS (must fix, blocks commits)
      'react-hooks/rules-of-hooks': 'error',
      'no-redeclare': 'error',

      // TODO: Upgrade to 'error' after cleaning up legacy admin code
      'no-undef': 'warn',

      // WARNINGS (track, burn down over time)
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'warn',
      'no-empty': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-case-declarations': 'warn',
      'no-unreachable': 'warn',
      'react/display-name': 'warn',
      'react/jsx-no-undef': 'warn',

      // Disabled: too noisy for existing codebase
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/error-boundaries': 'off',
      'react-hooks/effects': 'off',
      'react-hooks/use-effect-event': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',

      // WP4-4: camelCase enforcement (ratchet - start as warn)
      camelcase: [
        'warn',
        {
          properties: 'never', // Don't check object property names (API responses)
          ignoreDestructuring: true, // Allow destructuring snake_case from APIs
          ignoreImports: true, // Allow importing snake_case from external modules
        },
      ],
    },
  },
  // WP4-4: Boundary files exempt from camelcase rule (snake_case allowed)
  {
    files: [
      'src/lib/normalize/**/*.js',
      'src/lib/ApiAdapter.js',
      'src/lib/backend/**/*.js',
    ],
    rules: {
      camelcase: 'off',
    },
  },
  // Architecture boundary: UI components should use @lib/api, not raw ApiAdapter
  // Only applies to .jsx files (React components), not .js services
  {
    files: ['**/*.jsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ApiAdapter*'],
              message:
                'UI components should use @lib/api instead of ApiAdapter directly.',
            },
          ],
        },
      ],
    },
  },
  // WP5-C3: Ban raw localStorage in application layers
  {
    files: [
      'src/admin/**/*.{js,jsx,ts,tsx}',
      'src/registration/**/*.{js,jsx,ts,tsx}',
      'src/courtboard/**/*.{js,jsx,ts,tsx}',
      'src/mobile/**/*.{js,jsx,ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'Use src/platform/prefsStorage.js instead. Raw localStorage is banned in application layers. See docs/WP5-C_LOCALSTORAGE_INVENTORY.md',
        },
        {
          name: 'alert',
          message:
            'Use useAdminNotification() (admin) or showAlertMessage (registration) instead of alert().',
        },
        {
          name: 'confirm',
          message:
            'Use useAdminConfirm() (admin) or pass confirm via ctx (registration) instead of confirm().',
        },
        // Legacy global removed in shared-utils elimination.
        // Use src/lib/ instead.
        {
          name: 'APP_UTILS',
          message:
            'APP_UTILS global was removed. Import directly from src/lib/ instead.',
        },
        // Architecture boundary: use windowBridge accessors, not direct Tennis global
        {
          name: 'Tennis',
          message:
            'Use windowBridge accessors (getTennisUI, getTennisDomain, etc.) instead of direct Tennis global access.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message:
            'Use src/platform/prefsStorage.js instead. Raw localStorage is banned in application layers.',
        },
        {
          object: 'globalThis',
          property: 'localStorage',
          message:
            'Use src/platform/prefsStorage.js instead. Raw localStorage is banned in application layers.',
        },
        {
          object: 'self',
          property: 'localStorage',
          message:
            'Use src/platform/prefsStorage.js instead. Raw localStorage is banned in application layers.',
        },
        {
          object: 'window',
          property: 'alert',
          message:
            'Use useAdminNotification() (admin) or showAlertMessage (registration) instead of window.alert().',
        },
        {
          object: 'window',
          property: 'confirm',
          message:
            'Use useAdminConfirm() (admin) or pass confirm via ctx (registration) instead of window.confirm().',
        },
        // Legacy global removed in shared-utils elimination.
        // Use src/lib/ instead.
        {
          object: 'window',
          property: 'APP_UTILS',
          message:
            'APP_UTILS global was removed. Import directly from src/lib/ instead.',
        },
        // Architecture boundary: use windowBridge accessors, not window.Tennis
        {
          object: 'window',
          property: 'Tennis',
          message:
            'Use windowBridge accessors (getTennisUI, getTennisDomain, etc.) instead of window.Tennis.',
        },
      ],
    },
  },
  // Architecture boundary: screens must not import backend or orchestration directly
  {
    files: ['src/registration/screens/**/*.{js,jsx}', 'src/admin/screens/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/orchestration/**', '**/orchestrators/**'],
              message:
                'Screens must not import orchestrators — use handlers instead.',
            },
            {
              group: ['**/backend/**', '**/lib/backend/**', '**/lib/ApiAdapter*'],
              message:
                'Screens must not import backend directly — use handlers/presenters.',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundary: presenters must not import backend or React
  {
    files: ['src/registration/presenters/**/*.{js,ts}', 'src/registration/router/presenters/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/backend/**', '**/lib/backend/**', '**/lib/ApiAdapter*'],
              message:
                'Presenters must not import backend — they receive data via app/handlers params.',
            },
            {
              group: ['react', 'react-dom', 'react-dom/*'],
              message:
                'Presenters must be pure functions — no React imports. They transform AppState into screen props.',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundary: admin and courtboard must not import from registration
  {
    files: ['src/admin/**/*.{js,jsx}', 'src/courtboard/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/registration/**'],
              message:
                'Admin/Courtboard must not import from registration. Use src/lib/ for shared code.',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundary: orchestrators must be pure functions — no React
  {
    files: ['src/registration/orchestration/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-dom/*'],
              message:
                'Orchestrators must be pure functions — no React imports. Use dependency injection for UI concerns.',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundary: handlers must not import UI components
  {
    files: ['src/registration/appHandlers/**/*.{js,ts}', 'src/registration/handlers/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/screens/**', '**/components/**', '**/*.jsx'],
              message:
                'Handlers must not import UI components — they orchestrate state, not rendering.',
            },
          ],
        },
      ],
    },
  },
  // Architecture boundary: no window global assignments outside platform layer
  {
    files: ['src/registration/**/*.{js,jsx,ts}', 'src/admin/**/*.{js,jsx,ts}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AssignmentExpression[left.object.name="window"]',
          message:
            'Do not assign to window globals outside src/platform/. Use the platform bridge layer.',
        },
      ],
    },
  },
  // Exempt bootstrap/entry files and legacy interop from global/property restrictions.
  // These files legitimately check window.Tennis readiness or bridge IIFE globals.
  // New application code should use windowBridge accessors instead.
  {
    files: [
      // Entry points — check window.Tennis readiness before rendering
      'src/registration/main.jsx',
      'src/admin/main.jsx',
      // Legacy interop — use window.Tennis directly (migrate to windowBridge over time)
      'src/registration/utils/helpers.js',
      'src/admin/handlers/courtOperations.js',
      'src/admin/ai/AIAssistantAdmin.jsx',
      // Singleton guard uses window[key] assignment pattern
      'src/admin/hooks/useAdminSettings.js',
      // Courtboard — IIFE-bridged plain scripts, direct window access required
      'src/courtboard/**/*.{js,jsx}',
    ],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  // Exempt test files - MUST come AFTER the ban above
  {
    files: [
      'src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      'src/**/*.test.{js,jsx,ts,tsx}',
      'src/**/*.spec.{js,jsx,ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  prettier,
];
