import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', 'contracts/**']),
  {
    files: ['**/*.{mjs,cjs,js,ts,tsx,jsx}'],

    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettier,
      'simple-import-sort': simpleImportSort,
    },

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },

    rules: {
      // General rules
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // Prettier rules
      'prettier/prettier': 'error',

      // TypeScript rules
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
    },
  },
])
