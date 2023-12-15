module.exports = {
  mocha: {
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
  skipFiles: [
    'contracts/mocks',
    'contracts/raffleold/contracts/PeopleOfCrypto.sol',
    'contracts/raffleold/contracts/Raffle.sol',
  ],
};
