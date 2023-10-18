module.exports = {
  singleQuote: true,
  bracketSpacing: false,
  plugins: ['prettier-plugin-solidity'],
  overrides: [
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
      },
    },
    {
      files: '*.sol',
      options: {
        printWidth: 120,
        tabWidth: 4,
        singleQuote: false,
      },
    },
  ],
};
