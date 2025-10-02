// @ts-check

import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import prettier from 'eslint-plugin-prettier'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig({
  files: ['**/*.{mjs,cjs,js,ts}'],
  ignores: [
    'dist/**',
    'node_modules/**',
    '**/.*',
    '**/*.test.{mjs,cjs,js,ts}',
    '**/*.spec.{mjs,cjs,js,ts}',
    '**/*.config.{mjs,cjs,js,ts}',
  ],
  plugins: {
    '@typescript-eslint': tseslint.plugin,
    prettier,
    // @ts-expect-error - importX has outdated types
    'import-x': importX,
  },

  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: true,
    },
  },
  settings: {
    'import-x/resolver-next': [
      createTypeScriptImportResolver({
        alwaysTryTypes: true,
        project: './tsconfig.json',
        bun: true,
      }),
    ],
  },
  rules: {
    // ImportX rules
    ...importX.configs.recommended.rules,
    'import-x/no-unresolved': 'off',
    'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],

    // Prettier rules
    'prettier/prettier': 'error',

    // TypeScript rules
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
})
