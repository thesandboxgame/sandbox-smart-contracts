module.exports = {
  mocha: {
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
  skipFiles: [
    '/mocks',
    '/AuthValidator.sol',
    'common/BaseWithStorage',
    'common/Libraries/SafeMathWithRequire.sol',
    'ReferralValidator/ReferralValidator.sol',
  ],
};
