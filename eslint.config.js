// @ts-check

/** @type {import('eslint').Linter.FlatConfig} */
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        Image: 'readonly',
        setTimeout: 'readonly',
        IntersectionObserver: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-unreachable': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
      'no-debugger': 'warn',
      'eqeqeq': 'warn',
      'curly': 'warn',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
      'comma-dangle': ['warn', 'always-multiline'],
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },
]; 