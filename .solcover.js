module.exports = {
  mocha: {
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
  skipFiles: ['solc_0.5', 'solc_0.6', 'solc_0.7'],
};
