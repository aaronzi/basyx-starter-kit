import eslintConfigPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import pluginPromise from 'eslint-plugin-promise';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  {
    // Add additional plugins
    plugins: {
      'simple-import-sort': simpleImportSort,
      prettier,
      promise: pluginPromise,
    },

    rules: {
      // Import sorting rules
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            [
              '^\\u0000', // all side effects (0 at start)
              '^[^/\\.].*\u0000$', // external types (0 at end)
              '^\\..*\u0000$', // internal types (0 at end)
              '^@?\\w', // Starts with @
              '^[^.]', // any
              '^\\.', // local
            ],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // Prettier formatting rules
      'prettier/prettier': 'error',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],

      // Console rules (environment-aware)
      'no-console': [
        process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        { allow: ['warn', 'error'] },
      ],

      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': ['error', { ignorePattern: '^_' }],
      'vue/max-attributes-per-line': ['error', { singleline: 5 }],
      'vue/no-console': [
        process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        { allow: ['warn', 'error'] },
      ],

      // Promise rules
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',

      // General code quality rules
      'eol-last': ['error', 'always'], // Enforce newline at end of file
      'no-trailing-spaces': 'error', // No trailing whitespace
      'max-len': ['error', { code: 100, ignoreUrls: true, ignoreStrings: true }], // Line width limit
      indent: 'off', // Let prettier handle indentation
      quotes: ['error', 'single', { avoidEscape: true }], // Enforce single quotes
      semi: ['error', 'always'], // Enforce semicolons
    },
  },
  // Include prettier config to disable conflicting rules as separate config object
  eslintConfigPrettier
);
