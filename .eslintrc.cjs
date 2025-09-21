module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['dist/', 'build/', 'node_modules/', 'public/animation.gif'],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'warn',
    'no-console': ['warn', { allow: ['error', 'warn'] }],
  },
};