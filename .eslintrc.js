module.exports = {
  env: {
    'cypress/globals': true,
  },
  extends: [
    'plugin:cypress/recommended',
    'eslint:recommended',
    'standard',
  ],
  rules: {
    'no-console': 'off',
    'func-names': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
  plugins: [
    'cypress',
    'html',
  ],
}
