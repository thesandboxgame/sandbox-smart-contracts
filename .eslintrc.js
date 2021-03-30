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
    },
  ],
};
