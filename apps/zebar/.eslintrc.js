module.exports = {
  root: true, // This stops ESLint from looking for config files in parent directories
  // Common ESLint configurations
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Integrates Prettier rules into ESLint
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  rules: {
    // Keep 'no-unused-vars' as 'off' or 'warn' if you want unused-imports to manage it,
    // otherwise you'll get double warnings/errors.
    // The unused-imports plugin documentation often recommends turning off core ESLint's no-unused-vars.
    'no-unused-vars': 'off', // Turn off base rule
    'prettier/prettier': 'error', // Reports Prettier issues as ESLint errors
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended', // Ensure Prettier applies to TS as well
      ],
      // CORRECTED: List the plugin by its string name
      plugins: [
        'unused-imports', // <-- Just the string name of the plugin
      ],
      rules: {
        // IMPORTANT: Also turn off the TypeScript version of no-unused-vars
        // This ensures unused-imports plugin is the sole authority
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'warn', // Detect unused imports
        'unused-imports/no-unused-vars': [
          // Detect unused variables and fix them
          'warn',
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
          },
        ],
      },
    },
    {
      // Optional: Add a separate override for JavaScript files if you want unused-imports there too
      files: ['*.js', '*.jsx'],
      extends: ['plugin:prettier/recommended'],
      plugins: ['unused-imports'],
      rules: {
        'no-unused-vars': 'off', // Turn off base rule for JS
        'unused-imports/no-unused-imports': 'warn',
        'unused-imports/no-unused-vars': [
          'warn',
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
          },
        ],
      },
    },
  ],
};
