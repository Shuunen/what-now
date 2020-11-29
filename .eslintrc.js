const rules = require('./.eslintrc.rules.js')

module.exports = {
  env: {
    'cypress/globals': true,
  },
  extends: [
    'plugin:cypress/recommended',
    'eslint:recommended',
    'standard',
    'plugin:unicorn/recommended',
  ],
  rules,
  plugins: [
    'cypress',
    'html',
    'unicorn',
  ],
}
