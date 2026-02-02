import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
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
      'no-console': 'off',
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
      'src/registration/backend/**/*.js',
      'src/admin/backend/**/*.js',
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
  prettier,
];
