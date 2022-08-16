const path = require('path');
const tsconfigPath = path.join(__dirname, './tsconfig.json');
module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:mocha/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2020,
  },
  plugins: ['mocha'],
  env: {
    commonjs: true,
    node: true,
    mocha: true,
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: [tsconfigPath],
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      plugins: ['mocha', '@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:mocha/recommended',
        'prettier',
        'prettier/@typescript-eslint',
      ],
      rules: {
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
      },
    },
  ],
};
