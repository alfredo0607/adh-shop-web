import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src/api/generated'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Every exported function states what it returns. Inference is fine inside
      // a function; at a module boundary it lets a change leak unnoticed.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Radix Primitives are wrapped once in shared/ui, so the look and the
      // behaviour of each control live in one place. See docs/guide/styling.md.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@radix-ui/*'],
              message: 'Use the component from @/shared/ui instead of Radix directly.',
            },
          ],
        },
      ],
    },
  },

  {
    // shared/ is the vocabulary every feature uses; it must not depend on any
    // feature or on the composition root. See docs/guide/architecture.md.
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/app/*'],
              message: 'shared/ must not depend on features or app.',
            },
            {
              group: ['@radix-ui/*'],
              message: 'Radix is wrapped in shared/ui only.',
            },
          ],
        },
      ],
    },
  },

  {
    // The one place Radix may be imported.
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/app/*'],
              message: 'shared/ must not depend on features or app.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.jest } },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },
);
