/** @type {import("prettier").Config} */

export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'always',
  printWidth: 100,
  plugins: ['prettier-plugin-sh'],

  // ---------------------------
  // Override Rules
  overrides: [
    {
      files: ['.env*'],
      options: {
        parser: 'sh',
      },
    },
  ],
}
