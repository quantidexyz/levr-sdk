import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

const basePlugins = {
  prettier: prettier,
  'simple-import-sort': simpleImportSort,
}

const baseRules = {
  'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'prettier/prettier': 'error',
}

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', 'contracts/**']),
  // JavaScript/Config files (no TypeScript parser)
  {
    files: ['**/*.{mjs,cjs,js}'],

    plugins: basePlugins,

    rules: baseRules,
  },
  // TypeScript files
  {
    files: ['**/*.{ts,tsx,jsx}'],

    plugins: {
      ...basePlugins,
      '@typescript-eslint': tseslint.plugin,
    },

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },

    rules: {
      ...baseRules,

      // TypeScript rules
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },
])
